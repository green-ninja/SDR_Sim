import { useEffect, useRef, useState } from 'react';
import { formatFrequency } from '../dsp/physics';
import type { RfEmitter, SdrConfig, SimulationFrame } from '../dsp/types';
import { InfoTooltip } from './InfoTooltip';

interface SpectrumWaterfallCanvasProps {
  config: SdrConfig;
  frame: SimulationFrame;
  emitters: RfEmitter[];
  onTuneFrequency: (newCenterFreqHz: number) => void;
}

const WATERFALL_ROWS = 120;

/**
 * Maps dBFS [-115, -5] to calibrated scientific RGB [deep slate -> cyan -> amber -> cream]
 */
function dbToRgb(db: number): [number, number, number] {
  const norm = Math.max(0, Math.min(1, (db + 115) / 110));
  if (norm < 0.42) {
    const t = norm / 0.42;
    return [Math.round(7 + t * 5), Math.round(10 + t * 28), Math.round(18 + t * 44)];
  }
  if (norm < 0.66) {
    const t = (norm - 0.42) / 0.24;
    return [Math.round(12 - t * 6), Math.round(38 + t * 144), Math.round(62 + t * 150)];
  }
  if (norm < 0.86) {
    const t = (norm - 0.66) / 0.20;
    return [Math.round(6 + t * 239), Math.round(182 - t * 24), Math.round(212 - t * 201)];
  }
  const t = (norm - 0.86) / 0.14;
  return [Math.round(245 + t * 10), Math.round(158 + t * 90), Math.round(11 + t * 210)];
}

export function SpectrumWaterfallCanvas({
  config,
  frame,
  emitters,
  onTuneFrequency,
}: SpectrumWaterfallCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waterfallOffscreenRef = useRef<HTMLCanvasElement | null>(null);
  const waterfallHistoryRef = useRef<Float32Array[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [cursorInfo, setCursorInfo] = useState<{ freqHz: number; db: number; x: number; y: number } | null>(
    null
  );

  // Track container resizes so canvas redraws cleanly even when stream is paused
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setContainerWidth(container.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Append newest FFT spectrum row to waterfall ring buffer whenever frame updates
  useEffect(() => {
    const history = waterfallHistoryRef.current;
    history.unshift(new Float32Array(frame.spectrumDb));
    if (history.length > WATERFALL_ROWS) {
      history.pop();
    }
  }, [frame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.max(320, containerWidth || container.clientWidth);
    const height = 390;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padLeft = 48;
    const padRight = 16;
    const padTop = 26;
    const specHeight = 192;
    const wfTop = padTop + specHeight + 24;
    const wfHeight = height - wfTop - 12;
    const plotW = width - padLeft - padRight;

    // Clear canvas background
    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, width, height);

    const minDb = -115;
    const maxDb = -5;
    const dbRange = maxDb - minDb;
    const dbToY = (db: number) =>
      padTop + specHeight - ((Math.max(minDb, Math.min(maxDb, db)) - minDb) / dbRange) * specHeight;

    // Shaded DDC Channel Filter Passband
    const bwHalfRatio = Math.min(0.5, config.channelFilterBwHz / (2 * config.sampleRateHz));
    const centerPx = padLeft + plotW / 2;
    const passbandHalfPx = bwHalfRatio * plotW;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.09)';
    ctx.fillRect(centerPx - passbandHalfPx, padTop, passbandHalfPx * 2, specHeight);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerPx - passbandHalfPx, padTop);
    ctx.lineTo(centerPx - passbandHalfPx, padTop + specHeight);
    ctx.moveTo(centerPx + passbandHalfPx, padTop);
    ctx.lineTo(centerPx + passbandHalfPx, padTop + specHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal dBFS grid
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let db = -100; db <= -20; db += 20) {
      const y = dbToY(db);
      ctx.strokeStyle = '#182235';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${db}`, padLeft - 6, y);
    }

    // Vertical frequency grid (5 divisions)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const x = padLeft + frac * plotW;
      const freq = config.centerFreqHz + (frac - 0.5) * config.sampleRateHz;
      ctx.strokeStyle = i === 2 ? '#293548' : '#182235';
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + specHeight);
      ctx.stroke();

      ctx.fillStyle = i === 2 ? '#22D3EE' : '#94A3B8';
      ctx.fillText(`${(freq / 1e6).toFixed(3)} MHz`, x, padTop + specHeight + 5);
    }

    // Squelch line
    const squelchY = dbToY(config.squelchDb);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, squelchY);
    ctx.lineTo(padLeft + plotW, squelchY);
    ctx.stroke();
    ctx.setLineDash([]);

    // FFT Spectrum Trace (clipped to spectrum plot rectangle)
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, specHeight);
    ctx.clip();

    const spec = frame.spectrumDb;
    const bins = spec.length;
    ctx.beginPath();
    for (let px = 0; px < plotW; px++) {
      const binIdx = Math.min(bins - 1, Math.floor((px / plotW) * bins));
      const y = dbToY(spec[binIdx]);
      if (px === 0) ctx.moveTo(padLeft + px, y);
      else ctx.lineTo(padLeft + px, y);
    }
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Subtle fill under spectrum curve
    ctx.lineTo(padLeft + plotW, padTop + specHeight);
    ctx.lineTo(padLeft, padTop + specHeight);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + specHeight);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Emitter markers inside Nyquist span
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const nyquist = config.sampleRateHz / 2;

    for (const em of emitters) {
      const offset = em.freqHz - config.centerFreqHz;
      if (Math.abs(offset) <= nyquist) {
        const x = padLeft + (0.5 + offset / config.sampleRateHz) * plotW;
        ctx.fillStyle = '#E2E8F0';
        const label = plotW < 440 ? em.modulation : em.label;
        ctx.fillText(label, x, padTop - 4);
      }
    }

    // Aliased emitter warning markers
    for (const alias of frame.metrics.aliasedEmitters) {
      const x = padLeft + (0.5 + alias.aliasedBasebandHz / config.sampleRateHz) * plotW;
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`▲ ALIAS (${alias.label})`, x, padTop + 14);
    }

    // CW Jammer marker
    if (config.jammerMode === 'cw_tone' && Math.abs(config.jammerOffsetHz) <= nyquist) {
      const jx = padLeft + (0.5 + config.jammerOffsetHz / config.sampleRateHz) * plotW;
      ctx.fillStyle = '#FB7185';
      ctx.fillText('✖ CW JAMMER', jx, padTop + 14);
    }

    // Waterfall Spectrogram Rendering via offscreen canvas so drawImage honors DPR transform
    const history = waterfallHistoryRef.current;
    if (history.length > 0 && wfHeight > 10 && plotW > 10) {
      const wInt = Math.max(1, Math.floor(plotW));
      const hInt = Math.max(1, Math.floor(wfHeight));

      if (!waterfallOffscreenRef.current) {
        waterfallOffscreenRef.current = document.createElement('canvas');
      }
      const offscreen = waterfallOffscreenRef.current;
      if (offscreen.width !== wInt || offscreen.height !== hInt) {
        offscreen.width = wInt;
        offscreen.height = hInt;
      }
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        const wfImg = offCtx.createImageData(wInt, hInt);
        const data = wfImg.data;

        for (let row = 0; row < hInt; row++) {
          const histIdx = Math.min(history.length - 1, Math.floor((row / hInt) * WATERFALL_ROWS));
          const rowSpec = history[histIdx];
          if (!rowSpec) continue;
          const rowBins = rowSpec.length;

          for (let col = 0; col < wInt; col++) {
            const binIdx = Math.min(rowBins - 1, Math.floor((col / wInt) * rowBins));
            const [r, g, b] = dbToRgb(rowSpec[binIdx]);
            const pIdx = (row * wInt + col) * 4;
            data[pIdx] = r;
            data[pIdx + 1] = g;
            data[pIdx + 2] = b;
            data[pIdx + 3] = 255;
          }
        }
        offCtx.putImageData(wfImg, 0, 0);
        ctx.drawImage(offscreen, padLeft, wfTop, plotW, wfHeight);
      }
    }

    // Waterfall border & axis label
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, specHeight);
    ctx.strokeRect(padLeft, wfTop, plotW, wfHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dBFS', 8, padTop + 2);
    ctx.fillText('TIME', 8, wfTop + 2);

    // Crosshair overlay when hovering
    if (cursorInfo && cursorInfo.x >= padLeft && cursorInfo.x <= padLeft + plotW) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cursorInfo.x, padTop);
      ctx.lineTo(cursorInfo.x, wfTop + wfHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [config, frame, emitters, cursorInfo, containerWidth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const padLeft = 48;
    const padRight = 16;
    const plotW = rect.width - padLeft - padRight;

    if (x < padLeft || x > padLeft + plotW) {
      setCursorInfo(null);
      return;
    }

    const frac = (x - padLeft) / plotW;
    const freqHz = config.centerFreqHz + (frac - 0.5) * config.sampleRateHz;
    const binIdx = Math.min(
      frame.spectrumDb.length - 1,
      Math.max(0, Math.floor(frac * frame.spectrumDb.length))
    );
    setCursorInfo({
      freqHz,
      db: frame.spectrumDb[binIdx],
      x,
      y,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 48;
    const padRight = 16;
    const plotW = rect.width - padLeft - padRight;
    if (x < padLeft || x > padLeft + plotW) return;
    const frac = (x - padLeft) / plotW;
    const clickedFreq = config.centerFreqHz + (frac - 0.5) * config.sampleRateHz;
    onTuneFrequency(Math.round(clickedFreq / 1000) * 1000);
  };

  return (
    <section
      aria-label="RF Power Spectrum and Waterfall Spectrogram"
      className="rounded-md border border-slate-800 bg-[#111827] p-3"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-slate-100">
              RF Spectrum & Waterfall Spectrogram
            </h2>
            <InfoTooltip tooltipId="spectrumPanel" />
          </div>
          <span className="text-slate-400 font-mono-tabular">
            Span {(config.sampleRateHz / 1e3).toFixed(0)} kHz · Click trace to tune
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono-tabular text-slate-300">
          <span>
            Peak: <strong className="text-cyan-300">{formatFrequency(frame.metrics.peakFreqHz)}</strong>{' '}
            ({frame.metrics.peakPowerDbm.toFixed(1)} dBFS)
          </span>
          <span>
            Cursor:{' '}
            {cursorInfo
              ? `${formatFrequency(cursorInfo.freqHz)} · ${cursorInfo.db.toFixed(1)} dBFS`
              : 'Hover plot'}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full overflow-hidden rounded border border-slate-800">
        <canvas
          ref={canvasRef}
          data-testid="spectrum-waterfall-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorInfo(null)}
          onClick={handleClick}
          className="block h-[390px] w-full cursor-crosshair"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
        <div className="flex items-center gap-3">
          <span>Shaded Band: DDC Channel LPF (±{(config.channelFilterBwHz / 2000).toFixed(1)} kHz)</span>
          <span aria-hidden="true">·</span>
          <span>Dashed Amber: Squelch ({config.squelchDb} dBFS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>-115 dBFS</span>
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-24 rounded-sm"
            style={{
              background:
                'linear-gradient(90deg, #070B14 0%, #0E4D64 30%, #06B6D4 60%, #F59E0B 85%, #FEF08A 100%)',
            }}
          />
          <span>-5 dBFS</span>
        </div>
      </div>
    </section>
  );
}
