import { useState } from 'react';
import { SDR_METHOD_GUIDES } from '../dsp/presets';
import type { SdrConfig, SdrMethodGuide } from '../dsp/types';

interface MethodMatrixViewProps {
  onApplyDemo: (patch: Partial<SdrConfig>) => void;
}

export function MethodMatrixView({ onApplyDemo }: MethodMatrixViewProps) {
  const [domainFilter, setDomainFilter] = useState<'All' | SdrMethodGuide['domain']>('All');

  const filtered =
    domainFilter === 'All'
      ? SDR_METHOD_GUIDES
      : SDR_METHOD_GUIDES.filter((g) => g.domain === domainFilter);

  const launchDemo = (guide: SdrMethodGuide) => {
    onApplyDemo({
      presetId: guide.demoPresetId,
      centerFreqHz: guide.demoCenterFreqHz,
      sampleRateHz: guide.demoSampleRateHz,
      channelFilterBwHz: guide.demoChannelBwHz,
      jammerMode: guide.demoJammerMode ?? 'none',
      demodMode: 'AUTO',
      antiAliasingFilter: true,
      iqPhaseErrorDeg: 0,
      dcOffset: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
            SDR Method & Work-Type Matrix
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Select a domain to explore which modulation schemes, DSP algorithms, and mathematical equations are used for real-world physics research and cybersecurity operations.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter SDR methods by domain"
          className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#111827] p-1"
        >
          {(['All', 'Cybersecurity', 'Physics', 'Communications'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDomainFilter(tab)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                domainFilter === tab
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((guide) => (
          <article
            key={guide.id}
            className="flex flex-col justify-between rounded-md border border-slate-800 bg-[#111827] p-5"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                <span className="text-cyan-300 font-semibold">{guide.domain}</span>
                <span aria-hidden="true">·</span>
                <span>{guide.typicalFreqRange}</span>
              </div>

              <h2 className="mt-1.5 text-base font-semibold text-slate-100">
                {guide.workType}
              </h2>

              <div className="mt-2 text-xs text-slate-300">
                <span className="text-slate-400">Signal / Modulation:</span>{' '}
                <strong className="font-medium text-slate-100">{guide.signalModulation}</strong>
              </div>

              <div className="mt-3 rounded border border-slate-800 bg-[#0B0F17] px-3 py-2">
                <div className="text-[11px] text-slate-400">Governing Formula</div>
                <div className="mt-0.5 font-math text-sm italic text-emerald-300">
                  {guide.keyFormula}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[11px] font-medium text-slate-400">
                  Core DSP Methods Used
                </div>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {guide.dspMethods.map((m) => (
                    <li key={m} className="font-mono-tabular">
                      • {m}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {guide.whyUsed}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => launchDemo(guide)}
                className="rounded border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
              >
                Load Live Demo in Workbench
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
