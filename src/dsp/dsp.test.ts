import test from 'node:test';
import assert from 'node:assert/strict';
import { computePowerSpectrumDb, fftComplex } from './fft';
import {
  buildLiveFormulas,
  computeAliasedFrequency,
  computeCarsonBandwidthHz,
  computeFreeSpacePathLossDb,
  computeQuantizationSnrDb,
  computeTheoreticalBer,
  computeThermalNoiseFloorDbm,
} from './physics';
import { DEFAULT_SDR_CONFIG } from './presets';
import { runSdrSimulationFrame } from './simulator';

test('Radix-2 FFT detects exact frequency bin for complex tone', () => {
  const N = 256;
  const fs = 1_000_000;
  const targetBinOffset = 32; // +125 kHz above DC
  const fTone = (targetBinOffset * fs) / N;

  const i = new Float32Array(N);
  const q = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const phase = (2 * Math.PI * fTone * n) / fs;
    i[n] = Math.cos(phase);
    q[n] = Math.sin(phase);
  }

  const spectrum = computePowerSpectrumDb(i, q, N, 'hann');
  let maxIdx = 0;
  for (let k = 1; k < N; k++) {
    if (spectrum[k] > spectrum[maxIdx]) maxIdx = k;
  }

  // DC is at N/2 = 128; +32 bins = 160
  assert.equal(maxIdx, N / 2 + targetBinOffset);
  assert.ok(spectrum[maxIdx] > -5, `Expected peak near 0 dBFS, got ${spectrum[maxIdx]}`);
});

test('Aliasing fold-back math computes exact folded baseband frequency', () => {
  // Fs = 1 MHz => Nyquist = ±500 kHz. Signal at +700 kHz aliases to -300 kHz
  const res = computeAliasedFrequency(700_000, 1_000_000);
  assert.equal(res.isAliased, true);
  assert.equal(res.foldOrder, 1);
  assert.equal(res.aliasedHz, -300_000);

  // Signal inside Nyquist does not alias
  const inBand = computeAliasedFrequency(-250_000, 1_000_000);
  assert.equal(inBand.isAliased, false);
  assert.equal(inBand.aliasedHz, -250_000);
});

test('Quantization SNR, Thermal Noise, FSPL, and Carson Rule match RF physics formulas', () => {
  assert.equal(Number(computeQuantizationSnrDb(8).toFixed(2)), 49.92);
  assert.equal(Number(computeQuantizationSnrDb(12).toFixed(2)), 74.0);

  // kTB for 1 MHz BW with 0 dB NF = -174 + 60 = -114 dBm
  assert.equal(Number(computeThermalNoiseFloorDbm(1_000_000, 0).toFixed(2)), -114.0);

  // Carson's rule for WBFM: 2 * (75 kHz + 15 kHz) = 180 kHz
  assert.equal(computeCarsonBandwidthHz(75_000, 15_000), 180_000);

  // FSPL at 1000 m and 1000 MHz (~92.45 dB)
  const fspl = computeFreeSpacePathLossDb(1000, 1_000_000_000);
  assert.ok(fspl > 92.3 && fspl < 92.6, `Expected ~92.45 dB, got ${fspl}`);
});

test('BER decreases monotonically as SNR increases', () => {
  const lowSnrBer = computeTheoreticalBer(4, 'BPSK');
  const highSnrBer = computeTheoreticalBer(14, 'BPSK');
  assert.ok(highSnrBer < lowSnrBer);
  assert.ok(highSnrBer < 1e-6);
});

test('Simulator demonstrates real aliasing when anti-aliasing filter is disabled', () => {
  // Default 433.92 MHz preset has out-of-band pager at 434.62 MHz (+700 kHz offset)
  const withAa = runSdrSimulationFrame({ ...DEFAULT_SDR_CONFIG, antiAliasingFilter: true }, 0.01);
  assert.equal(withAa.metrics.aliasingCount, 0);

  const withoutAa = runSdrSimulationFrame({ ...DEFAULT_SDR_CONFIG, antiAliasingFilter: false }, 0.01);
  assert.equal(withoutAa.metrics.aliasingCount, 1);
  assert.equal(withoutAa.metrics.aliasedEmitters[0].aliasedBasebandHz, -300_000);
});

test('Simulator detects ADC clipping at excessive RF gain and builds live formulas', () => {
  const clipped = runSdrSimulationFrame({ ...DEFAULT_SDR_CONFIG, rfGainDb: 60 }, 0.02);
  assert.equal(clipped.metrics.isClipping, true);
  assert.ok(clipped.metrics.adcSaturationRatio > 0);

  const formulas = buildLiveFormulas(DEFAULT_SDR_CONFIG, clipped.metrics, clipped.metrics.activeEmitter);
  assert.ok(formulas.length >= 7);
  assert.ok(formulas.some((f) => f.id === 'quadrature_mixing'));
});

test('CW jammer inside passband marks digital packet JAMMED, narrowing filter recovers LOCKED', () => {
  // Jammer at +45 kHz: inside 120 kHz passband (±60 kHz) -> JAMMED
  const jammed = runSdrSimulationFrame(
    { ...DEFAULT_SDR_CONFIG, jammerMode: 'cw_tone', jammerOffsetHz: 45_000, channelFilterBwHz: 120_000 },
    0.05
  );
  assert.equal(jammed.packetIntegrity, 'JAMMED');

  // Narrow channel filter to 60 kHz (±30 kHz): rejects +45 kHz jammer -> LOCKED
  const recovered = runSdrSimulationFrame(
    { ...DEFAULT_SDR_CONFIG, jammerMode: 'cw_tone', jammerOffsetHz: 45_000, channelFilterBwHz: 60_000 },
    0.05
  );
  assert.equal(recovered.packetIntegrity, 'LOCKED');
});

test('FFT throws on non-power-of-two size', () => {
  assert.throws(() => fftComplex(new Float32Array(100), new Float32Array(100)));
});
