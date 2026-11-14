import { useState } from 'react';
import { buildLiveFormulas } from '../dsp/physics';
import type { PipelineStageId, SdrConfig, SimulationFrame } from '../dsp/types';

interface FormulaInspectorProps {
  config: SdrConfig;
  frame: SimulationFrame;
  selectedStage: PipelineStageId;
}

const STAGE_LABELS: Record<PipelineStageId, string> = {
  antenna: '01. Antenna & Path Loss',
  lna_mixer: '02. LNA & Quadrature Mixer',
  adc: '03. ADC & Sampling Physics',
  ddc_filter: '04. DDC, FFT & Channel Filter',
  demod: '05. Modulation & BER',
};

export function FormulaInspector({
  config,
  frame,
  selectedStage,
}: FormulaInspectorProps) {
  const [showAllStages, setShowAllStages] = useState(false);

  const allFormulas = buildLiveFormulas(config, frame.metrics, frame.metrics.activeEmitter);
  const visibleFormulas = showAllStages
    ? allFormulas
    : allFormulas.filter((f) => f.stage === selectedStage);

  return (
    <section
      aria-label="Live SDR Physics and DSP Formulae"
      data-testid="formula-inspector"
      className="rounded-md border border-slate-800 bg-[#111827] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Live Physics & DSP Formulae — {showAllStages ? 'Full Signal Chain' : STAGE_LABELS[selectedStage]}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Equations update instantaneously as you adjust sample rate, ADC bits, filter bandwidth, gain, or frequency.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAllStages((prev) => !prev)}
          className="rounded border border-slate-700 bg-[#0B0F17] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0"
        >
          {showAllStages ? 'Show Selected Stage Only' : 'Show All 8 Formulae'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibleFormulas.map((formula) => (
          <article
            key={formula.id}
            className="rounded border border-slate-800 bg-[#0B0F17] p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-cyan-300">{formula.title}</h4>
              <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
                {STAGE_LABELS[formula.stage]}
              </span>
            </div>

            <div className="mt-2 rounded border border-slate-800/80 bg-[#111827] px-3 py-2">
              <div className="font-math text-sm italic text-slate-100">
                {formula.equation}
              </div>
              <div className="mt-1 font-mono-tabular text-xs text-slate-300">
                = {formula.substituted}
              </div>
              <div className="mt-1 font-mono-tabular text-xs font-semibold text-emerald-400">
                ⇒ {formula.result}
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {formula.explanation}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-200/90">
              <strong className="font-semibold text-amber-300">Cybersecurity & Lab Use:</strong>{' '}
              {formula.cyberRelevance}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
