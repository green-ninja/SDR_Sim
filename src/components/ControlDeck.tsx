import { formatBandwidth, formatFrequency } from '../dsp/physics';
import { SIGNAL_PRESETS } from '../dsp/presets';
import type {
  DemodulatorMode,
  JammerMode,
  SdrConfig,
  SignalPreset,
  WindowFunction,
} from '../dsp/types';

interface ControlDeckProps {
  config: SdrConfig;
  activePreset: SignalPreset;
  onUpdateConfig: (patch: Partial<SdrConfig>) => void;
  onSelectPreset: (presetId: string) => void;
}

export function ControlDeck({
  config,
  activePreset,
  onUpdateConfig,
  onSelectPreset,
}: ControlDeckProps) {
  const minFreqHz = activePreset.defaultCenterFreqHz - 1_200_000;
  const maxFreqHz = activePreset.defaultCenterFreqHz + 1_200_000;

  return (
    <aside
      aria-label="SDR Receiver and Channel Parameters"
      className="w-full shrink-0 space-y-4 rounded-md border border-slate-800 bg-[#111827] p-4 lg:w-[350px]"
    >
      {/* 1. RF Environment Preset */}
      <div>
        <label
          htmlFor="preset-select"
          className="block text-xs font-semibold text-slate-200"
        >
          RF Signal Environment
        </label>
        <select
          id="preset-select"
          value={config.presetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="mt-1.5 w-full rounded border border-slate-700 bg-[#0B0F17] px-2.5 py-2 text-xs font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {SIGNAL_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          {activePreset.summary}
        </p>

        {/* Quick-tune buttons for emitters in this band */}
        <div className="mt-2.5">
          <div className="text-[11px] font-medium text-slate-400">
            Tune Directly to Emitter
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {activePreset.emitters.map((emitter) => {
              const isTuned = Math.abs(config.centerFreqHz - emitter.freqHz) < 5000;
              return (
                <button
                  key={emitter.id}
                  type="button"
                  onClick={() => onUpdateConfig({ centerFreqHz: emitter.freqHz })}
                  className={`rounded border px-2 py-1 text-[11px] font-mono-tabular transition-colors whitespace-nowrap shrink-0 ${
                    isTuned
                      ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 bg-[#0B0F17] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {(emitter.freqHz / 1e6).toFixed(3)} MHz · {emitter.modulation}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 2. RF Front-End & Tuning */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-100">
          RF Front-End & Local Oscillator
        </h2>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="center-freq-slider" className="text-slate-300">
              Center Frequency (f_c)
            </label>
            <span className="font-mono-tabular font-semibold text-cyan-300">
              {formatFrequency(config.centerFreqHz)}
            </span>
          </div>
          <input
            id="center-freq-slider"
            type="range"
            min={minFreqHz}
            max={maxFreqHz}
            step={5000}
            value={config.centerFreqHz}
            onChange={(e) => onUpdateConfig({ centerFreqHz: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="rf-gain-slider" className="text-slate-300">
              LNA RF Gain
            </label>
            <span className="font-mono-tabular font-semibold text-slate-100">
              +{config.rfGainDb} dB
            </span>
          </div>
          <input
            id="rf-gain-slider"
            type="range"
            min={0}
            max={60}
            step={1}
            value={config.rfGainDb}
            onChange={(e) => onUpdateConfig({ rfGainDb: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 3. ADC & Sampling Physics */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-100">
          ADC & Nyquist Sampling
        </h2>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="sample-rate-slider" className="text-slate-300">
              Sample Rate (f_s)
            </label>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {(config.sampleRateHz / 1e3).toFixed(0)} kS/s
            </span>
          </div>
          <input
            id="sample-rate-slider"
            type="range"
            min={200_000}
            max={2_400_000}
            step={50_000}
            value={config.sampleRateHz}
            onChange={(e) => onUpdateConfig({ sampleRateHz: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="adc-bits-slider" className="text-slate-300">
              ADC Resolution (N bits)
            </label>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {config.adcBits}-bit
            </span>
          </div>
          <input
            id="adc-bits-slider"
            type="range"
            min={4}
            max={16}
            step={1}
            value={config.adcBits}
            onChange={(e) => onUpdateConfig({ adcBits: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded border border-slate-800 bg-[#0B0F17] px-3 py-2 text-xs">
          <span className="text-slate-200">Analog Anti-Aliasing Filter</span>
          <input
            type="checkbox"
            checked={config.antiAliasingFilter}
            onChange={(e) => onUpdateConfig({ antiAliasingFilter: e.target.checked })}
            className="h-4 w-4 accent-cyan-500"
          />
        </label>
      </div>

      <hr className="border-slate-800" />

      {/* 4. DDC, FFT & Demodulator */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-100">
          DDC Filter, FFT & Demodulation
        </h2>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="filter-bw-slider" className="text-slate-300">
              Channel Filter BW
            </label>
            <span className="font-mono-tabular font-semibold text-cyan-300">
              {formatBandwidth(config.channelFilterBwHz)}
            </span>
          </div>
          <input
            id="filter-bw-slider"
            type="range"
            min={20_000}
            max={400_000}
            step={5_000}
            value={config.channelFilterBwHz}
            onChange={(e) => onUpdateConfig({ channelFilterBwHz: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="fft-size-select" className="block text-[11px] text-slate-400">
              FFT Size (N)
            </label>
            <select
              id="fft-size-select"
              value={config.fftSize}
              onChange={(e) => onUpdateConfig({ fftSize: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-slate-700 bg-[#0B0F17] px-2 py-1.5 font-mono-tabular text-xs text-slate-100"
            >
              <option value={256}>256</option>
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
            </select>
          </div>

          <div>
            <label htmlFor="window-select" className="block text-[11px] text-slate-400">
              FFT Window
            </label>
            <select
              id="window-select"
              value={config.windowFunction}
              onChange={(e) =>
                onUpdateConfig({ windowFunction: e.target.value as WindowFunction })
              }
              className="mt-1 w-full rounded border border-slate-700 bg-[#0B0F17] px-2 py-1.5 text-xs text-slate-100"
            >
              <option value="hann">Hann</option>
              <option value="hamming">Hamming</option>
              <option value="blackmanHarris">Blackman-Harris</option>
              <option value="rectangular">Rectangular</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="demod-select" className="block text-[11px] text-slate-400">
              Demodulator
            </label>
            <select
              id="demod-select"
              value={config.demodMode}
              onChange={(e) =>
                onUpdateConfig({ demodMode: e.target.value as DemodulatorMode })
              }
              className="mt-1 w-full rounded border border-slate-700 bg-[#0B0F17] px-2 py-1.5 text-xs text-slate-100"
            >
              <option value="AUTO">Auto (Match)</option>
              <option value="AM">AM Envelope</option>
              <option value="FM">FM Polar</option>
              <option value="OOK">OOK / ASK</option>
              <option value="FSK">FSK Shift</option>
              <option value="PSK">BPSK / QPSK</option>
              <option value="QAM16">16-QAM</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="squelch-slider" className="text-slate-400">
                Squelch
              </label>
              <span className="font-mono-tabular text-amber-300">
                {config.squelchDb} dBFS
              </span>
            </div>
            <input
              id="squelch-slider"
              type="range"
              min={-110}
              max={-20}
              step={1}
              value={config.squelchDb}
              onChange={(e) => onUpdateConfig({ squelchDb: Number(e.target.value) })}
              className="sdr-slider mt-2.5 w-full"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 5. Channel Impairments & Cybersecurity Threats */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-100">
          Channel Noise, I/Q Skew & RF Threats
        </h2>

        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="snr-slider" className="text-slate-300">
              Channel SNR (AWGN)
            </label>
            <span className="font-mono-tabular font-semibold text-slate-100">
              {config.snrDb} dB
            </span>
          </div>
          <input
            id="snr-slider"
            type="range"
            min={-4}
            max={40}
            step={1}
            value={config.snrDb}
            onChange={(e) => onUpdateConfig({ snrDb: Number(e.target.value) })}
            className="sdr-slider mt-1.5 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="iq-phase-slider" className="text-slate-400">
                I/Q Phase Err
              </label>
              <span className="font-mono-tabular text-slate-200">
                {config.iqPhaseErrorDeg}°
              </span>
            </div>
            <input
              id="iq-phase-slider"
              type="range"
              min={-25}
              max={25}
              step={1}
              value={config.iqPhaseErrorDeg}
              onChange={(e) => onUpdateConfig({ iqPhaseErrorDeg: Number(e.target.value) })}
              className="sdr-slider mt-1.5 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="dc-offset-slider" className="text-slate-400">
                DC Offset
              </label>
              <span className="font-mono-tabular text-slate-200">
                {config.dcOffset.toFixed(2)}
              </span>
            </div>
            <input
              id="dc-offset-slider"
              type="range"
              min={0}
              max={0.25}
              step={0.01}
              value={config.dcOffset}
              onChange={(e) => onUpdateConfig({ dcOffset: Number(e.target.value) })}
              className="sdr-slider mt-1.5 w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="jammer-select" className="block text-xs text-slate-300">
            Adversarial Jammer / Spoof Injection
          </label>
          <select
            id="jammer-select"
            value={config.jammerMode}
            onChange={(e) => onUpdateConfig({ jammerMode: e.target.value as JammerMode })}
            className="mt-1.5 w-full rounded border border-slate-700 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100"
          >
            <option value="none">None (Clean RF Channel)</option>
            <option value="cw_tone">CW Narrowband Tone Jammer</option>
            <option value="barrage_noise">Wideband Barrage Noise Jammer</option>
            <option value="replay_spoof">Replay / Rogue Frame Spoofer</option>
          </select>
        </div>

        {config.jammerMode !== 'none' && (
          <div className="space-y-2 rounded border border-rose-500/30 bg-rose-950/20 p-2.5">
            {config.jammerMode === 'cw_tone' && (
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="jammer-offset-slider" className="text-rose-200">
                    Jammer Offset from f_c
                  </label>
                  <span className="font-mono-tabular text-rose-300">
                    {(config.jammerOffsetHz / 1e3).toFixed(0)} kHz
                  </span>
                </div>
                <input
                  id="jammer-offset-slider"
                  type="range"
                  min={-250_000}
                  max={250_000}
                  step={5_000}
                  value={config.jammerOffsetHz}
                  onChange={(e) => onUpdateConfig({ jammerOffsetHz: Number(e.target.value) })}
                  className="sdr-slider mt-1 w-full"
                />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="jammer-power-slider" className="text-rose-200">
                  Jammer Power
                </label>
                <span className="font-mono-tabular text-rose-300">
                  {config.jammerPowerDbm} dBm
                </span>
              </div>
              <input
                id="jammer-power-slider"
                type="range"
                min={-45}
                max={0}
                step={1}
                value={config.jammerPowerDbm}
                onChange={(e) => onUpdateConfig({ jammerPowerDbm: Number(e.target.value) })}
                className="sdr-slider mt-1 w-full"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
