import type { PipelineStageId, SdrConfig } from './types';

export type TopicLevel = 'Beginner' | 'Intermediate' | 'Expert';

export interface TutorialTerm {
  term: string;
  symbol?: string;
  definition: string;
}

export interface TutorialFormula {
  label: string;
  equation: string;
  meaning: string;
}

export interface TutorialQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TutorialTopic {
  id: string;
  number: string;
  level: TopicLevel;
  title: string;
  subtitle: string;
  componentFocus: string;
  pipelineStage?: PipelineStageId;
  terminology: TutorialTerm[];
  explanation: string[];
  formulae: TutorialFormula[];
  labExercise: {
    objective: string;
    steps: string[];
    configPatch: Partial<SdrConfig>;
  };
  quiz: TutorialQuiz;
}

export const SDR_TUTORIAL_TOPICS: TutorialTopic[] = [
  {
    id: 'rf-terminology',
    number: '01',
    level: 'Beginner',
    title: 'General RF & Signal Terminology',
    subtitle: 'Frequency, bandwidth, wavelength, decibels (dBm vs. dBFS), and SNR.',
    componentFocus: 'Signal Fundamentals & Spectrum Basics',
    pipelineStage: 'antenna',
    terminology: [
      {
        term: 'Carrier Frequency',
        symbol: 'f_c',
        definition:
          'The central sinusoidal frequency (in Hz, MHz, or GHz) onto which information is modulated for wireless propagation.',
      },
      {
        term: 'Bandwidth',
        symbol: 'BW',
        definition:
          'The width of the frequency range occupied by a signal (f_max − f_min). Wider bandwidth allows higher data rates.',
      },
      {
        term: 'dBm vs. dBFS',
        symbol: 'dBm / dBFS',
        definition:
          'dBm measures absolute RF power referenced to 1 milliwatt (0 dBm = 1 mW). dBFS measures digital sample power relative to ADC full-scale (0 dBFS = clipping threshold).',
      },
      {
        term: 'Signal-to-Noise Ratio',
        symbol: 'SNR',
        definition:
          'Ratio of desired signal power to background noise power in decibels. Higher SNR lowers bit errors.',
      },
    ],
    explanation: [
      'A Software Defined Radio replaces rigid analog hardware circuits (hardware mixers, crystal filters, discriminator coils) with a wideband RF front-end connected to high-speed digital-to-analog/analog-to-digital converters and software DSP.',
      'In the Workbench spectrum analyzer, the horizontal axis shows frequency centered at your tuned Local Oscillator (f_c), while the vertical axis shows relative signal strength in dBFS. A clean signal rises distinctly above the flat thermal noise floor.',
    ],
    formulae: [
      {
        label: 'Wavelength & Frequency',
        equation: 'λ = c / f',
        meaning:
          'Electromagnetic wavelength equals speed of light (c ≈ 3×10⁸ m/s) divided by frequency. A 433.92 MHz wave has λ ≈ 0.69 m.',
      },
      {
        label: 'Power Ratio in Decibels',
        equation: 'P_dBm = 10 · log₁₀(P_mW / 1 mW)',
        meaning:
          'Every +3 dB doubles power; every +10 dB multiplies power by 10×. −30 dBm equals 1 microwatt.',
      },
    ],
    labExercise: {
      objective:
        'Explore the 433 MHz ISM band to distinguish narrowband vs. wideband signals and inspect SNR.',
      steps: [
        'Launch the lab in Workbench and observe the three emitters in the RF Spectrum.',
        'Hover your cursor across the noise floor (~−65 dBFS) and the central Keyfob OOK peak (~−18 dBFS) to read exact frequency and power.',
        'Drag the Channel SNR slider down from 24 dB to 4 dB and watch the noise floor rise in both the Spectrum and Waterfall.',
      ],
      configPatch: {
        presetId: 'iot_433',
        centerFreqHz: 433_920_000,
        sampleRateHz: 1_000_000,
        channelFilterBwHz: 120_000,
        snrDb: 24,
        rfGainDb: 28,
        jammerMode: 'none',
        antiAliasingFilter: true,
        iqPhaseErrorDeg: 0,
        dcOffset: 0,
      },
    },
    quiz: {
      question:
        'On an SDR spectrum display, what does 0 dBFS represent compared to dBm?',
      options: [
        '0 dBFS is the maximum digital full-scale amplitude before ADC clipping, whereas dBm is absolute power relative to 1 mW',
        '0 dBFS means zero thermal noise is present in the antenna',
        '0 dBFS and 0 dBm always represent the exact same voltage regardless of RF gain',
      ],
      correctIndex: 0,
      explanation:
        'dBFS is a relative digital scale bounded by the ADC full-scale range (±1.0), which shifts with LNA RF gain, while dBm is an absolute physical power unit.',
    },
  },
  {
    id: 'antenna-propagation',
    number: '02',
    level: 'Beginner',
    title: 'Antennas, Path Loss & Thermal Noise Floor',
    subtitle: 'How waves lose energy over distance and what sets receiver sensitivity.',
    componentFocus: 'Stage 01 — RF Antenna & Propagation Channel',
    pipelineStage: 'antenna',
    terminology: [
      {
        term: 'Free-Space Path Loss',
        symbol: 'FSPL',
        definition:
          'Signal attenuation along a line-of-sight path caused by spherical wave spreading and shrinking antenna aperture at higher frequencies.',
      },
      {
        term: 'Johnson–Nyquist Thermal Noise',
        symbol: 'kTB',
        definition:
          'Irreducible noise power generated by thermal agitation of electrons inside resistors at temperature T (≈ −174 dBm/Hz at 290 K).',
      },
      {
        term: 'Noise Figure',
        symbol: 'NF',
        definition:
          'Decibel degradation of SNR introduced by the receiver front-end electronics.',
      },
    ],
    explanation: [
      'Before any digital processing happens, an antenna converts free-space electromagnetic waves into microvolt electrical currents. Because waves expand spherically, received power drops with the square of distance (1/d²) and the square of frequency.',
      'Even in a silent shielded room, thermal energy creates a fundamental noise floor of −174 dBm per Hertz of bandwidth. Narrowing your receiver bandwidth directly reduces the total noise power entering the detector.',
    ],
    formulae: [
      {
        label: 'Friis Free-Space Path Loss',
        equation: 'FSPL = 20·log₁₀(d) + 20·log₁₀(f) − 147.55 dB',
        meaning:
          'Doubling either distance d (meters) or frequency f (Hz) adds 6.02 dB of attenuation.',
      },
      {
        label: 'Thermal Noise Power',
        equation: 'N₀ = −174 dBm/Hz + 10·log₁₀(BW) + NF',
        meaning:
          'A 10× narrower channel filter lowers integrated thermal noise by 10 dB.',
      },
    ],
    labExercise: {
      objective:
        'Compare path loss at 100 MHz FM vs. 1090 MHz ADS-B and observe noise-floor dependence on bandwidth.',
      steps: [
        'Launch the 1090 MHz ADS-B scenario and click Stage 01 (RF Antenna & Path) to inspect FSPL (~118 dB at 18 km).',
        'Switch to the Formulae tab and vary Distance (d) and Carrier (f) in the Interactive Link Budget Calculator.',
        'Return to Workbench and adjust Channel Filter BW to see how kTB thermal noise floor updates live.',
      ],
      configPatch: {
        presetId: 'adsb_1090',
        centerFreqHz: 1_090_000_000,
        sampleRateHz: 2_000_000,
        channelFilterBwHz: 350_000,
        jammerMode: 'none',
        antiAliasingFilter: true,
      },
    },
    quiz: {
      question:
        'If a transmitter moves twice as far away from your SDR antenna in free space, how much does the received power drop?',
      options: [
        '2.0 dB',
        '6.02 dB',
        '20.0 dB',
      ],
      correctIndex: 1,
      explanation:
        'From 20·log₁₀(2d) − 20·log₁₀(d) = 20·log₁₀(2) = 6.02 dB, doubling distance reduces received power to one quarter (−6.02 dB).',
    },
  },
  {
    id: 'lna-iq-mixer',
    number: '03',
    level: 'Intermediate',
    title: 'LNA Gain & Quadrature I/Q Mixing',
    subtitle: 'Why SDRs use complex numbers I(t) + jQ(t) instead of real-only signals.',
    componentFocus: 'Stage 02 — Low-Noise Amplifier & Quadrature Mixer',
    pipelineStage: 'lna_mixer',
    terminology: [
      {
        term: 'Low-Noise Amplifier',
        symbol: 'LNA',
        definition:
          'First amplification stage after the antenna. Boosts weak microvolt signals above ADC quantization noise while adding minimal internal noise.',
      },
      {
        term: 'In-Phase & Quadrature',
        symbol: 'I(t), Q(t)',
        definition:
          'Two orthogonal baseband channels created by multiplying RF with cos(2πf_c t) and −sin(2πf_c t), representing real and imaginary components.',
      },
      {
        term: 'I/Q Imbalance & DC Offset',
        symbol: 'Δφ, DC',
        definition:
          'Hardware phase/gain mismatches between I and Q mixers create mirror-image ghost signals across 0 Hz, while LO leakage creates a center DC spike.',
      },
    ],
    explanation: [
      'A real-valued cosine cannot distinguish positive from negative frequencies around 0 Hz: signals at f_c + Δf and f_c − Δf would fold on top of each other and corrupt the spectrum.',
      'By mixing with both cosine (I) and 90°-shifted negative sine (Q), an SDR creates an analytic complex signal x_BB(t) = I(t) + j·Q(t). Phase rotation direction (clockwise vs. counterclockwise) unambiguously separates frequencies above and below f_c.',
    ],
    formulae: [
      {
        label: 'Complex Quadrature Downconversion',
        equation: 'x_BB(t) = x_RF(t) · e^(−j·2π·f_c·t) = I(t) + j·Q(t)',
        meaning:
          'Shifts the entire RF spectrum by −f_c so your target carrier lands cleanly at 0 Hz baseband.',
      },
      {
        label: 'Instantaneous Amplitude & Phase',
        equation: 'A(t) = √(I² + Q²),   φ(t) = atan2(Q, I)',
        meaning:
          'All modulation types—AM, FM, PSK, and QAM—are extracted directly from A(t) and φ(t).',
      },
    ],
    labExercise: {
      objective:
        'Observe orthogonal I/Q waveforms, introduce hardware phase skew, and inspect mirror image leakage.',
      steps: [
        'Launch the 2.4 GHz QPSK scenario and watch the clean 4-quadrant constellation and asymmetrical spectrum.',
        'Drag the I/Q Phase Err slider from 0° to +20° and increase DC Offset to 0.12.',
        'Observe the tilted ellipse on the Constellation, the central DC spike at 0 Hz, and mirror-image ghosting across center frequency.',
      ],
      configPatch: {
        presetId: 'ism_2400',
        centerFreqHz: 2_440_000_000,
        sampleRateHz: 1_000_000,
        channelFilterBwHz: 180_000,
        iqPhaseErrorDeg: 0,
        dcOffset: 0,
        jammerMode: 'none',
      },
    },
    quiz: {
      question:
        'Why does an SDR sample both I (In-Phase) and Q (Quadrature) channels instead of a single real channel?',
      options: [
        'To distinguish positive frequency offsets (+Δf) from negative frequency offsets (−Δf) around the center frequency',
        'To double the speed of electromagnetic waves in air',
        'Because digital computers cannot perform FFTs on real numbers',
      ],
      correctIndex: 0,
      explanation:
        'Complex I/Q sampling preserves sign of frequency relative to f_c, preventing upper and lower sidebands from folding onto each other.',
    },
  },
  {
    id: 'adc-nyquist-aliasing',
    number: '04',
    level: 'Intermediate',
    title: 'ADC Quantization, Nyquist & Aliasing',
    subtitle: 'Sample rate limits, bit depth dynamic range, clipping, and spectral fold-back.',
    componentFocus: 'Stage 03 — Analog-to-Digital Converter (ADC)',
    pipelineStage: 'adc',
    terminology: [
      {
        term: 'Nyquist Rate',
        symbol: 'f_s ≥ 2·B',
        definition:
          'For complex I/Q sampling at rate f_s, the unambiguous baseband span is ±f_s/2 (total usable bandwidth equals f_s).',
      },
      {
        term: 'Aliasing',
        symbol: 'f_alias',
        definition:
          'When energy outside ±f_s/2 is sampled without an analog anti-aliasing filter, it folds back into baseband as a false signal.',
      },
      {
        term: 'Quantization SNR & Clipping',
        symbol: 'SNR_q',
        definition:
          'Rounding analog voltage into 2^N discrete levels creates quantization noise; exceeding ±1.0 full-scale causes hard clipping harmonics.',
      },
    ],
    explanation: [
      'The ADC bridges continuous physics and discrete math along two axes: time (Sample Rate f_s) and amplitude (Bit Depth N). Every extra bit adds 6.02 dB of dynamic range—explaining why an 8-bit RTL-SDR (~50 dB) clips far more easily under strong nearby transmitters than a 12-bit or 16-bit SDR (~74–98 dB).',
      'If analog filtering ahead of the ADC is insufficient, strong out-of-band emitters wrap around the Nyquist boundary. In SDR forensics, changing f_s quickly exposes aliases: genuine signals stay fixed in RF frequency while aliases jump.',
    ],
    formulae: [
      {
        label: 'Quantization Dynamic Range',
        equation: 'SNR_q = 6.02·N + 1.76 dB',
        meaning:
          '8-bit ADC ≈ 49.9 dB; 12-bit ADC ≈ 74.0 dB; 16-bit ADC ≈ 98.1 dB.',
      },
      {
        label: 'Aliasing Fold-Back Frequency',
        equation: 'f_alias = |f_offset − k · f_s|',
        meaning:
          'A signal at +700 kHz offset sampled at 1000 kS/s (k=1) appears at −300 kHz.',
      },
    ],
    labExercise: {
      objective:
        'Trigger real sub-Nyquist aliasing and ADC hard clipping to observe both effects live.',
      steps: [
        'Launch the lab (Anti-Aliasing Filter is OFF): spot the amber ▲ ALIAS marker from the out-of-band 434.62 MHz pager folding to 433.62 MHz.',
        'Toggle Analog Anti-Aliasing Filter ON (or raise Sample Rate above 1600 kS/s) and watch the ghost disappear.',
        'Switch the Oscilloscope to ADC Raw, lower ADC Resolution to 4-bit to see quantization steps, and raise LNA RF Gain to +55 dB to trigger ✖ ADC Clipping.',
      ],
      configPatch: {
        presetId: 'iot_433',
        centerFreqHz: 433_920_000,
        sampleRateHz: 1_000_000,
        adcBits: 12,
        antiAliasingFilter: false,
        rfGainDb: 28,
        jammerMode: 'none',
      },
    },
    quiz: {
      question:
        'An SDR centered at 433.92 MHz with f_s = 1.0 MS/s (Nyquist ±500 kHz) has its anti-aliasing filter disabled. Where does an out-of-band transmitter at 434.62 MHz (+700 kHz offset) appear?',
      options: [
        'It vanishes completely because it is above 500 kHz',
        'It folds back to −300 kHz offset (433.62 MHz) inside the baseband spectrum',
        'It shifts upward to +1400 kHz',
      ],
      correctIndex: 1,
      explanation:
        '700 kHz − 1 × 1000 kHz = −300 kHz, placing the aliased signal at 433.92 − 0.30 = 433.62 MHz.',
    },
  },
  {
    id: 'fft-windowing-ddc',
    number: '05',
    level: 'Intermediate',
    title: 'FFT Spectral Analysis, Windowing & DDC Filtering',
    subtitle: 'Frequency resolution, spectral leakage, and isolating channels in software.',
    componentFocus: 'Stage 04 — FFT Engine & Digital Downconverter (DDC)',
    pipelineStage: 'ddc_filter',
    terminology: [
      {
        term: 'FFT Bin Resolution',
        symbol: 'Δf',
        definition:
          'Frequency spacing between adjacent FFT bins (f_s / N_FFT). Larger FFTs sharpen frequency precision at the cost of coarser time resolution.',
      },
      {
        term: 'Window Function',
        symbol: 'w[n]',
        definition:
          'Tapering function (Hann, Blackman-Harris) applied before FFT to prevent sharp block-edge discontinuities from smearing sidelobe energy.',
      },
      {
        term: 'DDC Channel LPF',
        symbol: 'BW_ch',
        definition:
          'Digital low-pass FIR filter centered at 0 Hz that strips adjacent signals and wideband noise prior to demodulation.',
      },
    ],
    explanation: [
      'Because an FFT operates on a finite block of N samples, any signal whose frequency does not complete an exact integer number of cycles inside the block leaks energy across neighboring bins ("spectral leakage"). A Rectangular window maximizes frequency sharpness but produces huge −13 dB sidelobes; Hann and Blackman-Harris windows suppress sidelobes by 31–92 dB.',
      'After viewing the full wideband spectrum, the Digital Downconverter (DDC) applies a windowed-sinc FIR low-pass filter of width BW_ch (shown as the shaded cyan passband) to isolate only the channel you want to demodulate.',
    ],
    formulae: [
      {
        label: 'FFT Bin Spacing & Processing Gain',
        equation: 'Δf = f_s / N_FFT   |   G_FFT = 10·log₁₀(N_FFT / 2)',
        meaning:
          'Doubling N_FFT halves bin width and boosts narrowband CW SNR relative to noise floor by +3.01 dB.',
      },
      {
        label: 'DDC Filter Noise Reduction',
        equation: 'ΔSNR_filter = 10·log₁₀(f_s / BW_ch)',
        meaning:
          'Filtering a 1 MS/s stream down to 100 kHz rejects 90% (+10 dB) of out-of-band white noise.',
      },
    ],
    labExercise: {
      objective:
        'Compare FFT window sidelobes and observe how FFT size and DDC bandwidth shape the spectrum.',
      steps: [
        'Change FFT Window from Hann to Rectangular and observe sidelobe skirts widening around the FM carrier.',
        'Switch FFT Size between 256 and 2048 and watch Δf drop from ~4.7 kHz to ~585 Hz per bin.',
        'Adjust Channel Filter BW from 220 kHz down to 40 kHz and watch the shaded passband bracket resize live.',
      ],
      configPatch: {
        presetId: 'fm_broadcast',
        centerFreqHz: 100_000_000,
        sampleRateHz: 1_200_000,
        channelFilterBwHz: 200_000,
        fftSize: 1024,
        windowFunction: 'hann',
        jammerMode: 'none',
      },
    },
    quiz: {
      question:
        'What happens when you increase FFT Size (N) from 512 to 2048 while keeping Sample Rate constant?',
      options: [
        'Frequency resolution Δf becomes 4× finer and narrowband peaks stand out more clearly above the noise floor',
        'The Nyquist bandwidth doubles automatically',
        'ADC quantization bit depth increases by 4 bits',
      ],
      correctIndex: 0,
      explanation:
        'Since Δf = f_s / N, quadrupling N makes each frequency bin 4× narrower and adds +6 dB of FFT processing gain for coherent tones.',
    },
  },
  {
    id: 'analog-modulation',
    number: '06',
    level: 'Intermediate',
    title: 'Analog Demodulation: AM, NBFM & WBFM',
    subtitle: 'Envelope detection, Carson’s bandwidth rule, and polar phase discrimination.',
    componentFocus: 'Stage 05 — Analog Envelope & FM Discriminators',
    pipelineStage: 'demod',
    terminology: [
      {
        term: 'Amplitude Modulation',
        symbol: 'AM',
        definition:
          'Audio/message signal varies the instantaneous carrier envelope amplitude while carrier frequency remains constant.',
      },
      {
        term: 'Frequency Modulation',
        symbol: 'WBFM / NBFM',
        definition:
          'Message signal varies instantaneous carrier frequency deviation Δf; amplitude stays constant (a unit circle on the I/Q constellation).',
      },
      {
        term: "Carson's Bandwidth Rule",
        symbol: 'BW ≈ 2(Δf + f_m)',
        definition:
          'Predicts the RF bandwidth occupied by an FM signal given peak frequency deviation Δf and highest modulating audio frequency f_m.',
      },
    ],
    explanation: [
      'In AM, demodulation simply measures complex vector length √(I² + Q²). Because noise adds directly to amplitude, AM is vulnerable to static and fading, though it occupies narrow bandwidth (2·f_m).',
      'In FM, information is encoded in the rate of phase change dφ/dt. SDRs extract this using a quadrature polar discriminator: multiplying each complex sample s[n] by the complex conjugate of the previous sample s*[n−1] and taking atan2(Im, Re). Because FM carries constant amplitude, its I/Q constellation traces a clean ring!',
    ],
    formulae: [
      {
        label: "Carson's FM Bandwidth Rule",
        equation: 'BW ≈ 2 · (Δf + f_m)',
        meaning:
          'Broadcast WBFM (Δf = 75 kHz, f_m = 15 kHz) occupies ≈ 180 kHz; dispatch NBFM (Δf = 5 kHz) occupies ≈ 16 kHz.',
      },
      {
        label: 'Polar Quadrature Discriminator',
        equation: 'm[n] ∝ atan2(Q[n]I[n−1] − I[n]Q[n−1], I[n]I[n−1] + Q[n]Q[n−1])',
        meaning:
          'Measures instantaneous phase step Δφ between consecutive samples without trigonometric division artifacts.',
      },
    ],
    labExercise: {
      objective:
        'Tune between Wideband FM, Narrowband FM, and AM carriers in the 100 MHz band and inspect their constellations.',
      steps: [
        'Launch the 100 MHz FM band and inspect the WBFM unit-circle constellation.',
        'Switch the Oscilloscope to Demod m(t) to view the recovered audio waveform.',
        'Click the 99.680 MHz AM emitter button in the Control Deck and notice how the constellation collapses onto the real I-axis (amplitude only)!',
      ],
      configPatch: {
        presetId: 'fm_broadcast',
        centerFreqHz: 100_000_000,
        sampleRateHz: 1_200_000,
        channelFilterBwHz: 200_000,
        demodMode: 'AUTO',
        jammerMode: 'none',
      },
    },
    quiz: {
      question:
        'What shape does an ideal, noise-free FM signal trace on an I/Q Constellation plot?',
      options: [
        'Two isolated points along the I-axis',
        'A circle of constant radius centered at the origin',
        'A 4×4 square grid of 16 discrete points',
      ],
      correctIndex: 1,
      explanation:
        'FM keeps amplitude √(I² + Q²) constant while spinning phase φ(t) continuously, forming a circle on the I/Q plane.',
    },
  },
  {
    id: 'digital-modulation',
    number: '07',
    level: 'Expert',
    title: 'Digital Modulation: OOK, FSK, PSK & 16-QAM',
    subtitle: 'Symbol constellations, spectral efficiency, and Bit Error Rate vs. SNR.',
    componentFocus: 'Stage 05 — Symbol Slicers & Bit Recovery',
    pipelineStage: 'demod',
    terminology: [
      {
        term: 'On-Off Keying / FSK',
        symbol: 'OOK / FSK',
        definition:
          'Simple non-coherent digital modulations switching carrier amplitude (OOK) or shifting between two frequencies (2-FSK). Common in keyfobs and sensors.',
      },
      {
        term: 'Phase-Shift Keying',
        symbol: 'BPSK / QPSK',
        definition:
          'Encodes 1 bit (0°/180°) or 2 bits (45°/135°/225°/315°) per symbol in carrier phase.',
      },
      {
        term: '16-QAM & Bit Error Rate',
        symbol: '16-QAM / P_b',
        definition:
          'Modulates both amplitude and phase into 16 constellation states (4 bits/symbol). Tighter spacing increases throughput but raises BER if SNR drops.',
      },
    ],
    explanation: [
      'Digital communication trades complexity and required SNR for spectral efficiency (bits/s/Hz). OOK and FSK need no carrier phase lock, making them cheap for battery-powered IoT devices.',
      'Higher-order constellations like QPSK and 16-QAM pack 2–4× more bits into the same bandwidth, visible as distinct symbol clusters in the I/Q Constellation plot. As channel noise increases, clusters blur together and the receiver misclassifies symbols, driving up Bit Error Rate (P_b).',
    ],
    formulae: [
      {
        label: 'Coherent BPSK/QPSK Bit Error Rate',
        equation: 'P_b = ½ · erfc(√(E_b / N₀))',
        meaning:
          'BER drops super-exponentially with E_b/N₀: at 10 dB SNR, BPSK achieves P_b ≈ 3.9×10⁻⁶.',
      },
      {
        label: 'QAM Symbol Representation',
        equation: 's(t) = I_k·cos(ω_c t) − Q_k·sin(ω_c t)',
        meaning:
          'Each symbol pair (I_k, Q_k) maps log₂(M) bits onto a 2D Euclidean coordinate.',
      },
    ],
    labExercise: {
      objective:
        'Compare QPSK vs. 16-QAM constellation tolerance under rising channel noise.',
      steps: [
        'Launch the 2.4 GHz QPSK link and observe 4 tight constellation points with ● LOCKED payload "SDR!".',
        'Click the 2.44028 GHz 16-QAM emitter button to see 16 discrete amplitude/phase clusters.',
        'Lower Channel SNR from 24 dB to 8 dB and watch 16-QAM clusters smear and Est. BER climb sharply compared to BPSK.',
      ],
      configPatch: {
        presetId: 'ism_2400',
        centerFreqHz: 2_440_000_000,
        sampleRateHz: 1_000_000,
        channelFilterBwHz: 180_000,
        snrDb: 24,
        iqPhaseErrorDeg: 0,
        dcOffset: 0,
        jammerMode: 'none',
      },
    },
    quiz: {
      question:
        'Why does 16-QAM degrade faster than BPSK when Channel SNR drops?',
      options: [
        '16-QAM places 16 symbol points much closer together in I/Q space, so smaller noise vectors push symbols across decision boundaries',
        '16-QAM uses a lower sample rate than BPSK',
        'BPSK uses analog anti-aliasing while 16-QAM cannot',
      ],
      correctIndex: 0,
      explanation:
        'Packing 16 states into the same peak power shrinks minimum Euclidean distance between constellation points, reducing noise margin.',
    },
  },
  {
    id: 'sdr-cybersecurity-mastery',
    number: '08',
    level: 'Expert',
    title: 'Mastering SDR Cybersecurity & Countermeasures',
    subtitle: 'Passive sniffing, CW jamming defense, ADC desensitization, and spoofing forensics.',
    componentFocus: 'Full End-to-End SDR Signal Chain',
    pipelineStage: 'ddc_filter',
    terminology: [
      {
        term: 'Replay & Sniffing Audit',
        symbol: 'OOK / PPM',
        definition:
          'Capturing unauthenticated RF control bursts (fixed-code keyfobs, unencrypted ADS-B) to audit cryptographic vs. rolling-code defenses.',
      },
      {
        term: 'Narrowband vs. Barrage Jamming',
        symbol: 'J/S Ratio',
        definition:
          'Injecting high-power tones or wideband noise to deny packet decoding or overload the front-end ADC.',
      },
      {
        term: 'TDOA Physical Validation',
        symbol: 'Δt = Δd/c',
        definition:
          'Comparing arrival times across multiple synchronized SDRs to verify a transmitter’s physical location against spoofed coordinates.',
      },
    ],
    explanation: [
      'Mastering SDR for cybersecurity means understanding both software DSP and physical-layer hardware limits. An attacker using an adjacent CW tone jammer (+45 kHz off-center) can be neutralized completely in software by narrowing the DDC Channel Filter BW below ±45 kHz—provided the jammer has not saturated your physical LNA/ADC.',
      'Conversely, if an attacker blasts high power near the band and drives your ADC into clipping, no downstream digital filter can undo the nonlinear intermodulation distortion; you must reduce front-end RF gain or add an analog cavity/bandpass filter.',
    ],
    formulae: [
      {
        label: 'Filter Anti-Jam Rejection',
        equation: 'BW_ch < 2 · |f_jammer − f_c|',
        meaning:
          'Setting digital passband narrower than twice the jammer offset excludes the interfering carrier before bit slicing.',
      },
      {
        label: 'Time Difference of Arrival',
        equation: 'Δt_TDOA = (d₁ − d₂) / c',
        meaning:
          '1 microsecond of arrival-time difference corresponds to 300 meters of physical path difference.',
      },
    ],
    labExercise: {
      objective:
        'Defeat an active CW jammer attacking a 433.92 MHz OOK receiver using DDC filtering.',
      steps: [
        'Launch the lab: an attacker CW jammer at +45 kHz is inside the 140 kHz passband, causing ✖ JAMMED status and bit errors on "KEY1".',
        'Reduce Channel Filter BW from 140 kHz down to 60 kHz (±30 kHz) so the shaded passband excludes the +45 kHz spike.',
        'Confirm packet integrity flips to ● LOCKED and clean payload 4B 45 59 31 ("KEY1") recovers in real time!',
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
    quiz: {
      question:
        'A +45 kHz CW jammer is corrupting your target signal at f_c without clipping the ADC. What DDC filter bandwidth change isolates your target signal?',
      options: [
        'Widen Channel Filter BW to 300 kHz',
        'Narrow Channel Filter BW to 60 kHz (±30 kHz passband)',
        'Disable the Analog Anti-Aliasing Filter',
      ],
      correctIndex: 1,
      explanation:
        'At 60 kHz bandwidth, the passband spans ±30 kHz around f_c, placing the +45 kHz jammer cleanly outside the FIR filter cutoff.',
    },
  },
];

export function evaluateQuizAnswer(
  topic: TutorialTopic,
  selectedIndex: number
): { isCorrect: boolean; explanation: string } {
  return {
    isCorrect: selectedIndex === topic.quiz.correctIndex,
    explanation: topic.quiz.explanation,
  };
}

export function calculateMasteryProgress(
  completedIds: string[],
  topics: TutorialTopic[] = SDR_TUTORIAL_TOPICS
): { completedCount: number; totalCount: number; percent: number } {
  const validSet = new Set(topics.map((t) => t.id));
  const uniqueCompleted = new Set(completedIds.filter((id) => validSet.has(id)));
  const totalCount = topics.length;
  const completedCount = uniqueCompleted.size;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return { completedCount, totalCount, percent };
}
