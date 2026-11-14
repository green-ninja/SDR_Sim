import type { DspMetrics, LiveFormula, ModulationType, RfEmitter, SdrConfig } from './types';

export function formatFrequency(freqHz: number): string {
  const abs = Math.abs(freqHz);
  const sign = freqHz < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(4)} GHz`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(4)} MHz`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)} kHz`;
  return `${sign}${abs.toFixed(1)} Hz`;
}

export function formatBandwidth(bwHz: number): string {
  const abs = Math.abs(bwHz);
  if (abs >= 1e6) return `${(abs / 1e6).toFixed(3)} MHz`;
  if (abs >= 1e3) return `${(abs / 1e3).toFixed(1)} kHz`;
  return `${abs.toFixed(1)} Hz`;
}

/**
 * Computes the folded baseband frequency when an emitter at basebandOffsetHz
 * is sampled at sampleRateHz without an anti-aliasing filter.
 */
export function computeAliasedFrequency(
  basebandOffsetHz: number,
  sampleRateHz: number
): { aliasedHz: number; foldOrder: number; isAliased: boolean } {
  const nyquist = sampleRateHz / 2;
  if (Math.abs(basebandOffsetHz) <= nyquist) {
    return { aliasedHz: basebandOffsetHz, foldOrder: 0, isAliased: false };
  }
  const foldOrder = Math.round(basebandOffsetHz / sampleRateHz);
  const aliasedHz = basebandOffsetHz - foldOrder * sampleRateHz;
  return {
    aliasedHz,
    foldOrder: Math.abs(foldOrder),
    isAliased: true,
  };
}

/**
 * Ideal uniform ADC quantization SNR: SNR_q = 6.02 * N + 1.76 dB
 */
export function computeQuantizationSnrDb(adcBits: number): number {
  return 6.02 * adcBits + 1.76;
}

/**
 * Thermal noise floor at 290 K: N = kTB + NF = -174 dBm/Hz + 10*log10(BW) + NF
 */
export function computeThermalNoiseFloorDbm(bandwidthHz: number, noiseFigureDb = 3.5): number {
  return -174 + 10 * Math.log10(Math.max(1, bandwidthHz)) + noiseFigureDb;
}

/**
 * Free-Space Path Loss (Friis): FSPL(dB) = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
 * where 20*log10(4*pi / 299792458) = -147.5522 dB.
 */
export function computeFreeSpacePathLossDb(distanceMeters: number, freqHz: number): number {
  const d = Math.max(0.1, distanceMeters);
  const f = Math.max(1, freqHz);
  return 20 * Math.log10(d) + 20 * Math.log10(f) - 147.5522;
}

/**
 * Carson's Rule for FM occupied bandwidth: BW = 2 * (delta_f + f_m)
 */
export function computeCarsonBandwidthHz(deviationHz: number, modFreqHz: number): number {
  return 2 * (Math.abs(deviationHz) + Math.abs(modFreqHz));
}

/**
 * Complementary error function approximation (Abramowitz & Stegun) for BER calculation.
 */
export function erfcApprox(x: number): number {
  if (x < 0) return 2 - erfcApprox(-x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-x * x);
}

export function computeTheoreticalBer(snrDb: number, modulation: ModulationType): number {
  const snrLin = Math.pow(10, snrDb / 10);
  switch (modulation) {
    case 'BPSK':
    case 'QPSK':
      return Math.min(0.5, 0.5 * erfcApprox(Math.sqrt(snrLin)));
    case 'QAM16':
      return Math.min(0.5, 0.75 * erfcApprox(Math.sqrt(snrLin / 5)));
    case 'FSK':
      return Math.min(0.5, 0.5 * Math.exp(-0.5 * snrLin));
    case 'OOK':
      return Math.min(0.5, 0.5 * erfcApprox(Math.sqrt(snrLin / 4)));
    case 'LORA_CSS':
      // CSS processing gain improves effective SNR by ~12 dB at SF7
      return Math.min(0.5, 0.5 * erfcApprox(Math.sqrt(snrLin * 8)));
    default:
      return 0;
  }
}

export function buildLiveFormulas(
  config: SdrConfig,
  metrics: DspMetrics,
  activeEmitter: RfEmitter | null
): LiveFormula[] {
  const fCenterMhz = (config.centerFreqHz / 1e6).toFixed(4);
  const fsKhz = (config.sampleRateHz / 1e3).toFixed(1);
  const nyquistKhz = (metrics.nyquistFreqHz / 1e3).toFixed(1);
  const dfHz = metrics.binResolutionHz.toFixed(1);
  const bwKhz = (config.channelFilterBwHz / 1e3).toFixed(1);

  const emitterFreqMhz = activeEmitter
    ? (activeEmitter.freqHz / 1e6).toFixed(4)
    : fCenterMhz;
  const distM = activeEmitter ? activeEmitter.distanceMeters : 120;
  const txDbm = activeEmitter ? activeEmitter.txPowerDbm : 10;

  const deviationHz = activeEmitter?.fmDeviationHz ?? 75_000;
  const modFreqHz = activeEmitter?.modFreqHz ?? 15_000;
  const modIndex = deviationHz / Math.max(1, modFreqHz);

  const formulas: LiveFormula[] = [
    {
      id: 'fspl',
      stage: 'antenna',
      title: 'Free-Space Path Loss (Friis Propagation)',
      equation: 'FSPL = 20·log₁₀(d) + 20·log₁₀(f) − 147.55 dB',
      substituted: `20·log₁₀(${distM} m) + 20·log₁₀(${emitterFreqMhz} MHz) − 147.55`,
      result: `${metrics.fsplDb.toFixed(2)} dB  (Rx = ${(txDbm - metrics.fsplDb).toFixed(1)} dBm)`,
      explanation:
        'Electromagnetic energy spreads spherically (1/r²) and antenna effective aperture scales with λ² = (c/f)². Doubling frequency or distance increases path loss by 6.02 dB.',
      cyberRelevance:
        'Used in RF link budgeting, rogue transmitter localization (RSSI trilateration), and estimating physical proximity of replay or eavesdropping devices.',
    },
    {
      id: 'thermal_noise',
      stage: 'antenna',
      title: 'Thermal Noise Floor (Johnson–Nyquist kTB)',
      equation: 'N₀ = −174 dBm/Hz + 10·log₁₀(BW) + NF',
      substituted: `−174 + 10·log₁₀(${Math.round(config.channelFilterBwHz)} Hz) + 3.5 dB`,
      result: `${metrics.thermalNoiseFloorDbm.toFixed(2)} dBm`,
      explanation:
        'Random thermal agitation of electrons inside receiver front-end resistors sets the fundamental physical sensitivity floor. Narrowing the channel filter BW lowers integrated noise power.',
      cyberRelevance:
        'Dictates the maximum distance from which weak TEMPEST emanations or low-power IoT packets can be recovered above noise.',
    },
    {
      id: 'quadrature_mixing',
      stage: 'lna_mixer',
      title: 'Quadrature Downconversion (I/Q Complex Mixing)',
      equation: 'x_BB(t) = x_RF(t) · e^(−j·2π·f_c·t) = I(t) + j·Q(t)',
      substituted: `f_c = ${fCenterMhz} MHz  |  Gain = +${config.rfGainDb} dB  |  I/Q Δφ = ${config.iqPhaseErrorDeg}°`,
      result:
        config.iqPhaseErrorDeg !== 0 || config.iqGainImbalance !== 0
          ? `Image Leakage Present (Δφ=${config.iqPhaseErrorDeg}°)`
          : 'Orthogonal I ⊥ Q (0° image error)',
      explanation:
        'Multiplying real RF by cosine (I) and −sine (Q) shifts the tuned carrier to 0 Hz while preserving positive vs. negative frequency asymmetry (unlike real-only mixing).',
      cyberRelevance:
        'Unbalanced I/Q gain or phase creates mirror-image "ghost" signals across 0 Hz, which analysts must distinguish from real rogue emitters.',
    },
    {
      id: 'nyquist_aliasing',
      stage: 'adc',
      title: 'Nyquist–Shannon Sampling & Aliasing Fold-Back',
      equation: 'f_s ≥ 2·B_max   |   f_alias = |f_offset − k·f_s|',
      substituted: `f_s = ${fsKhz} kHz  ⇒  Nyquist Span = ±${nyquistKhz} kHz`,
      result:
        metrics.aliasingCount > 0
          ? `▲ ${metrics.aliasingCount} emitter(s) aliasing into baseband`
          : `● Nyquist satisfied within ±${nyquistKhz} kHz`,
      explanation:
        'Discrete sampling replicates the spectrum every f_s Hz. Without an analog anti-aliasing low-pass filter, signals beyond ±f_s/2 fold back over the desired band.',
      cyberRelevance:
        'Intentional sub-Nyquist undersampling can intercept higher-band signals cheaply, while unintended aliasing hides or corrupts forensic captures.',
    },
    {
      id: 'adc_quantization',
      stage: 'adc',
      title: 'ADC Quantization Dynamic Range',
      equation: 'SNR_q = 6.02·N + 1.76 dB',
      substituted: `6.02 × ${config.adcBits} bits + 1.76 dB`,
      result: `${metrics.quantizationSnrDb.toFixed(1)} dB (${Math.pow(2, config.adcBits)} levels)`,
      explanation:
        'Each added ADC bit doubles voltage resolution and increases theoretical signal-to-quantization-noise ratio by 6.02 dB. Over-gaining saturates the ADC (±1.0 FS), generating odd-order harmonic spurs.',
      cyberRelevance:
        'A high-power nearby jammer forces automatic gain reduction or clips an 8-bit SDR (like RTL-SDR), desensitizing the receiver to faint signals.',
    },
    {
      id: 'fft_resolution',
      stage: 'ddc_filter',
      title: 'FFT Bin Resolution & Processing Gain',
      equation: 'Δf = f_s / N_FFT   |   G_FFT = 10·log₁₀(N_FFT / 2)',
      substituted: `${fsKhz} kHz / ${config.fftSize} bins  |  10·log₁₀(${config.fftSize / 2})`,
      result: `Δf = ${dfHz} Hz/bin  |  G_FFT = +${metrics.fftProcessingGainDb.toFixed(1)} dB`,
      explanation:
        'Increasing FFT size narrows each frequency bin, concentrating coherent CW energy while spreading uncorrelated noise across more bins—lifting weak signals out of the noise floor.',
      cyberRelevance:
        'High-N FFTs reveal narrowband covert beacons or clock harmonics hidden below wideband noise; window functions suppress spectral leakage.',
    },
    {
      id: 'channel_filter',
      stage: 'ddc_filter',
      title: 'Digital Downconverter (DDC) Channel Filter',
      equation: 'f_cutoff = BW_ch / 2   (Windowed-Sinc FIR)',
      substituted: `BW_ch = ${bwKhz} kHz  ⇒  Passband = ±${(config.channelFilterBwHz / 2000).toFixed(2)} kHz`,
      result: `Noise Reduction = ${(10 * Math.log10(config.sampleRateHz / Math.max(1, config.channelFilterBwHz))).toFixed(1)} dB`,
      explanation:
        'Low-pass filtering baseband I/Q isolates the target channel and rejects adjacent emitters and out-of-band barrage noise before demodulation.',
      cyberRelevance:
        'Tightening channel filter bandwidth is the primary DSP defense against adjacent-channel CW jammers.',
    },
    {
      id: 'modulation_math',
      stage: 'demod',
      title:
        activeEmitter?.modulation === 'WBFM' || activeEmitter?.modulation === 'NBFM'
          ? "FM Carson's Bandwidth & Phase Discriminator"
          : 'Digital Modulation & Bit Error Rate (BER)',
      equation:
        activeEmitter?.modulation === 'WBFM' || activeEmitter?.modulation === 'NBFM'
          ? 'BW ≈ 2·(Δf + f_m)   |   m(t) ∝ d/dt[atan2(Q, I)]'
          : 'P_b = ½·erfc(√(E_b/N_0))   |   φ(t) = atan2(Q, I)',
      substituted:
        activeEmitter?.modulation === 'WBFM' || activeEmitter?.modulation === 'NBFM'
          ? `2·(${(deviationHz / 1e3).toFixed(1)} kHz + ${(modFreqHz / 1e3).toFixed(1)} kHz)  (β = ${modIndex.toFixed(2)})`
          : `Measured SNR = ${metrics.measuredSnrDb.toFixed(1)} dB  (${activeEmitter?.modulation ?? config.demodMode})`,
      result:
        activeEmitter?.modulation === 'WBFM' || activeEmitter?.modulation === 'NBFM'
          ? `BW ≈ ${formatBandwidth(computeCarsonBandwidthHz(deviationHz, modFreqHz))}`
          : `Est. BER = ${metrics.estimatedBer.toExponential(2)}`,
      explanation:
        activeEmitter?.modulation === 'WBFM' || activeEmitter?.modulation === 'NBFM'
          ? "FM trades wider RF bandwidth (β = Δf/f_m) for superior noise immunity; demodulation differentiates instantaneous phase."
          : 'Digital symbols map bits onto amplitude (OOK), frequency (FSK), or phase/quadrature constellation points (BPSK/QPSK/16-QAM). Higher orders carry more bits/Hz but require higher SNR.',
      cyberRelevance:
        'Explains why OOK keyfobs are trivial to sniff/replay with simple envelope detection, whereas CSS (LoRa) or high-SNR QAM behave differently under jamming.',
    },
  ];

  return formulas;
}
