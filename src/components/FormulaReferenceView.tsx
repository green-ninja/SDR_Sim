import { useState } from 'react';
import {
  buildLiveFormulas,
  computeAliasedFrequency,
  computeFreeSpacePathLossDb,
  computeQuantizationSnrDb,
  computeThermalNoiseFloorDbm,
} from '../dsp/physics';
import type { SdrConfig, SimulationFrame } from '../dsp/types';

interface FormulaReferenceViewProps {
  config: SdrConfig;
  frame: SimulationFrame;
}

export function FormulaReferenceView({ config, frame }: FormulaReferenceViewProps) {
  const formulas = buildLiveFormulas(config, frame.metrics, frame.metrics.activeEmitter);

  // Interactive Physics Sandbox Calculator inputs
  const [calcDistM, setCalcDistM] = useState(250);
  const [calcFreqMhz, setCalcFreqMhz] = useState(Number((config.centerFreqHz / 1e6).toFixed(2)));
  const [calcTxDbm, setCalcTxDbm] = useState(14);
  const [calcSignalOffsetKhz, setCalcSignalOffsetKhz] = useState(700);

  const fspl = computeFreeSpacePathLossDb(calcDistM, calcFreqMhz * 1e6);
  const rxPower = calcTxDbm - fspl;
  const noiseFloor = computeThermalNoiseFloorDbm(config.channelFilterBwHz);
  const linkSnr = rxPower - noiseFloor;
  const aliasCheck = computeAliasedFrequency(calcSignalOffsetKhz * 1e3, config.sampleRateHz);
  const adcDynRange = computeQuantizationSnrDb(config.adcBits);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
          SDR Physics & DSP Mathematical Reference
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          Every formula below is evaluated continuously using your current SDR workbench parameters, paired with an interactive link-budget and Nyquist aliasing sandbox.
        </p>
      </div>

      {/* Interactive Link Budget & Nyquist Calculator */}
      <section
        aria-label="Interactive RF Physics Calculator"
        className="rounded-md border border-slate-800 bg-[#111827] p-5"
      >
        <h2 className="text-base font-semibold text-slate-100">
          Interactive Link Budget & Aliasing Calculator
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Coupled to your live Workbench Sample Rate ({(config.sampleRateHz / 1e3).toFixed(0)} kS/s), Channel Filter ({(config.channelFilterBwHz / 1e3).toFixed(0)} kHz), and ADC ({config.adcBits}-bit).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="flex justify-between text-xs">
              <label htmlFor="calc-dist" className="text-slate-300">Distance (d)</label>
              <span className="font-mono-tabular text-cyan-300">{calcDistM} m</span>
            </div>
            <input
              id="calc-dist"
              type="range"
              min={5}
              max={5000}
              step={5}
              value={calcDistM}
              onChange={(e) => setCalcDistM(Number(e.target.value))}
              className="sdr-slider mt-2 w-full"
            />
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="flex justify-between text-xs">
              <label htmlFor="calc-freq" className="text-slate-300">Carrier (f)</label>
              <span className="font-mono-tabular text-cyan-300">{calcFreqMhz} MHz</span>
            </div>
            <input
              id="calc-freq"
              type="range"
              min={50}
              max={2500}
              step={10}
              value={calcFreqMhz}
              onChange={(e) => setCalcFreqMhz(Number(e.target.value))}
              className="sdr-slider mt-2 w-full"
            />
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="flex justify-between text-xs">
              <label htmlFor="calc-tx" className="text-slate-300">Tx Power</label>
              <span className="font-mono-tabular text-cyan-300">+{calcTxDbm} dBm</span>
            </div>
            <input
              id="calc-tx"
              type="range"
              min={-10}
              max={50}
              step={1}
              value={calcTxDbm}
              onChange={(e) => setCalcTxDbm(Number(e.target.value))}
              className="sdr-slider mt-2 w-full"
            />
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="flex justify-between text-xs">
              <label htmlFor="calc-offset" className="text-slate-300">Signal Offset</label>
              <span className="font-mono-tabular text-amber-300">+{calcSignalOffsetKhz} kHz</span>
            </div>
            <input
              id="calc-offset"
              type="range"
              min={0}
              max={2000}
              step={25}
              value={calcSignalOffsetKhz}
              onChange={(e) => setCalcSignalOffsetKhz(Number(e.target.value))}
              className="sdr-slider mt-2 w-full"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono-tabular">
          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="text-[11px] text-slate-400">Free-Space Path Loss</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {fspl.toFixed(2)} dB
            </div>
            <div className="text-[11px] text-slate-400">Rx = {rxPower.toFixed(1)} dBm</div>
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="text-[11px] text-slate-400">Predicted Link SNR</div>
            <div className="mt-1 text-lg font-semibold text-emerald-400">
              {linkSnr.toFixed(1)} dB
            </div>
            <div className="text-[11px] text-slate-400">kTB Floor = {noiseFloor.toFixed(1)} dBm</div>
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="text-[11px] text-slate-400">Nyquist Alias Result</div>
            <div
              className={`mt-1 text-lg font-semibold ${
                aliasCheck.isAliased ? 'text-amber-400' : 'text-cyan-300'
              }`}
            >
              {(aliasCheck.aliasedHz / 1e3).toFixed(1)} kHz
            </div>
            <div className="text-[11px] text-slate-400">
              {aliasCheck.isAliased
                ? `▲ Fold Order k=${aliasCheck.foldOrder}`
                : '● Inside Nyquist Zone'}
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-[#0B0F17] p-3">
            <div className="text-[11px] text-slate-400">ADC Dynamic Range</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {adcDynRange.toFixed(1)} dB
            </div>
            <div className="text-[11px] text-slate-400">
              {config.adcBits}-bit ({Math.pow(2, config.adcBits)} steps)
            </div>
          </div>
        </div>
      </section>

      {/* Complete Formula Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {formulas.map((f) => (
          <article
            key={f.id}
            className="rounded-md border border-slate-800 bg-[#111827] p-4"
          >
            <h3 className="text-sm font-semibold text-cyan-300">{f.title}</h3>
            <div className="mt-2 rounded border border-slate-800 bg-[#0B0F17] p-3">
              <div className="font-math text-sm italic text-slate-100">{f.equation}</div>
              <div className="mt-1 font-mono-tabular text-xs text-slate-300">
                = {f.substituted}
              </div>
              <div className="mt-1 font-mono-tabular text-xs font-semibold text-emerald-400">
                ⇒ {f.result}
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{f.explanation}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-200/90">
              <strong className="text-amber-300">Practical SDR Application:</strong>{' '}
              {f.cyberRelevance}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
