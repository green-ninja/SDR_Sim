import { formatBandwidth, formatFrequency } from '../dsp/physics';
import type { PipelineStageId, SdrConfig, SimulationFrame } from '../dsp/types';
import type { WorkbenchTooltipId } from '../dsp/workbenchTooltips';
import { InfoTooltip } from './InfoTooltip';

interface SignalChainStripProps {
  config: SdrConfig;
  frame: SimulationFrame;
  selectedStage: PipelineStageId;
  onSelectStage: (stage: PipelineStageId) => void;
}

export function SignalChainStrip({
  config,
  frame,
  selectedStage,
  onSelectStage,
}: SignalChainStripProps) {
  const { metrics } = frame;

  const stages: Array<{
    id: PipelineStageId;
    tooltipId: WorkbenchTooltipId;
    step: string;
    title: string;
    value: string;
    statusText: string;
    statusTone: 'nominal' | 'warning' | 'critical';
  }> = [
    {
      id: 'antenna',
      tooltipId: 'stageAntenna',
      step: '01',
      title: 'RF Antenna & Path',
      value: `Rx ${metrics.receivedPowerDbm.toFixed(1)} dBm`,
      statusText: `● FSPL ${metrics.fsplDb.toFixed(1)} dB`,
      statusTone: 'nominal',
    },
    {
      id: 'lna_mixer',
      tooltipId: 'stageLnaMixer',
      step: '02',
      title: 'LNA & I/Q Mixer',
      value: formatFrequency(config.centerFreqHz),
      statusText:
        config.iqPhaseErrorDeg !== 0 || config.iqGainImbalance !== 0
          ? `▲ I/Q Skew ${config.iqPhaseErrorDeg}°`
          : `● Gain +${config.rfGainDb} dB`,
      statusTone:
        config.iqPhaseErrorDeg !== 0 || config.iqGainImbalance !== 0 ? 'warning' : 'nominal',
    },
    {
      id: 'adc',
      tooltipId: 'stageAdc',
      step: '03',
      title: 'ADC & Sampling',
      value: `${config.adcBits}-bit · ${(config.sampleRateHz / 1e6).toFixed(2)} MS/s`,
      statusText: metrics.isClipping
        ? '✖ ADC Clipping'
        : metrics.aliasingCount > 0
          ? `▲ ${metrics.aliasingCount} Aliased`
          : '● Nyquist OK',
      statusTone: metrics.isClipping
        ? 'critical'
        : metrics.aliasingCount > 0
          ? 'warning'
          : 'nominal',
    },
    {
      id: 'ddc_filter',
      tooltipId: 'stageDdc',
      step: '04',
      title: 'DDC & Channel LPF',
      value: `BW ${formatBandwidth(config.channelFilterBwHz)}`,
      statusText: `● Δf ${metrics.binResolutionHz.toFixed(0)} Hz`,
      statusTone: 'nominal',
    },
    {
      id: 'demod',
      tooltipId: 'stageDemod',
      step: '05',
      title: 'Demodulator',
      value: metrics.activeEmitter?.modulation ?? config.demodMode,
      statusText:
        frame.packetIntegrity === 'JAMMED'
          ? '✖ Jammed'
          : frame.packetIntegrity === 'DEGRADED'
            ? '▲ High BER'
            : frame.packetIntegrity === 'LOCKED'
              ? '● Frame Locked'
              : '● Demodulating',
      statusTone:
        frame.packetIntegrity === 'JAMMED'
          ? 'critical'
          : frame.packetIntegrity === 'DEGRADED'
            ? 'warning'
            : 'nominal',
    },
  ];

  return (
    <div
      role="region"
      aria-label="SDR Signal Processing Pipeline Stages"
      className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5"
    >
      {stages.map((stage) => {
        const isSelected = selectedStage === stage.id;
        const toneClass =
          stage.statusTone === 'critical'
            ? 'text-rose-400'
            : stage.statusTone === 'warning'
              ? 'text-amber-400'
              : 'text-emerald-400';

        return (
          <div
            key={stage.id}
            className="relative flex min-w-[170px] shrink-0 sm:min-w-0"
          >
            <button
              type="button"
              onClick={() => onSelectStage(stage.id)}
              aria-pressed={isSelected}
              className={`flex w-full flex-col items-start justify-between rounded-md border px-3 py-2.5 pr-8 text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isSelected
                  ? 'border-cyan-500/70 bg-[#131C2B]'
                  : 'border-slate-800 bg-[#111827] hover:border-slate-700'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-mono-tabular font-medium text-slate-300">
                  {stage.step}. {stage.title}
                </span>
              </div>
              <div className="mt-1 font-mono-tabular text-sm font-semibold text-slate-100 truncate w-full">
                {stage.value}
              </div>
              <div className={`mt-1 font-mono-tabular text-xs ${toneClass}`}>
                {stage.statusText}
              </div>
            </button>
            <div className="absolute right-2.5 top-2.5 z-10">
              <InfoTooltip tooltipId={stage.tooltipId} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
