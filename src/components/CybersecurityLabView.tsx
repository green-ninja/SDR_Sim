import type { SdrConfig } from '../dsp/types';

interface CybersecurityLabViewProps {
  onLaunchScenario: (patch: Partial<SdrConfig>) => void;
}

interface CyberScenario {
  id: string;
  title: string;
  threatClass: string;
  physicsMechanism: string;
  stepsToObserve: string[];
  configPatch: Partial<SdrConfig>;
}

const CYBER_SCENARIOS: CyberScenario[] = [
  {
    id: 'ook_sniffing',
    title: '01. Sub-GHz Keyfob Sniffing & Envelope Extraction',
    threatClass: 'Passive Eavesdropping & Replay',
    physicsMechanism:
      'Fixed-code and legacy 433.92 MHz OOK transmitters encode bits purely as presence/absence of RF carrier power. A quadrature SDR computes instantaneous amplitude √(I² + Q²) to recover raw hex frames without needing carrier phase lock.',
    stepsToObserve: [
      'Inspect the OOK pulse train in the Time-Domain Oscilloscope (switch to Demod m(t)).',
      'Watch the Decoded Payload panel lock onto bytes 4B 45 59 31 ("KEY1").',
      'Lower Channel SNR below 6 dB to see bit flips and BER rise.',
    ],
    configPatch: {
      presetId: 'iot_433',
      centerFreqHz: 433_920_000,
      sampleRateHz: 1_000_000,
      channelFilterBwHz: 120_000,
      demodMode: 'OOK',
      jammerMode: 'none',
      snrDb: 24,
      rfGainDb: 28,
      antiAliasingFilter: true,
      iqPhaseErrorDeg: 0,
    },
  },
  {
    id: 'cw_jamming_defense',
    title: '02. Narrowband CW Jamming vs. DDC Channel Filtering',
    threatClass: 'Denial of Service & Anti-Jam DSP',
    physicsMechanism:
      'An attacker transmits an unmodulated CW tone +45 kHz adjacent to the 433.92 MHz receiver. While inside the 120 kHz passband, the jammer overwhelms the bit slicer. Tightening the digital windowed-sinc LPF below ±45 kHz (BW < 80 kHz) mathematically rejects the jammer.',
    stepsToObserve: [
      'Notice the red CW JAMMER spike inside the shaded cyan passband and JAMMED decoder status.',
      'Drag Channel Filter BW down from 140 kHz to 60 kHz in the Workbench.',
      'Watch the shaded passband exclude the jammer and packet integrity flip back to ● LOCKED.',
    ],
    configPatch: {
      presetId: 'iot_433',
      centerFreqHz: 433_920_000,
      sampleRateHz: 1_000_000,
      channelFilterBwHz: 140_000,
      demodMode: 'OOK',
      jammerMode: 'cw_tone',
      jammerOffsetHz: 45_000,
      jammerPowerDbm: -20,
      snrDb: 22,
      rfGainDb: 28,
      antiAliasingFilter: true,
    },
  },
  {
    id: 'adc_desensitization',
    title: '03. ADC Saturation & LNA Desensitization Attack',
    threatClass: 'Front-End Overload / Harmonic Distortion',
    physicsMechanism:
      'Even if a jammer sits far outside your digital channel filter, excessive RF power + LNA gain drives the physical ADC past ±1.0 full-scale. Hard clipping creates odd-order intermodulation harmonics across the entire FFT spectrum.',
    stepsToObserve: [
      'Notice the ✖ ADC Clipping alert in Stage 03 and flat-topped waveforms in ADC Raw scope.',
      'Reduce LNA RF Gain from +50 dB back toward +24 dB to restore linear headroom.',
      'Observe how dynamic range scales with ADC bit depth (SNR_q = 6.02N + 1.76 dB).',
    ],
    configPatch: {
      presetId: 'iot_433',
      centerFreqHz: 433_920_000,
      sampleRateHz: 1_000_000,
      channelFilterBwHz: 100_000,
      rfGainDb: 50,
      adcBits: 8,
      jammerMode: 'cw_tone',
      jammerOffsetHz: 180_000,
      jammerPowerDbm: -12,
      antiAliasingFilter: true,
    },
  },
  {
    id: 'aliasing_ghosts',
    title: '04. Sub-Nyquist Aliasing & Spectral Ghosting',
    threatClass: 'Forensic Misattribution & Hardware Artifact',
    physicsMechanism:
      'Without an analog anti-aliasing low-pass filter, an out-of-band transmitter at +700 kHz offset (434.62 MHz pager) sampled at 1.0 MS/s folds back across the Nyquist boundary (±500 kHz) and masquerades as a phantom emitter at −300 kHz.',
    stepsToObserve: [
      'See the amber ▲ ALIAS warning marker at −300 kHz in the Spectrum.',
      'Toggle Analog Anti-Aliasing Filter ON or raise Sample Rate above 1.6 MS/s.',
      'Verify whether a mystery signal is real or an alias by changing Sample Rate (aliases move!).',
    ],
    configPatch: {
      presetId: 'iot_433',
      centerFreqHz: 433_920_000,
      sampleRateHz: 1_000_000,
      channelFilterBwHz: 120_000,
      antiAliasingFilter: false,
      jammerMode: 'none',
      rfGainDb: 28,
      iqPhaseErrorDeg: 0,
    },
  },
  {
    id: 'iq_image_artifact',
    title: '05. I/Q Quadrature Imbalance & Mirror Ghosting',
    threatClass: 'Hardware Imperfection & False Emitter Detection',
    physicsMechanism:
      'If the hardware quadrature mixer has phase error Δφ ≠ 0° between Cosine (I) and Sine (Q) branches, e^(+jωt) and e^(−jωt) fail to cancel orthogonally. Every real signal spawns an inverted mirror image at −f_offset.',
    stepsToObserve: [
      'Inspect the tilted ellipse in the I/Q Constellation and mirror peak across center frequency.',
      'Return I/Q Phase Err to 0° to collapse the false image.',
    ],
    configPatch: {
      presetId: 'ism_2400',
      centerFreqHz: 2_440_000_000,
      sampleRateHz: 1_000_000,
      channelFilterBwHz: 180_000,
      iqPhaseErrorDeg: 20,
      dcOffset: 0.1,
      jammerMode: 'none',
      antiAliasingFilter: true,
      rfGainDb: 28,
    },
  },
  {
    id: 'adsb_spoofing',
    title: '06. 1090 MHz ADS-B Frame Spoofing Simulation',
    threatClass: 'Unauthenticated Broadcast Injection',
    physicsMechanism:
      'Civil aircraft broadcast unencrypted Mode-S / ADS-B squitters at 1090 MHz. An SDR can inject competing synthetic frames on the same channel, colliding with legitimate transponders unless multi-station TDOA (Δt = Δd/c) validates physical origin.',
    stepsToObserve: [
      'Observe overlapping spoof collisions in the ADS-B OOK pulse stream and JAMMED state.',
      'Toggle Adversarial Jammer back to None to watch clean DF17 payload 41 44 53 42 ("ADSB") lock.',
    ],
    configPatch: {
      presetId: 'adsb_1090',
      centerFreqHz: 1_090_000_000,
      sampleRateHz: 2_000_000,
      channelFilterBwHz: 350_000,
      demodMode: 'OOK',
      jammerMode: 'replay_spoof',
      jammerPowerDbm: -20,
      antiAliasingFilter: true,
      rfGainDb: 28,
    },
  },
];

export function CybersecurityLabView({ onLaunchScenario }: CybersecurityLabViewProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
          RF Cybersecurity & Threat Simulation Lab
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          Launch interactive RF attack and defensive DSP scenarios directly into the live SDR workbench to observe how physical-layer phenomena govern jamming, spoofing, eavesdropping, and hardware artifacts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CYBER_SCENARIOS.map((sc) => (
          <article
            key={sc.id}
            className="flex flex-col justify-between rounded-md border border-slate-800 bg-[#111827] p-5"
          >
            <div>
              <div className="text-xs font-mono-tabular text-amber-300">
                {sc.threatClass}
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-100">
                {sc.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {sc.physicsMechanism}
              </p>

              <div className="mt-3 rounded border border-slate-800 bg-[#0B0F17] p-3">
                <div className="text-[11px] font-semibold text-slate-300">
                  Interactive Lab Steps
                </div>
                <ol className="mt-1.5 space-y-1 text-xs text-slate-300 list-decimal list-inside">
                  {sc.stepsToObserve.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => onLaunchScenario(sc.configPatch)}
                className="rounded border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
              >
                Launch Scenario in Workbench
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
