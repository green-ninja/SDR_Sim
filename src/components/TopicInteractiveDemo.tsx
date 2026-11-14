import { useEffect, useMemo, useRef, useState } from 'react';
import { computePowerSpectrumDb, createWindow } from '../dsp/fft';
import {
  computeAliasedFrequency,
  computeCarsonBandwidthHz,
  computeFreeSpacePathLossDb,
  computeQuantizationSnrDb,
  computeTheoreticalBer,
  computeThermalNoiseFloorDbm,
} from '../dsp/physics';
import { DEFAULT_SDR_CONFIG } from '../dsp/presets';
import { runSdrSimulationFrame } from '../dsp/simulator';
import type { WindowFunction } from '../dsp/types';

interface TopicInteractiveDemoProps {
  topicId: string;
}

/* 1. Topic 01: RF Wavelength & dBm/dBFS Explorer */
function RfWaveDemo() {
  const [freqMhz, setFreqMhz] = useState(433.92);
  const [txDbm, setTxDbm] = useState(10);
  const [gainDb, setGainDb] = useState(32);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const wavelengthM = 299.792458 / freqMhz;
  const powerMw = Math.pow(10, txDbm / 10);
  const rawDbfs = -44 + txDbm + gainDb * 0.7;
  const digitalDbfs = Math.min(0, rawDbfs);
  const isClipping = rawDbfs >= 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    // Center axis & clipping threshold rails
    const midY = h / 2;
    const maxAmp = h * 0.42;
    ctx.strokeStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY - maxAmp);
    ctx.lineTo(w, midY - maxAmp);
    ctx.moveTo(0, midY + maxAmp);
    ctx.lineTo(w, midY + maxAmp);
    ctx.stroke();
    ctx.setLineDash([]);

    const cycles = (freqMhz / 100) * 2.4;
    const rawScale = Math.pow(10, rawDbfs / 35);

    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const raw = Math.sin(2 * Math.PI * cycles * t) * rawScale;
      const clipped = Math.max(-1, Math.min(1, raw));
      const y = midY - clipped * maxAmp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = isClipping ? '#FB7185' : '#22D3EE';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`0 dBFS Full-Scale Ceiling`, 8, midY - maxAmp - 5);
  }, [freqMhz, rawDbfs, isClipping]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t1-freq" className="text-slate-300">Carrier Frequency</label>
            <span className="font-mono-tabular text-cyan-300">{freqMhz.toFixed(1)} MHz</span>
          </div>
          <input
            id="demo-t1-freq"
            type="range"
            min={100}
            max={1200}
            step={10}
            value={freqMhz}
            onChange={(e) => setFreqMhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t1-dbm" className="text-slate-300">Signal Power</label>
            <span className="font-mono-tabular text-cyan-300">{txDbm} dBm</span>
          </div>
          <input
            id="demo-t1-dbm"
            type="range"
            min={-10}
            max={30}
            step={1}
            value={txDbm}
            onChange={(e) => setTxDbm(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t1-gain" className="text-slate-300">SDR LNA Gain</label>
            <span className="font-mono-tabular text-cyan-300">+{gainDb} dB</span>
          </div>
          <input
            id="demo-t1-gain"
            type="range"
            min={0}
            max={60}
            step={1}
            value={gainDb}
            onChange={(e) => setGainDb(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[150px] w-full rounded border border-slate-800"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 font-mono-tabular text-xs">
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Wavelength λ = <strong className="text-cyan-300">{wavelengthM.toFixed(3)} m</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Linear Power = <strong className="text-slate-100">{powerMw.toFixed(2)} mW</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Digital Level ={' '}
          <strong className={isClipping ? 'text-rose-400' : 'text-emerald-400'}>
            {digitalDbfs.toFixed(1)} dBFS {isClipping ? '✖ CLIPPING' : '● OK'}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* 2. Topic 02: Spherical Wave Path Loss & Thermal Noise Floor */
function PropagationDemo() {
  const [distanceM, setDistanceM] = useState(120);
  const [bwKhz, setBwKhz] = useState(125);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fsplDb = computeFreeSpacePathLossDb(distanceM, 433_920_000);
  const rxDbm = 10 - fsplDb;
  const noiseDbm = computeThermalNoiseFloorDbm(bwKhz * 1000, 3.5);
  const marginDb = rxDbm - noiseDbm;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 155;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    const txX = 48;
    const cy = h / 2;
    const rxX = 80 + ((distanceM - 10) / 1990) * (w - 130);

    // Concentric fading spherical wavefronts
    for (let r = 24; r < w; r += 26) {
      const alpha = Math.max(0.05, 0.55 * (1 - r / w));
      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(txX, cy, r, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }

    // Distance line
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(txX, cy);
    ctx.lineTo(rxX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tx and Rx Antenna Nodes
    ctx.fillStyle = '#22D3EE';
    ctx.beginPath();
    ctx.arc(txX, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = marginDb > 10 ? '#34D399' : marginDb > 0 ? '#F59E0B' : '#FB7185';
    ctx.beginPath();
    ctx.arc(rxX, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText('Tx (+10 dBm)', txX - 30, cy - 16);
    ctx.fillText(`Rx (${rxDbm.toFixed(1)} dBm)`, Math.min(w - 125, rxX - 35), cy - 16);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`d = ${distanceM} m`, (txX + rxX) / 2 - 26, cy + 18);
  }, [distanceM, rxDbm, marginDb]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t2-dist" className="text-slate-300">Propagation Distance (d)</label>
            <span className="font-mono-tabular text-cyan-300">{distanceM} m</span>
          </div>
          <input
            id="demo-t2-dist"
            type="range"
            min={10}
            max={2000}
            step={10}
            value={distanceM}
            onChange={(e) => setDistanceM(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t2-bw" className="text-slate-300">Receiver Filter BW</label>
            <span className="font-mono-tabular text-cyan-300">{bwKhz} kHz</span>
          </div>
          <input
            id="demo-t2-bw"
            type="range"
            min={10}
            max={1000}
            step={10}
            value={bwKhz}
            onChange={(e) => setBwKhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[155px] w-full rounded border border-slate-800"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 font-mono-tabular text-xs">
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          FSPL (433.9 MHz) = <strong className="text-slate-100">{fsplDb.toFixed(1)} dB</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          kTB Noise Floor = <strong className="text-amber-300">{noiseDbm.toFixed(1)} dBm</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          SNR Margin ={' '}
          <strong className={marginDb > 10 ? 'text-emerald-400' : 'text-amber-400'}>
            +{marginDb.toFixed(1)} dB
          </strong>
        </div>
      </div>
    </div>
  );
}

/* 3. Topic 03: Quadrature I/Q Phasor & Image Imbalance Lab */
function IqPhasorDemo() {
  const [offsetKhz, setOffsetKhz] = useState(150);
  const [phaseErrDeg, setPhaseErrDeg] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 175;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    // Compute real FFT of complex tone with I/Q phase error
    const N = 256;
    const fs = 1_000_000;
    const iArr = new Float32Array(N);
    const qArr = new Float32Array(N);
    const errRad = (phaseErrDeg * Math.PI) / 180;

    for (let n = 0; n < N; n++) {
      const p = (2 * Math.PI * (offsetKhz * 1000) * n) / fs;
      const i = Math.cos(p);
      const q = Math.sin(p);
      iArr[n] = i;
      qArr[n] = q * Math.cos(errRad) + i * Math.sin(errRad);
    }

    const spec = computePowerSpectrumDb(iArr, qArr, N, 'hann');

    // Left panel: I(t) & Q(t) orthogonal waveforms; Right panel: Signed FFT (-500 to +500 kHz)
    const splitX = Math.floor(w * 0.46);

    // Left: I & Q waves
    const midY = h / 2;
    const amp = h * 0.34;
    ctx.strokeStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(12, midY);
    ctx.lineTo(splitX - 12, midY);
    ctx.stroke();

    const drawWave = (arr: Float32Array, color: string) => {
      ctx.beginPath();
      const count = 80;
      for (let k = 0; k < count; k++) {
        const x = 12 + (k / (count - 1)) * (splitX - 24);
        const y = midY - arr[k] * amp;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    drawWave(iArr, '#22D3EE');
    drawWave(qArr, '#F59E0B');

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('Time: I (Cyan) & Q (Amber)', 12, 16);

    // Right: Signed FFT spectrum
    const specX0 = splitX + 16;
    const specW = w - specX0 - 14;
    const specTop = 24;
    const specH = h - 46;

    ctx.strokeStyle = '#293548';
    ctx.beginPath();
    ctx.moveTo(specX0 + specW / 2, specTop);
    ctx.lineTo(specX0 + specW / 2, specTop + specH);
    ctx.stroke();

    ctx.beginPath();
    for (let k = 0; k < N; k++) {
      const x = specX0 + (k / (N - 1)) * specW;
      const norm = Math.max(0, Math.min(1, (spec[k] + 90) / 90));
      const y = specTop + specH - norm * specH;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Signed Complex FFT (−Fs/2 to +Fs/2)', specX0, 16);
    ctx.fillText('−500 kHz', specX0, h - 8);
    ctx.fillText('0 Hz', specX0 + specW / 2 - 12, h - 8);
    ctx.fillText('+500 kHz', specX0 + specW - 50, h - 8);
  }, [offsetKhz, phaseErrDeg]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t3-offset" className="text-slate-300">Baseband Offset Frequency</label>
            <span className="font-mono-tabular text-cyan-300">
              {offsetKhz >= 0 ? `+${offsetKhz}` : offsetKhz} kHz
            </span>
          </div>
          <input
            id="demo-t3-offset"
            type="range"
            min={-400}
            max={400}
            step={25}
            value={offsetKhz}
            onChange={(e) => setOffsetKhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t3-err" className="text-slate-300">I/Q Phase Error (Δφ)</label>
            <span className="font-mono-tabular text-amber-300">{phaseErrDeg}°</span>
          </div>
          <input
            id="demo-t3-err"
            type="range"
            min={-30}
            max={30}
            step={1}
            value={phaseErrDeg}
            onChange={(e) => setPhaseErrDeg(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[175px] w-full rounded border border-slate-800"
      />

      <p className="text-xs text-slate-300">
        {phaseErrDeg === 0
          ? `● Orthogonal I/Q: positive (${offsetKhz >= 0 ? '+' : ''}${offsetKhz} kHz) and negative sides are cleanly separated with zero mirror image.`
          : `▲ Imbalance Δφ=${phaseErrDeg}°: notice the mirror-image ghost peak appearing at ${-offsetKhz >= 0 ? `+${-offsetKhz}` : -offsetKhz} kHz across 0 Hz!`}
      </p>
    </div>
  );
}

/* 4. Topic 04: Nyquist Sampling, Aliasing & Quantization Demo */
function NyquistSamplingDemo() {
  const [sampleRateKhz, setSampleRateKhz] = useState(1000);
  const [adcBits, setAdcBits] = useState(6);
  const [antiAlias, setAntiAlias] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const signalKhz = 700;
  const aliasInfo = computeAliasedFrequency(signalKhz * 1000, sampleRateKhz * 1000);
  const snrQ = computeQuantizationSnrDb(adcBits);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 165;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    const midY = h / 2;
    const amp = h * 0.36;
    const durationSec = 4e-6; // 4 microseconds window
    const qLevels = Math.pow(2, adcBits - 1);
    const aaScale = antiAlias && Math.abs(signalKhz) > sampleRateKhz / 2 ? 0.06 : 1.0;

    // 1. True continuous analog wave (dashed cyan)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x / w) * durationSec;
      const val = Math.cos(2 * Math.PI * (signalKhz * 1000) * t) * aaScale;
      const y = midY - val * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Reconstructed aliased wave (amber)
    ctx.strokeStyle = aliasInfo.isAliased && !antiAlias ? '#F59E0B' : '#34D399';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const t = (x / w) * durationSec;
      const raw = Math.cos(2 * Math.PI * aliasInfo.aliasedHz * t) * aaScale;
      const quant = Math.round(raw * qLevels) / qLevels;
      const y = midY - quant * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Discrete ADC sample dots
    const totalSamples = Math.floor(durationSec * sampleRateKhz * 1000);
    ctx.fillStyle = '#F8FAFC';
    for (let n = 0; n <= totalSamples; n++) {
      const t = n / (sampleRateKhz * 1000);
      const x = (t / durationSec) * w;
      const raw = Math.cos(2 * Math.PI * (signalKhz * 1000) * t) * aaScale;
      const quant = Math.round(raw * qLevels) / qLevels;
      const y = midY - quant * amp;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('Dashed Cyan: 700 kHz Input   |   White Dots: ADC Samples   |   Solid: Quantized Reconstruction', 8, 14);
  }, [sampleRateKhz, adcBits, antiAlias, aliasInfo]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t4-fs" className="text-slate-300">Sample Rate (f_s)</label>
            <span className="font-mono-tabular text-cyan-300">{sampleRateKhz} kS/s</span>
          </div>
          <input
            id="demo-t4-fs"
            type="range"
            min={600}
            max={2400}
            step={100}
            value={sampleRateKhz}
            onChange={(e) => setSampleRateKhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t4-bits" className="text-slate-300">ADC Bits (N)</label>
            <span className="font-mono-tabular text-cyan-300">{adcBits}-bit ({snrQ.toFixed(1)} dB)</span>
          </div>
          <input
            id="demo-t4-bits"
            type="range"
            min={2}
            max={12}
            step={1}
            value={adcBits}
            onChange={(e) => setAdcBits(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded border border-slate-800 bg-[#111827] px-3 py-1.5 text-xs">
          <span className="text-slate-200">Anti-Aliasing Filter</span>
          <input
            type="checkbox"
            checked={antiAlias}
            onChange={(e) => setAntiAlias(e.target.checked)}
            className="h-4 w-4 accent-cyan-500"
          />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[165px] w-full rounded border border-slate-800"
      />

      <p className="font-mono-tabular text-xs">
        {antiAlias && aliasInfo.isAliased ? (
          <span className="text-emerald-400">
            ● Anti-aliasing filter attenuates the 700 kHz out-of-band signal before sampling.
          </span>
        ) : aliasInfo.isAliased ? (
          <span className="text-amber-400">
            ▲ ALIASING ACTIVE: 700 kHz sampled at {sampleRateKhz} kS/s folds to {(aliasInfo.aliasedHz / 1000).toFixed(0)} kHz!
          </span>
        ) : (
          <span className="text-emerald-400">
            ● Nyquist Satisfied (f_s = {sampleRateKhz} kS/s ≥ 2 × 700 kHz): clean reconstruction at 700 kHz.
          </span>
        )}
      </p>
    </div>
  );
}

/* 5. Topic 05: FFT Windowing & Spectral Leakage Demo */
function FftWindowDemo() {
  const [windowType, setWindowType] = useState<WindowFunction>('hann');
  const [binFraction, setBinFraction] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 165;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    const N = 256;
    const win = createWindow(N, windowType);
    const iArr = new Float32Array(N);
    const qArr = new Float32Array(N);
    const cycles = 28 + binFraction;
    for (let n = 0; n < N; n++) {
      const p = (2 * Math.PI * cycles * n) / N;
      iArr[n] = Math.cos(p);
      qArr[n] = Math.sin(p);
    }
    const spec = computePowerSpectrumDb(iArr, qArr, N, windowType);

    // Left: Window weights shape; Right: Resulting FFT sidelobes
    const leftW = Math.floor(w * 0.34);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let n = 0; n < N; n++) {
      const x = 10 + (n / (N - 1)) * (leftW - 20);
      const y = h - 24 - win.weights[n] * (h - 50);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const specX0 = leftW + 14;
    const specW = w - specX0 - 12;
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < N; k++) {
      const x = specX0 + (k / (N - 1)) * specW;
      const norm = Math.max(0, Math.min(1, (spec[k] + 100) / 100));
      const y = h - 24 - norm * (h - 46);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(`Window Taper (${windowType})`, 10, 14);
    ctx.fillText('FFT Spectrum (−100 to 0 dBFS)', specX0, 14);
  }, [windowType, binFraction]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#0B0F17] p-1">
          {(
            [
              { id: 'rectangular', label: 'Rectangular' },
              { id: 'hann', label: 'Hann' },
              { id: 'blackmanHarris', label: 'Blackman-Harris' },
            ] as const
          ).map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindowType(w.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                windowType === w.id
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[190px]">
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t5-bin" className="text-slate-300">Non-Integer Bin Offset</label>
            <span className="font-mono-tabular text-cyan-300">+{binFraction.toFixed(2)} bin</span>
          </div>
          <input
            id="demo-t5-bin"
            type="range"
            min={0}
            max={0.5}
            step={0.05}
            value={binFraction}
            onChange={(e) => setBinFraction(Number(e.target.value))}
            className="sdr-slider mt-1 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[165px] w-full rounded border border-slate-800"
      />
    </div>
  );
}

/* 6. Topic 06: AM vs. FM Carson's Bandwidth Demo */
function AnalogModDemo() {
  const [modMode, setModMode] = useState<'AM' | 'FM'>('FM');
  const [fmDevKhz, setFmDevKhz] = useState(75);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fmModFreqKhz = 15;
  const carsonBwKhz =
    modMode === 'FM'
      ? computeCarsonBandwidthHz(fmDevKhz * 1000, fmModFreqKhz * 1000) / 1000
      : 2 * fmModFreqKhz;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 165;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    const N = 512;
    const fs = 500_000;
    const iArr = new Float32Array(N);
    const qArr = new Float32Array(N);
    let phase = 0;

    for (let n = 0; n < N; n++) {
      const t = n / fs;
      const msg = Math.sin(2 * Math.PI * (fmModFreqKhz * 1000) * t);
      if (modMode === 'AM') {
        const env = 0.65 + 0.35 * msg;
        iArr[n] = env;
        qArr[n] = 0;
      } else {
        phase += (2 * Math.PI * (fmDevKhz * 1000) * msg) / fs;
        iArr[n] = Math.cos(phase);
        qArr[n] = Math.sin(phase);
      }
    }

    const spec = computePowerSpectrumDb(iArr, qArr, N, 'hann');

    // Draw modulated time wave on left, spectrum sidebands on right
    const leftW = Math.floor(w * 0.42);
    const midY = h / 2;
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < 120; k++) {
      const t = k / 120;
      const msg = Math.sin(2 * Math.PI * 2 * t);
      const val =
        modMode === 'AM'
          ? (0.6 + 0.4 * msg) * Math.cos(2 * Math.PI * 22 * t)
          : Math.cos(2 * Math.PI * 22 * t + (fmDevKhz / 18) * Math.sin(2 * Math.PI * 2 * t));
      const x = 10 + t * (leftW - 20);
      const y = midY - val * (h * 0.34);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const specX0 = leftW + 14;
    const specW = w - specX0 - 12;
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < N; k++) {
      const x = specX0 + (k / (N - 1)) * specW;
      const norm = Math.max(0, Math.min(1, (spec[k] + 95) / 95));
      const y = h - 22 - norm * (h - 42);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(`Carrier Waveform (${modMode})`, 10, 14);
    ctx.fillText(`RF Sidebands · Carson BW ≈ ${carsonBwKhz.toFixed(0)} kHz`, specX0, 14);
  }, [modMode, fmDevKhz, carsonBwKhz]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#0B0F17] p-1">
          {(['FM', 'AM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModMode(m)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                modMode === m
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'FM' ? 'Frequency Mod (FM)' : 'Amplitude Mod (AM)'}
            </button>
          ))}
        </div>

        {modMode === 'FM' && (
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs">
              <label htmlFor="demo-t6-dev" className="text-slate-300">Peak Deviation (Δf)</label>
              <span className="font-mono-tabular text-cyan-300">{fmDevKhz} kHz</span>
            </div>
            <input
              id="demo-t6-dev"
              type="range"
              min={5}
              max={100}
              step={5}
              value={fmDevKhz}
              onChange={(e) => setFmDevKhz(Number(e.target.value))}
              className="sdr-slider mt-1 w-full"
            />
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[165px] w-full rounded border border-slate-800"
      />
    </div>
  );
}

/* 7. Topic 07: Digital Constellation & BER Playground */
function ConstellationNoiseDemo() {
  const [scheme, setScheme] = useState<'BPSK' | 'QPSK' | 'QAM16'>('QPSK');
  const [snrDb, setSnrDb] = useState(16);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ber = computeTheoreticalBer(snrDb, scheme);
  const bitsPerSym = scheme === 'BPSK' ? 1 : scheme === 'QPSK' ? 2 : 4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 175;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.36;

    ctx.strokeStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.4, cy);
    ctx.lineTo(cx + radius * 1.4, cy);
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx, h - 12);
    ctx.stroke();

    // Ideal points
    const idealPoints: Array<[number, number]> = [];
    if (scheme === 'BPSK') {
      idealPoints.push([-1, 0], [1, 0]);
    } else if (scheme === 'QPSK') {
      idealPoints.push([-0.707, -0.707], [-0.707, 0.707], [0.707, -0.707], [0.707, 0.707]);
    } else {
      for (const iv of [-3, -1, 1, 3]) {
        for (const qv of [-3, -1, 1, 3]) {
          idealPoints.push([iv / 3.2, qv / 3.2]);
        }
      }
    }

    // Deterministic noisy symbol scatter
    const sigma = 0.7 / Math.pow(10, snrDb / 20);
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    ctx.fillStyle = 'rgba(34, 211, 238, 0.75)';
    for (let s = 0; s < 240; s++) {
      const pt = idealPoints[s % idealPoints.length];
      const u1 = Math.max(1e-6, rand());
      const u2 = rand();
      const g1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const g2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
      const x = cx + (pt[0] + g1 * sigma) * radius;
      const y = cy - (pt[1] + g2 * sigma) * radius;
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }

    // Ideal reference crosses
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.2;
    for (const pt of idealPoints) {
      const x = cx + pt[0] * radius;
      const y = cy - pt[1] * radius;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
  }, [scheme, snrDb]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#0B0F17] p-1">
          {(['BPSK', 'QPSK', 'QAM16'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setScheme(m)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                scheme === m
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'QAM16' ? '16-QAM' : m}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t7-snr" className="text-slate-300">Channel SNR</label>
            <span className="font-mono-tabular text-cyan-300">{snrDb} dB</span>
          </div>
          <input
            id="demo-t7-snr"
            type="range"
            min={2}
            max={28}
            step={1}
            value={snrDb}
            onChange={(e) => setSnrDb(Number(e.target.value))}
            className="sdr-slider mt-1 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[175px] w-full rounded border border-slate-800"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 font-mono-tabular text-xs">
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Bits / Symbol = <strong className="text-cyan-300">{bitsPerSym} bits</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Est. BER (P_b) = <strong className="text-slate-100">{ber.toExponential(2)}</strong>
        </div>
        <div className="rounded border border-slate-800 bg-[#111827] px-3 py-2">
          Link Quality ={' '}
          <strong className={ber < 1e-4 ? 'text-emerald-400' : 'text-amber-400'}>
            {ber < 1e-4 ? '● Clean Lock' : '▲ High Symbol Error'}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* 8. Topic 08: Live Anti-Jam DDC Filtering Demo */
function AntiJamDemo() {
  const [filterBwKhz, setFilterBwKhz] = useState(140);
  const [jammerOffsetKhz, setJammerOffsetKhz] = useState(45);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const simFrame = useMemo(
    () =>
      runSdrSimulationFrame(
        {
          ...DEFAULT_SDR_CONFIG,
          channelFilterBwHz: filterBwKhz * 1000,
          jammerMode: 'cw_tone',
          jammerOffsetHz: jammerOffsetKhz * 1000,
          jammerPowerDbm: -20,
          fftSize: 512,
        },
        0.02,
        777
      ),
    [filterBwKhz, jammerOffsetKhz]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 560;
    const h = 155;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, w, h);

    // Highlight DDC passband
    const halfPassPx = ((filterBwKhz * 1000) / (2 * 1_000_000)) * w;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
    ctx.fillRect(w / 2 - halfPassPx, 0, halfPassPx * 2, h);

    const spec = simFrame.spectrumDb;
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < spec.length; k++) {
      const x = (k / (spec.length - 1)) * w;
      const norm = Math.max(0, Math.min(1, (spec[k] + 100) / 95));
      const y = h - 20 - norm * (h - 36);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Jammer label
    const jx = (0.5 + (jammerOffsetKhz * 1000) / 1_000_000) * w;
    ctx.fillStyle = '#FB7185';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('✖ CW Jammer', Math.min(w - 75, Math.max(6, jx - 30)), 14);
  }, [simFrame, filterBwKhz, jammerOffsetKhz]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t8-bw" className="text-slate-300">DDC Channel Filter BW</label>
            <span className="font-mono-tabular text-cyan-300">{filterBwKhz} kHz (±{filterBwKhz / 2} kHz)</span>
          </div>
          <input
            id="demo-t8-bw"
            type="range"
            min={30}
            max={240}
            step={10}
            value={filterBwKhz}
            onChange={(e) => setFilterBwKhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <label htmlFor="demo-t8-jam" className="text-slate-300">Attacker CW Jammer Offset</label>
            <span className="font-mono-tabular text-rose-300">+{jammerOffsetKhz} kHz</span>
          </div>
          <input
            id="demo-t8-jam"
            type="range"
            min={20}
            max={120}
            step={5}
            value={jammerOffsetKhz}
            onChange={(e) => setJammerOffsetKhz(Number(e.target.value))}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="topic-interactive-canvas"
        className="block h-[155px] w-full rounded border border-slate-800"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-[#111827] px-3 py-2 font-mono-tabular text-xs">
        <span>
          Decoded Payload:{' '}
          <strong className="text-slate-100">
            {simFrame.decodedHex} · &quot;{simFrame.decodedAscii}&quot;
          </strong>
        </span>
        <span
          className={
            simFrame.packetIntegrity === 'LOCKED'
              ? 'font-semibold text-emerald-400'
              : 'font-semibold text-rose-400'
          }
        >
          {simFrame.packetIntegrity === 'LOCKED' ? '● LOCKED (Jammer Rejected)' : '✖ JAMMED (Inside Passband)'}
        </span>
      </div>
    </div>
  );
}

export function TopicInteractiveDemo({ topicId }: TopicInteractiveDemoProps) {
  switch (topicId) {
    case 'rf-terminology':
      return <RfWaveDemo />;
    case 'antenna-propagation':
      return <PropagationDemo />;
    case 'lna-iq-mixer':
      return <IqPhasorDemo />;
    case 'adc-nyquist-aliasing':
      return <NyquistSamplingDemo />;
    case 'fft-windowing-ddc':
      return <FftWindowDemo />;
    case 'analog-modulation':
      return <AnalogModDemo />;
    case 'digital-modulation':
      return <ConstellationNoiseDemo />;
    case 'sdr-cybersecurity-mastery':
    default:
      return <AntiJamDemo />;
  }
}
