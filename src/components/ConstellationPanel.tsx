import { useEffect, useRef } from 'react';
import type { SimulationFrame } from '../dsp/types';
import { InfoTooltip } from './InfoTooltip';

interface ConstellationPanelProps {
  frame: SimulationFrame;
}

export function ConstellationPanel({ frame }: ConstellationPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 186;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#070A11';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;

    // Crosshairs & Unit Circle
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(size, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, size);
    ctx.stroke();

    // Auto-scale constellation radius smoothly to active signal magnitude
    let maxMag = 0.08;
    const sampleStep = 2;
    for (let i = 32; i < Math.min(600, frame.basebandI.length); i += sampleStep) {
      const m = Math.hypot(frame.basebandI[i], frame.basebandQ[i]);
      if (m > maxMag) maxMag = m;
    }
    const scale = radius / (maxMag * 1.15);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.72)';
    for (let i = 32; i < Math.min(600, frame.basebandI.length); i += sampleStep) {
      const x = cx + frame.basebandI[i] * scale;
      const y = cy - frame.basebandQ[i] * scale;
      ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
    }

    // Axis labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('I', size - 6, cy - 5);
    ctx.textAlign = 'left';
    ctx.fillText('Q', cx + 5, 12);
  }, [frame]);

  const integrityBadge = (() => {
    switch (frame.packetIntegrity) {
      case 'LOCKED':
        return { label: '● LOCKED', cls: 'text-emerald-400' };
      case 'DEGRADED':
        return { label: '▲ DEGRADED', cls: 'text-amber-400' };
      case 'JAMMED':
        return { label: '✖ JAMMED', cls: 'text-rose-400' };
      default:
        return { label: '● ANALOG', cls: 'text-cyan-300' };
    }
  })();

  return (
    <section
      aria-label="I/Q Constellation and Bitstream Decoder"
      className="rounded-md border border-slate-800 bg-[#111827] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-slate-100">
            I/Q Constellation & Decoder
          </h3>
          <InfoTooltip tooltipId="constellationPanel" />
        </div>
        <span className={`font-mono-tabular text-xs font-semibold ${integrityBadge.cls}`}>
          {integrityBadge.label}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="shrink-0 self-center overflow-hidden rounded border border-slate-800">
          <canvas
            ref={canvasRef}
            data-testid="constellation-canvas"
            className="block h-[186px] w-[186px]"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 rounded border border-slate-800 bg-[#070A11] p-2.5 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">Active Emitter</div>
            <div className="mt-0.5 truncate font-medium text-slate-100">
              {frame.metrics.activeEmitter?.label ?? 'No emitter inside Nyquist span'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono-tabular">
            <div>
              <div className="text-[11px] text-slate-400">Measured SNR</div>
              <div className="text-sm font-semibold text-cyan-300">
                {frame.metrics.measuredSnrDb.toFixed(1)} dB
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Est. BER (P_b)</div>
              <div className="text-sm font-semibold text-slate-100">
                {frame.metrics.estimatedBer === 0
                  ? '0.00e+0'
                  : frame.metrics.estimatedBer.toExponential(1)}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Decoded Payload (Hex · ASCII)</div>
            <div
              data-testid="decoded-payload"
              className="mt-0.5 truncate font-mono-tabular text-xs font-semibold text-emerald-300"
            >
              {frame.decodedHex} · &quot;{frame.decodedAscii}&quot;
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Bitstream</div>
            <div className="mt-0.5 break-all font-mono-tabular text-[11px] leading-tight text-slate-300">
              {frame.decodedBits.slice(0, 40)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
