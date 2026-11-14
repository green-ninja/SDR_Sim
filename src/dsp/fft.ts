import type { WindowFunction } from './types';

export interface WindowCoefficients {
  weights: Float32Array;
  coherentGain: number;
  enbwBins: number;
}

export function createWindow(size: number, type: WindowFunction): WindowCoefficients {
  const weights = new Float32Array(size);
  let sum = 0;
  let sumSq = 0;

  for (let n = 0; n < size; n++) {
    let w = 1.0;
    const ratio = size > 1 ? n / (size - 1) : 0;
    switch (type) {
      case 'hann':
        w = 0.5 * (1 - Math.cos(2 * Math.PI * ratio));
        break;
      case 'hamming':
        w = 0.54 - 0.46 * Math.cos(2 * Math.PI * ratio);
        break;
      case 'blackmanHarris':
        w =
          0.35875 -
          0.48829 * Math.cos(2 * Math.PI * ratio) +
          0.14128 * Math.cos(4 * Math.PI * ratio) -
          0.01168 * Math.cos(6 * Math.PI * ratio);
        break;
      case 'rectangular':
      default:
        w = 1.0;
        break;
    }
    weights[n] = w;
    sum += w;
    sumSq += w * w;
  }

  const coherentGain = sum / size;
  const enbwBins = (size * sumSq) / (sum * sum || 1);

  return { weights, coherentGain, enbwBins };
}

/**
 * In-place Radix-2 Cooley-Tukey Complex FFT.
 * Length N must be a power of 2.
 */
export function fftComplex(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT size must be a power of 2, got ${n}`);
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = real[i];
      const ti = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tr;
      imag[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly stages
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const angle = k * angleStep;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const evenIdx = start + k;
        const oddIdx = evenIdx + half;

        const tr = wr * real[oddIdx] - wi * imag[oddIdx];
        const ti = wr * imag[oddIdx] + wi * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tr;
        imag[oddIdx] = imag[evenIdx] - ti;
        real[evenIdx] += tr;
        imag[evenIdx] += ti;
      }
    }
  }
}

/**
 * Computes DC-centered power spectrum in dBFS (range approx -120 to 0 dBFS).
 */
export function computePowerSpectrumDb(
  iSamples: Float32Array,
  qSamples: Float32Array,
  fftSize: number,
  windowType: WindowFunction,
  offset = 0
): Float32Array {
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const win = createWindow(fftSize, windowType);

  for (let k = 0; k < fftSize; k++) {
    const idx = offset + k;
    const w = win.weights[k];
    real[k] = (idx < iSamples.length ? iSamples[idx] : 0) * w;
    imag[k] = (idx < qSamples.length ? qSamples[idx] : 0) * w;
  }

  fftComplex(real, imag);

  const spectrumDb = new Float32Array(fftSize);
  const norm = fftSize * win.coherentGain || 1;
  const half = fftSize >> 1;

  for (let k = 0; k < fftSize; k++) {
    // fftshift: map [0..N-1] so index 0 corresponds to -Fs/2 and N/2 is DC
    const shifted = (k + half) % fftSize;
    const mag = Math.hypot(real[shifted], imag[shifted]) / norm;
    const db = 20 * Math.log10(Math.max(mag, 1e-7));
    spectrumDb[k] = Math.max(-130, Math.min(10, db));
  }

  return spectrumDb;
}

/**
 * Builds a normalized windowed-sinc low-pass FIR kernel for baseband DDC filtering.
 */
export function designLowPassFir(cutoffNormalized: number, taps = 31): Float32Array {
  const kernel = new Float32Array(taps);
  const fc = Math.max(0.01, Math.min(0.49, cutoffNormalized));
  const center = (taps - 1) / 2;
  let sum = 0;

  for (let i = 0; i < taps; i++) {
    const n = i - center;
    const sinc = n === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
    const blackman =
      0.42 -
      0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) +
      0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
    const h = sinc * blackman;
    kernel[i] = h;
    sum += h;
  }

  if (sum !== 0) {
    for (let i = 0; i < taps; i++) {
      kernel[i] /= sum;
    }
  }

  return kernel;
}
