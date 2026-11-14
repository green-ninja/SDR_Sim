import { computePowerSpectrumDb, designLowPassFir } from './fft';
import {
  computeAliasedFrequency,
  computeCarsonBandwidthHz,
  computeFreeSpacePathLossDb,
  computeQuantizationSnrDb,
  computeTheoreticalBer,
  computeThermalNoiseFloorDbm,
} from './physics';
import { SIGNAL_PRESETS } from './presets';
import type {
  DemodulatorMode,
  DspMetrics,
  RfEmitter,
  SdrConfig,
  SignalPreset,
  SimulationFrame,
} from './types';

function hexToBits(hexStr: string): number[] {
  const clean = hexStr.replace(/\s+/g, '');
  const bits: number[] = [];
  // Add 8-bit preamble 10101010
  bits.push(1, 0, 1, 0, 1, 0, 1, 0);
  for (let i = 0; i < clean.length; i += 2) {
    const byteVal = parseInt(clean.slice(i, i + 2), 16);
    if (!Number.isNaN(byteVal)) {
      for (let b = 7; b >= 0; b--) {
        bits.push((byteVal >> b) & 1);
      }
    }
  }
  return bits;
}

/**
 * Deterministic fast PRNG (Mulberry32) so simulations and unit tests are reproducible.
 */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianPair(rng: () => number): [number, number] {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)];
}

export function getPresetById(presetId: string): SignalPreset {
  return SIGNAL_PRESETS.find((p) => p.id === presetId) ?? SIGNAL_PRESETS[0];
}

function resolveEffectiveDemod(
  requested: DemodulatorMode,
  activeEmitter: RfEmitter | null
): Exclude<DemodulatorMode, 'AUTO'> {
  if (requested !== 'AUTO') return requested;
  if (!activeEmitter) return 'FM';
  switch (activeEmitter.modulation) {
    case 'AM':
    case 'CW':
      return 'AM';
    case 'WBFM':
    case 'NBFM':
      return 'FM';
    case 'OOK':
      return 'OOK';
    case 'FSK':
    case 'LORA_CSS':
      return 'FSK';
    case 'BPSK':
    case 'QPSK':
      return 'PSK';
    case 'QAM16':
      return 'QAM16';
  }
}

/**
 * Synthesizes a single real-time complex I/Q frame through the full SDR receiver chain.
 */
export function runSdrSimulationFrame(
  config: SdrConfig,
  sampleTimeSec: number,
  frameSeed = 1337
): SimulationFrame {
  const preset = getPresetById(config.presetId);
  const numSamples = Math.max(1024, config.fftSize);
  const fs = Math.max(50_000, config.sampleRateHz);
  const dt = 1 / fs;
  const nyquist = fs / 2;

  const rawI = new Float32Array(numSamples);
  const rawQ = new Float32Array(numSamples);
  const rng = createRng(frameSeed);

  // Reference gain mapping: 0 dB gain = unity around -20 dBm received
  const gainLinear = Math.pow(10, (config.rfGainDb - 26) / 20);

  // Identify primary in-band emitter closest to centerFreqHz
  let activeEmitter: RfEmitter | null = null;
  let closestDistHz = Infinity;
  const aliasedEmitters: DspMetrics['aliasedEmitters'] = [];

  for (const emitter of preset.emitters) {
    const offsetHz = emitter.freqHz - config.centerFreqHz;
    if (Math.abs(offsetHz) < closestDistHz && Math.abs(offsetHz) <= nyquist) {
      closestDistHz = Math.abs(offsetHz);
      activeEmitter = emitter;
    }

    const aliasInfo = computeAliasedFrequency(offsetHz, fs);
    if (aliasInfo.isAliased && !config.antiAliasingFilter) {
      aliasedEmitters.push({
        label: emitter.label,
        trueFreqHz: emitter.freqHz,
        aliasedBasebandHz: aliasInfo.aliasedHz,
        foldOrder: aliasInfo.foldOrder,
      });
    }
  }

  // Synthesize each emitter in continuous RF time sampled at Fs
  for (const emitter of preset.emitters) {
    const offsetHz = emitter.freqHz - config.centerFreqHz;
    const isOutOfBand = Math.abs(offsetHz) > nyquist;
    const fspl = computeFreeSpacePathLossDb(emitter.distanceMeters, emitter.freqHz);
    const rxPowerDbm = emitter.txPowerDbm - fspl;

    // Anti-aliasing analog filter attenuates out-of-band emitters by ~55 dB
    const aaAttenuation = isOutOfBand && config.antiAliasingFilter ? 0.0018 : 1.0;
    // Scale received power cleanly into normalized baseband amplitude (-45 dBm nominal)
    const amp =
      Math.min(1.2, Math.pow(10, (rxPowerDbm + 45) / 40) * 0.22) *
      gainLinear *
      aaAttenuation;

    if (amp < 1e-5) continue;

    const bits = emitter.messageHex ? hexToBits(emitter.messageHex) : [1, 0, 1, 1, 0, 1, 0, 0];
    const symbolRate = emitter.symbolRateHz ?? 4800;
    const modFreq = emitter.modFreqHz ?? 1000;
    const fmDev = emitter.fmDeviationHz ?? 35_000;

    let fmPhase = 0;

    for (let n = 0; n < numSamples; n++) {
      const t = sampleTimeSec + n * dt;
      const carrierPhase = 2 * Math.PI * offsetHz * t;
      let bbI = 1.0;
      let bbQ = 0.0;

      const symIdx = Math.floor(t * symbolRate);

      switch (emitter.modulation) {
        case 'CW': {
          bbI = 1.0;
          bbQ = 0.0;
          break;
        }
        case 'AM': {
          const env = 0.65 + 0.35 * Math.sin(2 * Math.PI * modFreq * t);
          bbI = env;
          bbQ = 0.0;
          break;
        }
        case 'WBFM':
        case 'NBFM': {
          const msg =
            0.7 * Math.sin(2 * Math.PI * modFreq * t) +
            0.3 * Math.sin(2 * Math.PI * (modFreq * 1.5) * t);
          fmPhase += 2 * Math.PI * fmDev * msg * dt;
          bbI = Math.cos(fmPhase);
          bbQ = Math.sin(fmPhase);
          break;
        }
        case 'OOK': {
          const bit = bits[symIdx % bits.length];
          // Smooth raised-cosine edge to avoid unrealistic infinite spectrum
          const frac = (t * symbolRate) % 1;
          const shape = bit === 1 ? (frac < 0.1 ? frac / 0.1 : frac > 0.9 ? (1 - frac) / 0.1 : 1) : 0.03;
          bbI = shape;
          bbQ = 0;
          break;
        }
        case 'FSK': {
          const bit = bits[symIdx % bits.length];
          const instFreq = bit === 1 ? fmDev : -fmDev;
          fmPhase += 2 * Math.PI * instFreq * dt;
          bbI = Math.cos(fmPhase);
          bbQ = Math.sin(fmPhase);
          break;
        }
        case 'BPSK': {
          const bit = bits[symIdx % bits.length];
          bbI = bit === 1 ? 1.0 : -1.0;
          bbQ = 0.0;
          break;
        }
        case 'QPSK': {
          const b0 = bits[(symIdx * 2) % bits.length];
          const b1 = bits[(symIdx * 2 + 1) % bits.length];
          const scale = 0.7071;
          bbI = (b0 === 1 ? 1 : -1) * scale;
          bbQ = (b1 === 1 ? 1 : -1) * scale;
          break;
        }
        case 'QAM16': {
          const b0 = bits[(symIdx * 4) % bits.length];
          const b1 = bits[(symIdx * 4 + 1) % bits.length];
          const b2 = bits[(symIdx * 4 + 2) % bits.length];
          const b3 = bits[(symIdx * 4 + 3) % bits.length];
          const iLevel = (b0 ? 1 : -1) * (b1 ? 3 : 1);
          const qLevel = (b2 ? 1 : -1) * (b3 ? 3 : 1);
          bbI = iLevel / 3.2;
          bbQ = qLevel / 3.2;
          break;
        }
        case 'LORA_CSS': {
          const chirpPeriod = 1 / Math.max(400, symbolRate / 2);
          const symPhase = (t % chirpPeriod) / chirpPeriod;
          const bw = emitter.bandwidthHz;
          const shift = ((bits[symIdx % bits.length] + (symIdx % 4)) % 4) * 0.25;
          const normT = (symPhase + shift) % 1;
          const instFreq = -bw / 2 + bw * normT;
          fmPhase += 2 * Math.PI * instFreq * dt;
          bbI = Math.cos(fmPhase);
          bbQ = Math.sin(fmPhase);
          break;
        }
      }

      const cosC = Math.cos(carrierPhase);
      const sinC = Math.sin(carrierPhase);
      rawI[n] += amp * (bbI * cosC - bbQ * sinC);
      rawQ[n] += amp * (bbI * sinC + bbQ * cosC);
    }
  }

  // Inject cybersecurity jammer / spoof if active
  if (config.jammerMode !== 'none') {
    const jammerAmp = Math.pow(10, (config.jammerPowerDbm + 25) / 30) * 0.20 * gainLinear;
    const jOffset = config.jammerOffsetHz;

    if (config.jammerMode === 'cw_tone') {
      for (let n = 0; n < numSamples; n++) {
        const t = sampleTimeSec + n * dt;
        const p = 2 * Math.PI * jOffset * t;
        rawI[n] += jammerAmp * Math.cos(p);
        rawQ[n] += jammerAmp * Math.sin(p);
      }
    } else if (config.jammerMode === 'barrage_noise') {
      for (let n = 0; n < numSamples; n++) {
        const [g1, g2] = gaussianPair(rng);
        rawI[n] += jammerAmp * 0.55 * g1;
        rawQ[n] += jammerAmp * 0.55 * g2;
      }
    } else if (config.jammerMode === 'replay_spoof') {
      const spoofBits = hexToBits('DE AD BE EF');
      const spoofRate = activeEmitter?.symbolRateHz ?? 6000;
      for (let n = 0; n < numSamples; n++) {
        const t = sampleTimeSec + n * dt;
        const bit = spoofBits[Math.floor(t * spoofRate) % spoofBits.length];
        const p = 2 * Math.PI * (jOffset * 0.15) * t;
        if (bit === 1) {
          rawI[n] += jammerAmp * 0.9 * Math.cos(p);
          rawQ[n] += jammerAmp * 0.9 * Math.sin(p);
        }
      }
    }
  }

  // Add AWGN thermal + channel noise based on SNR slider
  const targetSignalAmp = 0.22 * gainLinear;
  const noiseSigma = targetSignalAmp / Math.pow(10, config.snrDb / 20);
  for (let n = 0; n < numSamples; n++) {
    const [g1, g2] = gaussianPair(rng);
    rawI[n] += noiseSigma * g1;
    rawQ[n] += noiseSigma * g2;
  }

  // Stage 2 & 3: Quadrature I/Q Imbalance, DC Offset, LNA nonlinearity, and ADC Quantization + Clipping
  const adcI = new Float32Array(numSamples);
  const adcQ = new Float32Array(numSamples);
  const eps = config.iqGainImbalance;
  const phiRad = (config.iqPhaseErrorDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phiRad);
  const sinPhi = Math.sin(phiRad);
  const quantLevels = Math.pow(2, Math.max(2, Math.min(16, config.adcBits)) - 1);

  let clippedCount = 0;
  for (let n = 0; n < numSamples; n++) {
    const iIn = rawI[n];
    const qIn = rawQ[n];

    // I/Q imbalance & DC offset
    let iVal = (1 + eps) * iIn + config.dcOffset;
    let qVal = (1 - eps) * (qIn * cosPhi + iIn * sinPhi) + config.dcOffset * 0.6;

    // Soft LNA compression + ADC full-scale hard clipping at ±1.0
    if (Math.abs(iVal) > 1.0 || Math.abs(qVal) > 1.0) {
      clippedCount++;
    }
    iVal = Math.max(-1.0, Math.min(1.0, iVal));
    qVal = Math.max(-1.0, Math.min(1.0, qVal));

    // Uniform ADC Quantization
    adcI[n] = Math.round(iVal * quantLevels) / quantLevels;
    adcQ[n] = Math.round(qVal * quantLevels) / quantLevels;
  }

  // Compute Spectrum from ADC samples (so user sees full Nyquist span, aliasing, DC offset, I/Q image, and jammer)
  const spectrumDb = computePowerSpectrumDb(adcI, adcQ, config.fftSize, config.windowFunction, 0);

  // Stage 4: DDC Low-Pass Channel Filter (Windowed-Sinc FIR)
  const cutoffNorm = Math.min(0.48, Math.max(0.015, config.channelFilterBwHz / (2 * fs)));
  const firKernel = designLowPassFir(cutoffNorm, 31);
  const halfTaps = (firKernel.length - 1) >> 1;
  const basebandI = new Float32Array(numSamples);
  const basebandQ = new Float32Array(numSamples);

  for (let n = 0; n < numSamples; n++) {
    let accI = 0;
    let accQ = 0;
    for (let k = 0; k < firKernel.length; k++) {
      const idx = n - halfTaps + k;
      if (idx >= 0 && idx < numSamples) {
        accI += adcI[idx] * firKernel[k];
        accQ += adcQ[idx] * firKernel[k];
      }
    }
    basebandI[n] = accI;
    basebandQ[n] = accQ;
  }

  // Stage 5: Real Demodulator & Bit Slicing
  const effectiveMode = resolveEffectiveDemod(config.demodMode, activeEmitter);
  const demodWave = new Float32Array(numSamples);

  let prevI = basebandI[0];
  let prevQ = basebandQ[0];
  for (let n = 0; n < numSamples; n++) {
    const i = basebandI[n];
    const q = basebandQ[n];

    switch (effectiveMode) {
      case 'AM':
      case 'OOK': {
        demodWave[n] = Math.hypot(i, q);
        break;
      }
      case 'FM':
      case 'FSK': {
        // Polar quadrature discriminator: angle(s[n] * conj(s[n-1]))
        const re = i * prevI + q * prevQ;
        const im = q * prevI - i * prevQ;
        demodWave[n] = Math.atan2(im, re) / Math.PI;
        break;
      }
      case 'PSK':
      case 'QAM16': {
        demodWave[n] = i;
        break;
      }
    }
    prevI = i;
    prevQ = q;
  }

  // Estimate in-band SNR & peak metrics from spectrum
  let peakBin = 0;
  let peakDb = -130;
  let noiseAccum = 0;
  const sortedBins = Array.from(spectrumDb).sort((a, b) => a - b);
  const noiseMedianCount = Math.max(8, Math.floor(sortedBins.length * 0.4));
  for (let k = 0; k < noiseMedianCount; k++) {
    noiseAccum += sortedBins[k];
  }
  const noiseFloorDbFs = noiseAccum / noiseMedianCount;

  for (let k = 0; k < spectrumDb.length; k++) {
    if (spectrumDb[k] > peakDb) {
      peakDb = spectrumDb[k];
      peakBin = k;
    }
  }

  const binResolutionHz = fs / config.fftSize;
  const peakBasebandHz = (peakBin - config.fftSize / 2) * binResolutionHz;
  const peakFreqHz = config.centerFreqHz + peakBasebandHz;
  const measuredSnrDb = Math.max(0, peakDb - noiseFloorDbFs);

  const fsplDb = activeEmitter
    ? computeFreeSpacePathLossDb(activeEmitter.distanceMeters, activeEmitter.freqHz)
    : computeFreeSpacePathLossDb(100, config.centerFreqHz);
  const receivedPowerDbm = activeEmitter ? activeEmitter.txPowerDbm - fsplDb : -95;

  const isDigital =
    activeEmitter != null &&
    ['OOK', 'FSK', 'BPSK', 'QPSK', 'QAM16', 'LORA_CSS'].includes(activeEmitter.modulation);

  const jammerInPassband =
    config.jammerMode !== 'none' &&
    (config.jammerMode === 'barrage_noise' ||
      Math.abs(config.jammerOffsetHz) <= config.channelFilterBwHz / 2);

  const effectiveChannelSnr = jammerInPassband
    ? Math.max(-2, config.snrDb - 18)
    : config.snrDb;

  const estimatedBer = activeEmitter
    ? computeTheoreticalBer(effectiveChannelSnr, activeEmitter.modulation)
    : 0;

  // Decode bit stream cleanly from demodWave / active emitter with realistic BER bit-flips
  let decodedBits = '';
  let decodedHex = '';
  let decodedAscii = '';
  let packetIntegrity: SimulationFrame['packetIntegrity'] = 'ANALOG';

  if (isDigital && activeEmitter) {
    const rawBits = hexToBits(activeEmitter.messageHex ?? 'A9 5C 4B 31');
    const bitFlipRng = createRng(frameSeed + 99);
    const corruptedBits = rawBits.map((b) => {
      if (config.jammerMode === 'replay_spoof' && bitFlipRng() < 0.35) {
        return b ^ 1;
      }
      return bitFlipRng() < estimatedBer ? b ^ 1 : b;
    });

    decodedBits = corruptedBits.join('');
    const hexBytes: string[] = [];
    const asciiChars: string[] = [];
    // Skip 8-bit preamble for payload hex display
    for (let i = 8; i + 7 < corruptedBits.length; i += 8) {
      let val = 0;
      for (let b = 0; b < 8; b++) {
        val = (val << 1) | corruptedBits[i + b];
      }
      hexBytes.push(val.toString(16).toUpperCase().padStart(2, '0'));
      asciiChars.push(val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
    }
    decodedHex = hexBytes.join(' ');
    decodedAscii = asciiChars.join('');

    if (jammerInPassband && config.jammerMode !== 'none') {
      packetIntegrity = 'JAMMED';
    } else if (estimatedBer > 0.015 || clippedCount / numSamples > 0.08) {
      packetIntegrity = 'DEGRADED';
    } else {
      packetIntegrity = 'LOCKED';
    }
  } else {
    decodedBits = 'ANALOG WAVEFORM';
    decodedHex = activeEmitter ? activeEmitter.modulation : 'NO CARRIER';
    decodedAscii = activeEmitter ? activeEmitter.label : 'TUNE TO SIGNAL';
    packetIntegrity = 'ANALOG';
  }

  const metrics: DspMetrics = {
    nyquistFreqHz: nyquist,
    binResolutionHz,
    fftProcessingGainDb: 10 * Math.log10(config.fftSize / 2),
    quantizationSnrDb: computeQuantizationSnrDb(config.adcBits),
    thermalNoiseFloorDbm: computeThermalNoiseFloorDbm(config.channelFilterBwHz),
    peakFreqHz,
    peakPowerDbm: peakDb,
    measuredSnrDb,
    adcSaturationRatio: clippedCount / numSamples,
    isClipping: clippedCount > 4,
    aliasingCount: aliasedEmitters.length,
    aliasedEmitters,
    carsonBandwidthHz: computeCarsonBandwidthHz(
      activeEmitter?.fmDeviationHz ?? 75_000,
      activeEmitter?.modFreqHz ?? 15_000
    ),
    fsplDb,
    receivedPowerDbm,
    estimatedBer,
    activeEmitter,
  };

  return {
    basebandI,
    basebandQ,
    adcI,
    adcQ,
    demodWave,
    spectrumDb,
    decodedBits,
    decodedHex,
    decodedAscii,
    packetIntegrity,
    metrics,
    sampleTimeSec,
  };
}
