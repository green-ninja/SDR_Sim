import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheatsheetView } from './components/CheatsheetView';
import { ConstellationPanel } from './components/ConstellationPanel';
import { ControlDeck } from './components/ControlDeck';
import { CybersecurityLabView } from './components/CybersecurityLabView';
import { FormulaInspector } from './components/FormulaInspector';
import { FormulaReferenceView } from './components/FormulaReferenceView';
import { HeaderBar } from './components/HeaderBar';
import { InfoTooltip } from './components/InfoTooltip';
import { MethodMatrixView } from './components/MethodMatrixView';
import { OscilloscopeCanvas } from './components/OscilloscopeCanvas';
import { SignalChainStrip } from './components/SignalChainStrip';
import { SpectrumWaterfallCanvas } from './components/SpectrumWaterfallCanvas';
import { TutorialsView } from './components/TutorialsView';
import { formatFrequency } from './dsp/physics';
import { DEFAULT_SDR_CONFIG, SIGNAL_PRESETS } from './dsp/presets';
import { getPresetById, runSdrSimulationFrame } from './dsp/simulator';
import type { PipelineStageId, SdrConfig, SimulationFrame, WorkspaceTab } from './dsp/types';
import { useSdrAudio } from './hooks/useSdrAudio';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('workbench');
  const [selectedStage, setSelectedStage] = useState<PipelineStageId>('adc');
  const [config, setConfig] = useState<SdrConfig>(DEFAULT_SDR_CONFIG);
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('spectralab_completed_topics');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const simTimeRef = useRef(0);
  const seedRef = useRef(100);

  const [frame, setFrame] = useState<SimulationFrame>(() =>
    runSdrSimulationFrame(DEFAULT_SDR_CONFIG, 0, 100)
  );

  const activePreset = useMemo(
    () => getPresetById(config.presetId),
    [config.presetId]
  );

  const { audioEnabled, toggleAudio } = useSdrAudio(frame, config.isRunning);

  // Recompute immediately whenever configuration changes for instant tactile visual feedback
  useEffect(() => {
    setFrame(runSdrSimulationFrame(config, simTimeRef.current, seedRef.current));
  }, [config]);

  // Real-time streaming simulation loop (~20 Hz for crisp waterfall & zero UI lag)
  useEffect(() => {
    if (!config.isRunning) return;
    const intervalId = window.setInterval(() => {
      simTimeRef.current += 0.0025;
      seedRef.current = (seedRef.current + 1) % 100000;
      setFrame(runSdrSimulationFrame(config, simTimeRef.current, seedRef.current));
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [config]);

  const updateConfig = useCallback((patch: Partial<SdrConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = SIGNAL_PRESETS.find((p) => p.id === presetId) ?? SIGNAL_PRESETS[0];
    setConfig((prev) => ({
      ...prev,
      presetId: preset.id,
      centerFreqHz: preset.defaultCenterFreqHz,
      sampleRateHz: preset.defaultSampleRateHz,
      channelFilterBwHz: preset.defaultChannelBwHz,
      demodMode: preset.defaultDemodMode,
      jammerMode: 'none',
      antiAliasingFilter: true,
      iqPhaseErrorDeg: 0,
      dcOffset: 0,
    }));
  }, []);

  const handleResetDefaults = useCallback(() => {
    setConfig(DEFAULT_SDR_CONFIG);
  }, []);

  const handleApplyScenario = useCallback(
    (patch: Partial<SdrConfig>, stage?: PipelineStageId) => {
      setConfig((prev) => ({
        ...prev,
        ...patch,
        isRunning: true,
      }));
      if (stage) {
        setSelectedStage(stage);
      }
      setActiveTab('workbench');
    },
    []
  );

  const handleToggleTopicComplete = useCallback(
    (topicId: string, forceComplete?: boolean) => {
      setCompletedTopicIds((prev) => {
        const exists = prev.includes(topicId);
        let next: string[];
        if (forceComplete === true) {
          next = exists ? prev : [...prev, topicId];
        } else {
          next = exists ? prev.filter((id) => id !== topicId) : [...prev, topicId];
        }
        try {
          window.localStorage.setItem('spectralab_completed_topics', JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <HeaderBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRunning={config.isRunning}
        onToggleRunning={() => updateConfig({ isRunning: !config.isRunning })}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6">
        {activeTab === 'workbench' && (
          <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
            <ControlDeck
              config={config}
              activePreset={activePreset}
              onUpdateConfig={updateConfig}
              onSelectPreset={handleSelectPreset}
            />

            <div className="min-w-0 flex-1 space-y-3">
              {/* Workspace Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-800 bg-[#111827] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <span>
                      Tuned: <strong className="text-cyan-300">{formatFrequency(config.centerFreqHz)}</strong>
                    </span>
                    <InfoTooltip tooltipId="tunedFreq" />
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Nyquist: ±{(frame.metrics.nyquistFreqHz / 1e3).toFixed(0)} kHz</span>
                    <InfoTooltip tooltipId="nyquistSpan" />
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Δf: {frame.metrics.binResolutionHz.toFixed(1)} Hz</span>
                    <InfoTooltip tooltipId="binResolution" />
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span>SNR_q: {frame.metrics.quantizationSnrDb.toFixed(1)} dB</span>
                    <InfoTooltip tooltipId="quantizationSnr" />
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={config.showFormulae}
                    onClick={() => updateConfig({ showFormulae: !config.showFormulae })}
                    className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      config.showFormulae
                        ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-700 bg-[#0B0F17] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {config.showFormulae ? 'Formulae: Visible' : 'Show Formulae'}
                  </button>

                  <button
                    type="button"
                    aria-pressed={audioEnabled}
                    onClick={toggleAudio}
                    className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      audioEnabled
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 bg-[#0B0F17] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {audioEnabled ? 'Audio Demod: On' : 'Audio Demod: Off'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="rounded border border-slate-700 bg-[#0B0F17] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* 5-Stage Interactive Signal Flow Strip */}
              <SignalChainStrip
                config={config}
                frame={frame}
                selectedStage={selectedStage}
                onSelectStage={(stage) => {
                  setSelectedStage(stage);
                  if (!config.showFormulae) {
                    updateConfig({ showFormulae: true });
                  }
                }}
              />

              {/* Primary Visualization: RF Spectrum + Waterfall */}
              <SpectrumWaterfallCanvas
                config={config}
                frame={frame}
                emitters={activePreset.emitters}
                onTuneFrequency={(freq) => updateConfig({ centerFreqHz: freq })}
              />

              {/* Secondary Visualizers: Oscilloscope + Constellation/Decoder */}
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <OscilloscopeCanvas config={config} frame={frame} />
                <ConstellationPanel frame={frame} />
              </div>

              {/* Live Formula Inspector */}
              {config.showFormulae && (
                <FormulaInspector
                  config={config}
                  frame={frame}
                  selectedStage={selectedStage}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'tutorials' && (
          <TutorialsView
            completedTopicIds={completedTopicIds}
            onToggleTopicComplete={handleToggleTopicComplete}
            onLaunchLab={handleApplyScenario}
          />
        )}

        {activeTab === 'methods' && (
          <MethodMatrixView onApplyDemo={handleApplyScenario} />
        )}

        {activeTab === 'cybersecurity' && (
          <CybersecurityLabView onLaunchScenario={handleApplyScenario} />
        )}

        {activeTab === 'formulae' && (
          <FormulaReferenceView config={config} frame={frame} />
        )}

        {activeTab === 'cheatsheet' && <CheatsheetView />}
      </main>
    </div>
  );
}
