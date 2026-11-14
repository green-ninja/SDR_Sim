export type ModulationType =
  | 'AM'
  | 'WBFM'
  | 'NBFM'
  | 'OOK'
  | 'FSK'
  | 'BPSK'
  | 'QPSK'
  | 'QAM16'
  | 'LORA_CSS'
  | 'CW';

export type WindowFunction = 'hann' | 'hamming' | 'blackmanHarris' | 'rectangular';

export type DemodulatorMode = 'AUTO' | 'AM' | 'FM' | 'OOK' | 'FSK' | 'PSK' | 'QAM16';

export type JammerMode = 'none' | 'cw_tone' | 'barrage_noise' | 'replay_spoof';

export type PipelineStageId =
  | 'antenna'
  | 'lna_mixer'
  | 'adc'
  | 'ddc_filter'
  | 'demod';

export type WorkspaceTab = 'workbench' | 'tutorials' | 'methods' | 'cybersecurity' | 'formulae';

export interface RfEmitter {
  id: string;
  label: string;
  freqHz: number;
  bandwidthHz: number;
  modulation: ModulationType;
  txPowerDbm: number;
  distanceMeters: number;
  messageHex?: string;
  fmDeviationHz?: number;
  modFreqHz?: number;
  symbolRateHz?: number;
  isThreat?: boolean;
}

export interface SdrConfig {
  presetId: string;
  centerFreqHz: number;
  sampleRateHz: number;
  fftSize: number;
  windowFunction: WindowFunction;
  rfGainDb: number;
  adcBits: number;
  antiAliasingFilter: boolean;
  channelFilterBwHz: number;
  demodMode: DemodulatorMode;
  snrDb: number;
  dcOffset: number;
  iqGainImbalance: number;
  iqPhaseErrorDeg: number;
  jammerMode: JammerMode;
  jammerPowerDbm: number;
  jammerOffsetHz: number;
  squelchDb: number;
  showFormulae: boolean;
  isRunning: boolean;
}

export interface DspMetrics {
  nyquistFreqHz: number;
  binResolutionHz: number;
  fftProcessingGainDb: number;
  quantizationSnrDb: number;
  thermalNoiseFloorDbm: number;
  peakFreqHz: number;
  peakPowerDbm: number;
  measuredSnrDb: number;
  adcSaturationRatio: number;
  isClipping: boolean;
  aliasingCount: number;
  aliasedEmitters: Array<{
    label: string;
    trueFreqHz: number;
    aliasedBasebandHz: number;
    foldOrder: number;
  }>;
  carsonBandwidthHz: number;
  fsplDb: number;
  receivedPowerDbm: number;
  estimatedBer: number;
  activeEmitter: RfEmitter | null;
}

export interface SimulationFrame {
  /** Baseband complex I/Q after channel filter (for time & constellation) */
  basebandI: Float32Array;
  basebandQ: Float32Array;
  /** Pre-filter ADC complex I/Q (for raw sampling view) */
  adcI: Float32Array;
  adcQ: Float32Array;
  /** Demodulated real waveform (audio / baseband symbol stream) */
  demodWave: Float32Array;
  /** Power spectrum in dBFS, length = fftSize, DC-centered (-Fs/2 to +Fs/2) */
  spectrumDb: Float32Array;
  /** Decoded bit string & hex bytes for digital/cyber modes */
  decodedBits: string;
  decodedHex: string;
  decodedAscii: string;
  packetIntegrity: 'LOCKED' | 'DEGRADED' | 'JAMMED' | 'ANALOG';
  metrics: DspMetrics;
  sampleTimeSec: number;
}

export interface LiveFormula {
  id: string;
  stage: PipelineStageId;
  title: string;
  equation: string;
  substituted: string;
  result: string;
  explanation: string;
  cyberRelevance: string;
}

export interface SdrMethodGuide {
  id: string;
  domain: 'Physics' | 'Cybersecurity' | 'Communications';
  workType: string;
  signalModulation: string;
  dspMethods: string[];
  keyFormula: string;
  typicalFreqRange: string;
  whyUsed: string;
  demoPresetId: string;
  demoCenterFreqHz: number;
  demoSampleRateHz: number;
  demoChannelBwHz: number;
  demoJammerMode?: JammerMode;
}

export interface SignalPreset {
  id: string;
  name: string;
  category: 'Cybersecurity' | 'Physics & Telemetry' | 'Broadcast & Comms';
  summary: string;
  defaultCenterFreqHz: number;
  defaultSampleRateHz: number;
  defaultChannelBwHz: number;
  defaultDemodMode: DemodulatorMode;
  emitters: RfEmitter[];
}
