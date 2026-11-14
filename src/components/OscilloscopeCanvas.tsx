import { useEffect, useRef, useState } from 'react';
import type { SdrConfig, SimulationFrame } from '../dsp/types';

interface OscilloscopeCanvasProps {
  config: SdrConfig;
  frame: SimulationFrame;
}

type ScopeMode = 'baseband_iq' | 'demodulated' | 'adc_raw';

export function OscilloscopeCanvas({ config, frame }: OscilloscopeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('baseband_iq');

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.max(260, container.clientWidth);
    const height = 190;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, width, height);

    const padX = 36;
    const padY = 16;
    const plotW = width - padX - 12;
    const plotH = height - padY * 2;
    const midY = padY + plotH / 2;

    // Grid
    ctx.strokeStyle = '#182235';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + plotW, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padX + (i / 6) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, padY + plotH);
      ctx.stroke();
    }

    // Center zero line
    ctx.strokeStyle = '#293548';
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(padX + plotW, midY);
    ctx.stroke();

    // Amplitude labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('+1.0', padX - 5, padY);
    ctx.fillText('0.0', padX - 5, midY);
    ctx.fillText('-1.0', padX - 5, padY + plotH);

    const samplesToShow = Math.min(360, frame.basebandI.length);

    const drawTrace = (arr: Float32Array, color: string, scale = 1.0) => {
      ctx.beginPath();
      for (let i = 0; i < samplesToShow; i++) {
        const x = padX + (i / (samplesToShow - 1)) * plotW;
        const val = Math.max(-1.05, Math.min(1.05, arr[i] * scale));
        const y = midY - val * (plotH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    if (scopeMode === 'baseband_iq') {
      drawTrace(frame.basebandI, '#22D3EE', 1.0);
      drawTrace(frame.basebandQ, '#F59E0B', 1.0);
    } else if (scopeMode === 'adc_raw') {
      drawTrace(frame.adcI, '#38BDF8', 1.0);
      drawTrace(frame.adcQ, '#FB7185', 1.0);
    } else {
      // Demodulated waveform
      drawTrace(frame.demodWave, '#34D399', 1.0);
    }

    ctx.strokeStyle = '#1E293B';
    ctx.strokeRect(padX, padY, plotW, plotH);
  }, [frame, scopeMode]);

  const spanUs = ((Math.min(360, frame.basebandI.length) / config.sampleRateHz) * 1e6).toFixed(0);

  return (
    <section
      aria-label="Time-Domain Oscilloscope"
      className="rounded-md border border-slate-800 bg-[#111827] p-3"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-100">
          Time-Domain Oscilloscope
        </h3>
        <div className="flex items-center gap-1 rounded bg-[#0B0F17] p-0.5 border border-slate-800">
          {(
            [
              { id: 'baseband_iq', label: 'Baseband I/Q' },
              { id: 'demodulated', label: 'Demod m(t)' },
              { id: 'adc_raw', label: 'ADC Raw' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setScopeMode(mode.id)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                scopeMode === mode.id
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="w-full overflow-hidden rounded border border-slate-800">
        <canvas
          ref={canvasRef}
          data-testid="oscilloscope-canvas"
          className="block h-[190px] w-full"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-slate-400">
        <div className="flex items-center gap-3">
          {scopeMode === 'demodulated' ? (
            <span className="text-emerald-400">Emerald: Demodulated Output</span>
          ) : (
            <>
              <span className="text-cyan-300">Cyan: In-Phase I(t)</span>
              <span className="text-amber-300">
                {scopeMode === 'adc_raw' ? 'Rose: ADC Q(t)' : 'Amber: Quadrature Q(t)'}
              </span>
            </>
          )}
        </div>
        <span>Window: {spanUs} µs · {config.adcBits}-bit Quantized</span>
      </div>
    </section>
  );
}
