export interface WorkbenchTooltipInfo {
  id: string;
  title: string;
  role: string;
  summary: string;
  formula?: string;
  experimentTip: string;
}

export const WORKBENCH_TOOLTIPS = {
  // Toolbar metrics
  tunedFreq: {
    id: 'tunedFreq',
    title: 'Tuned Center Frequency (f_c)',
    role: 'Local Oscillator Target',
    summary:
      'The RF frequency mixed down to 0 Hz baseband. Signals within ±f_s/2 around f_c appear inside your visible waterfall span.',
    formula: 'f_baseband = f_RF − f_c',
    experimentTip: 'Click any peak in the spectrum plot or adjust Center Frequency to center a signal.',
  },
  nyquistSpan: {
    id: 'nyquistSpan',
    title: 'Complex Nyquist Span (±f_s/2)',
    role: 'Unambiguous Capture Bandwidth',
    summary:
      'With complex I/Q sampling, the SDR sees frequencies from −f_s/2 below f_c to +f_s/2 above f_c without mirror ambiguity.',
    formula: 'Span = f_s  (−f_s/2 to +f_s/2)',
    experimentTip: 'Lower Sample Rate to zoom in on a narrow channel, or raise it to watch multiple emitters.',
  },
  binResolution: {
    id: 'binResolution',
    title: 'FFT Bin Resolution (Δf)',
    role: 'Spectral Granularity',
    summary:
      'Width in Hz of each frequency bin in the spectrum display. Smaller Δf sharpens narrow tones and increases FFT processing gain.',
    formula: 'Δf = f_s / N_FFT',
    experimentTip: 'Increase FFT Size (N) to separate closely spaced tones or lift weak signals above noise.',
  },
  quantizationSnr: {
    id: 'quantizationSnr',
    title: 'ADC Quantization SNR (SNR_q)',
    role: 'Theoretical Dynamic Range',
    summary:
      'Maximum signal-to-quantization-noise ratio set by the ADC bit depth. Every additional bit adds ~6.02 dB of dynamic range.',
    formula: 'SNR_q = 6.02·N + 1.76 dB',
    experimentTip: 'Drop ADC Resolution to 4–6 bits to watch the quantization noise floor rise.',
  },

  // Signal Chain Stages
  stageAntenna: {
    id: 'stageAntenna',
    title: '01 · RF Antenna & Propagation Path',
    role: 'Physical Layer Capture',
    summary:
      'Converts electromagnetic waves into microvolt currents after suffering Free-Space Path Loss (FSPL) and picking up thermal kTB noise.',
    formula: 'FSPL = 20·log₁₀(d) + 20·log₁₀(f) − 147.55 dB',
    experimentTip: 'Switch RF Signal Environments to compare strong local signals against weak distant transmitters.',
  },
  stageLnaMixer: {
    id: 'stageLnaMixer',
    title: '02 · LNA & Quadrature I/Q Mixer',
    role: 'Analog Amplification & Downconversion',
    summary:
      'Boosts weak RF with a Low-Noise Amplifier, then mixes against 0° and 90° Local Oscillator tones to produce complex I(t) + jQ(t) baseband.',
    formula: 'x_BB(t) = x_RF(t) · e^(−j2πf_c t)',
    experimentTip: 'Add I/Q Phase Err or DC Offset to see mirror-image ghost peaks and a 0 Hz center spike.',
  },
  stageAdc: {
    id: 'stageAdc',
    title: '03 · ADC & Nyquist Sampling',
    role: 'Analog-to-Digital Conversion',
    summary:
      'Samples continuous I/Q voltages at rate f_s and quantizes them into N-bit numbers. Out-of-band energy folds back unless filtered first.',
    formula: 'f_alias = |f_offset − k·f_s|',
    experimentTip: 'Disable the Anti-Aliasing Filter or crank LNA Gain above +45 dB to observe aliasing and clipping.',
  },
  stageDdc: {
    id: 'stageDdc',
    title: '04 · DDC & Channel Low-Pass Filter',
    role: 'Digital Channel Isolation',
    summary:
      'Applies a windowed-sinc FIR low-pass filter around 0 Hz to isolate the target channel and reject adjacent emitters or narrowband jammers.',
    formula: 'Passband = f_c ± (BW_ch / 2)',
    experimentTip: 'Inject a CW Tone Jammer at +90 kHz, then narrow Channel Filter BW below 100 kHz to excise it.',
  },
  stageDemod: {
    id: 'stageDemod',
    title: '05 · Baseband Demodulator & Bit Slicer',
    role: 'Information Recovery',
    summary:
      'Extracts audio or digital symbols from filtered I/Q samples using envelope (AM/OOK), polar phase delta (FM/FSK), or constellation mapping (PSK/QAM).',
    formula: 'P_b ≈ ½·erfc(√(E_b / N₀))',
    experimentTip: 'Watch the Constellation & Bitstream panel lock or degrade as you vary Channel SNR.',
  },

  // ControlDeck Controls
  presetEnv: {
    id: 'presetEnv',
    title: 'RF Signal Environment',
    role: 'Simulated Band Scenario',
    summary:
      'Selects a multi-emitter RF band (ISM 433 MHz, VHF Airband, FM Broadcast, LoRa CSS, or ADS-B) with realistic carrier frequencies and modulations.',
    experimentTip: 'Use the quick-tune emitter buttons underneath to snap directly to any transmitter in the band.',
  },
  centerFreq: {
    id: 'centerFreq',
    title: 'Center Frequency (f_c)',
    role: 'LO Frequency Tuning',
    summary:
      'Steers the receiver Local Oscillator across the band, shifting which transmitter sits at 0 Hz baseband inside the DDC channel filter.',
    formula: 'λ = c / f_c',
    experimentTip: 'Notice how moving f_c shifts signals across the FFT spectrum without changing their true RF frequencies.',
  },
  rfGain: {
    id: 'rfGain',
    title: 'LNA RF Gain (+dB)',
    role: 'Front-End Sensitivity vs. Headroom',
    summary:
      'Amplifies incoming signals before the ADC. Too little gain buries weak emitters in quantization noise; too much gain clips the ADC at ±1.0.',
    formula: 'V_ADC = V_antenna · 10^(Gain_dB / 20)',
    experimentTip: 'Switch the Oscilloscope to "ADC Raw" and raise RF Gain to see flat-topped waveform clipping and harmonic spurs.',
  },
  sampleRate: {
    id: 'sampleRate',
    title: 'Sample Rate (f_s)',
    role: 'ADC Sampling Speed & Span',
    summary:
      'Sets how many complex I/Q samples per second the ADC captures, directly setting the total visible RF span (−f_s/2 to +f_s/2).',
    formula: 'f_Nyquist = ±f_s / 2',
    experimentTip: 'With Anti-Aliasing off, change f_s and watch aliased ghost peaks jump to new frequencies while real signals stay put.',
  },
  adcBits: {
    id: 'adcBits',
    title: 'ADC Bit Depth (N bits)',
    role: 'Amplitude Quantization Precision',
    summary:
      'Determines how many discrete voltage levels (2^N) represent each sample. Higher bit depth lowers the quantization noise floor.',
    formula: 'Levels = 2^N  |  SNR_q = 6.02·N + 1.76 dB',
    experimentTip: 'Compare 4-bit (harsh stair-stepped quantization) against 16-bit precision.',
  },
  antiAliasing: {
    id: 'antiAliasing',
    title: 'Analog Anti-Aliasing Filter (AAF)',
    role: 'Pre-ADC Out-of-Band Rejection',
    summary:
      'An analog filter placed before the ADC that attenuates signals outside ±f_s/2 so they cannot fold back into baseband during sampling.',
    experimentTip: 'Uncheck this in a multi-emitter band with a narrower Sample Rate to observe real Nyquist fold-back aliasing.',
  },
  channelFilterBw: {
    id: 'channelFilterBw',
    title: 'Channel Filter Bandwidth (BW_ch)',
    role: 'DDC Selectivity',
    summary:
      'Controls the shaded cyan passband in the spectrum plot. Only frequencies inside ±BW_ch/2 reach the demodulator and constellation.',
    formula: 'Carson FM BW ≈ 2·(Δf + f_m)',
    experimentTip: 'Too narrow clips modulated sidebands; too wide lets adjacent signals and jammers through.',
  },
  fftSize: {
    id: 'fftSize',
    title: 'FFT Size (N_FFT)',
    role: 'Frequency vs. Time Tradeoff',
    summary:
      'Number of complex samples per Fourier Transform. Larger N yields finer bin resolution (Δf) and +3 dB per doubling against wideband noise.',
    formula: 'Δf = f_s / N_FFT',
    experimentTip: 'Raise N to 2048 to spot narrow CW tones or inspect fine sideband structure.',
  },
  fftWindow: {
    id: 'fftWindow',
    title: 'FFT Window Function',
    role: 'Spectral Leakage Suppression',
    summary:
      'Multiplies time blocks by a smooth taper (Hann, Hamming, Blackman-Harris) before FFT to suppress sidelobe leakage around strong peaks.',
    experimentTip: 'Switch to Rectangular to see wide spectral skirts spill across neighboring bins.',
  },
  demodMode: {
    id: 'demodMode',
    title: 'Demodulator Mode',
    role: 'Signal Extraction Algorithm',
    summary:
      'Chooses how baseband I/Q is converted into audio or bits. Auto matches the tuned emitter; manual modes let you test demodulator mismatches.',
    experimentTip: 'Try demodulating an FM or PSK signal with AM Envelope to see why modulation matching matters.',
  },
  squelch: {
    id: 'squelch',
    title: 'Squelch Threshold (dBFS)',
    role: 'Noise Gate & Mute Control',
    summary:
      'Mutes audio and decoder output whenever peak channel power falls below the amber dashed threshold line.',
    experimentTip: 'Set squelch just above the noise floor so idle static stays silent while valid bursts open cleanly.',
  },
  channelSnr: {
    id: 'channelSnr',
    title: 'Channel SNR (AWGN)',
    role: 'Thermal & Atmospheric Noise',
    summary:
      'Controls Additive White Gaussian Noise added over the wireless channel. Lower SNR scatters constellation points and increases Bit Error Rate.',
    formula: 'EVM_rms ≈ 10^(−SNR_dB / 20)',
    experimentTip: 'Lower SNR toward 4 dB and compare how BPSK survives far better than dense 16-QAM.',
  },
  iqPhaseError: {
    id: 'iqPhaseError',
    title: 'I/Q Quadrature Phase Error',
    role: 'Hardware Mixer Imbalance',
    summary:
      'Simulates a mixer whose I and Q branches deviate from an exact 90° offset, causing positive and negative frequencies to mirror across 0 Hz.',
    experimentTip: 'Shift an off-center tone and add +15° I/Q error to see a phantom image appear on the opposite side.',
  },
  dcOffset: {
    id: 'dcOffset',
    title: 'DC Offset Bias',
    role: 'LO Leakage Impairment',
    summary:
      'Adds a constant voltage bias to the I/Q stream, mimicking Local Oscillator self-mixing in direct-conversion SDR hardware.',
    experimentTip: 'Increase DC Offset above 0.05 and observe the persistent spike at the exact center (0 Hz) bin.',
  },
  jammerMode: {
    id: 'jammerMode',
    title: 'Adversarial Jammer / Spoof Injection',
    role: 'RF Cybersecurity Threat Lab',
    summary:
      'Injects physical-layer attacks: a CW tone jammer, wideband barrage noise, or an unauthenticated replay/spoof frame onto the channel.',
    experimentTip: 'Test whether narrowing Channel Filter BW defeats a CW offset jammer versus a wideband barrage jammer.',
  },

  // Visualization Panels
  spectrumPanel: {
    id: 'spectrumPanel',
    title: 'RF Spectrum & Waterfall Spectrogram',
    role: 'Frequency & Time-Frequency View',
    summary:
      'Top plot shows instantaneous power (dBFS) across frequency; bottom waterfall scrolls historical FFTs downward so bursts and chirps stand out.',
    experimentTip: 'Hover to measure exact frequency/dBFS at the crosshair, or click anywhere on the plot to tune there.',
  },
  oscilloscopePanel: {
    id: 'oscilloscopePanel',
    title: 'Time-Domain Oscilloscope',
    role: 'Amplitude Over Microseconds',
    summary:
      'Inspects real-time waveforms at three taps: filtered Baseband I/Q, recovered Demod m(t), or pre-filter ADC Raw samples (showing clipping).',
    experimentTip: 'Toggle between Baseband I/Q and Demod m(t) to compare carrier envelope against extracted data.',
  },
  constellationPanel: {
    id: 'constellationPanel',
    title: 'I/Q Constellation & Bitstream Decoder',
    role: 'Phasor Space & Frame Integrity',
    summary:
      'Plots In-Phase (I) horizontally vs. Quadrature (Q) vertically. Tight clusters indicate clean SNR; rings indicate FM; radial bursts show OOK.',
    experimentTip: 'Watch packet lock status shift between LOCKED, DEGRADED, and JAMMED as channel conditions change.',
  },
} as const satisfies Record<string, WorkbenchTooltipInfo>;

export type WorkbenchTooltipId = keyof typeof WORKBENCH_TOOLTIPS;

export function getWorkbenchTooltip(id: WorkbenchTooltipId): WorkbenchTooltipInfo {
  return WORKBENCH_TOOLTIPS[id];
}
