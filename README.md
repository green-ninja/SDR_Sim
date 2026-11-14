# SpectraLab SDR

**SpectraLab SDR** is an interactive, real-time Software Defined Radio (SDR) simulator built for learning RF physics, digital signal processing (DSP), and wireless cybersecurity. It models a complete receiver signal chain—from free-space electromagnetic propagation and quadrature downconversion to ADC sampling, FFT spectral analysis, digital channel filtering, and demodulation—visualizing every parameter change instantaneously.

---

## What It Can Do

### 1. Live SDR Workbench
- **Multi-Emitter RF Environments**: Explore four preconfigured spectral bands containing multiple concurrent transmitters so tuning across frequencies reveals distinct signals:
  - **433 MHz Sub-GHz IoT & Keyfob**: OOK keyfob burst, 2-FSK weather sensor, LoRa Chirp Spread Spectrum (CSS) packet, and an out-of-band POCSAG pager for studying aliasing.
  - **100 MHz FM & Aviation Band**: Wideband FM broadcast (WBFM), narrowband dispatch FM (NBFM), and an AM calibration carrier.
  - **2.4 GHz Digital Comms & QAM Lab**: BPSK beacon, QPSK telemetry link, and 16-QAM high-rate burst.
  - **1090 MHz ADS-B & Radar Pulse**: Aviation transponder OOK/PPM squitter frames alongside an L-band CW reference.
- **Real-Time Visualizations**:
  - **RF Power Spectrum & Waterfall Spectrogram**: Radix-2 Cooley-Tukey complex FFT display with click-to-tune frequency selection, shaded DDC channel filter passband overlay, squelch threshold marker, emitter/alias/jammer annotations, crosshair cursor readout, and a scrolling thermal waterfall spectrogram.
  - **Time-Domain Oscilloscope**: Switchable views for **Baseband I/Q**, **Demodulated Output $m(t)$**, and **ADC Raw** samples.
  - **I/Q Constellation & Decoder**: Live $I$ vs. $Q$ scatter plot paired with SNR, theoretical Bit Error Rate ($P_b$), packet lock state (`LOCKED`, `DEGRADED`, `JAMMED`, `ANALOG`), and live hex/ASCII/binary payload decoding.
  - **Optional Web Audio Demodulation**: User-triggered Web Audio API synthesis (`Audio Demod: On / Off`) to listen to the demodulated waveform.
- **Full Receiver & Channel Controls**:
  - **RF Front-End**: Center frequency ($f_c$) tuning, quick-snap emitter buttons, and LNA RF gain ($0\text{–}60\text{ dB}$) with ADC saturation/clipping detection.
  - **ADC & Sampling Physics**: Sample rate ($200\text{ kS/s–}2.4\text{ MS/s}$), ADC bit resolution ($4\text{–}16\text{ bit}$), and toggleable analog anti-aliasing filter to observe true sub-Nyquist spectral fold-back.
  - **DDC & FFT Engine**: Adjustable 31-tap windowed-sinc FIR channel filter bandwidth ($20\text{–}400\text{ kHz}$), FFT size ($256\text{–}2048$), window function (`Hann`, `Hamming`, `Blackman-Harris`, `Rectangular`), and demodulator mode (`Auto`, `AM`, `FM`, `OOK`, `FSK`, `PSK`, `16-QAM`).
  - **Channel Impairments & Threat Injection**: Adjustable AWGN SNR, I/Q phase error ($\Delta\varphi$), DC offset, and adversarial injection (`CW Narrowband Tone Jammer`, `Wideband Barrage Noise Jammer`, `Replay / Rogue Frame Spoofer`).

### 2. Structured Tutorials (`Beginner` → `Intermediate` → `Expert`)
- **8 Progressive Topics**:
  - *Beginner*: `01. General RF & Signal Terminology`, `02. Antennas, Path Loss & Thermal Noise Floor`
  - *Intermediate*: `03. LNA Gain & Quadrature I/Q Mixing`, `04. ADC Quantization, Nyquist & Aliasing`, `05. FFT Spectral Analysis, Windowing & DDC Filtering`, `06. Analog Demodulation: AM, NBFM & WBFM`
  - *Expert*: `07. Digital Modulation: OOK, FSK, PSK & 16-QAM`, `08. Mastering SDR Cybersecurity & Countermeasures`
- **Inside Every Topic**:
  - **Core Terminology** with symbols and definitions.
  - **Embedded Interactive Visual Demonstration** tailored specifically to that topic's physics or DSP mechanism.
  - **Physics & Component Architecture** breakdown.
  - **Toggleable Governing Formulae**.
  - **Guided Workbench Lab** with a one-click launcher that configures the live simulator.
  - **Mastery Check Quiz** with instant explanations and `localStorage` progress tracking.

### 3. Methods Matrix, Cybersecurity Lab & Live Formulae
- **Methods Matrix (`Methods` tab)**: Maps physics, communications, and security work types (e.g., sub-GHz OOK reverse engineering, LoRa CSS low-SNR recovery, WBFM Carson's bandwidth, ADS-B TDOA verification) to the exact DSP algorithms and equations used, with one-click live demo launchers.
- **Cybersecurity Lab (`Security` tab)**: Six guided attack-and-defense scenarios (OOK sniffing, CW jamming vs. DDC filtering, ADC desensitization, sub-Nyquist aliasing ghosts, I/Q mirror ghosting, and ADS-B frame spoofing).
- **Live Formulae (`Formulae` tab & Workbench Inspector)**: Displays equations with real-time numeric substitution from your active SDR settings (FSPL, $kTB$ thermal noise floor, quadrature mixing, Nyquist/aliasing fold-back, ADC quantization $\text{SNR}_q = 6.02N + 1.76\text{ dB}$, FFT bin resolution $\Delta f = f_s / N_{\text{FFT}}$, Carson's Rule, and BER) alongside an interactive Link Budget & Aliasing Calculator.

---

## How to Use It

### Using the Simulator
1. **Start in the Workbench**: Select an RF environment (such as *433 MHz Sub-GHz IoT & Keyfob*) from the left control deck, or click any quick-tune emitter button or directly click a peak in the **RF Spectrum** canvas to tune to it.
2. **Experiment with Sampling & Hardware Physics**:
   - Uncheck **Analog Anti-Aliasing Filter** or lower **Sample Rate ($f_s$)** to watch out-of-band signals fold back into baseband with `▲ ALIAS` indicators.
   - Lower **ADC Resolution** to `4-bit` and switch the Oscilloscope to **ADC Raw** to inspect quantization steps, or push **LNA RF Gain** past `+45 dB` to trigger **ADC Clipping**.
   - Introduce **I/Q Phase Err** to observe mirror-image ghosting across `0 Hz`.
3. **Simulate Attacks & Defenses**:
   - Enable **CW Narrowband Tone Jammer** at `+45 kHz` offset and watch the decoder state switch to `✖ JAMMED`.
   - Narrow **Channel Filter BW** below `80 kHz` (`±40 kHz`) so the shaded DDC passband excludes the jammer spike and restores `● LOCKED` payload decoding.
4. **Inspect Formulae Anytime**: Click any of the 5 pipeline stage cards (`01`–`05`) or toggle **Formulae: Visible** to see the exact equations and live substituted values for that stage.
5. **Follow the Curriculum**: Open **Tutorials** to progress from *Beginner* terminology through *Expert* modulation and security topics using each topic's embedded visual demo and mastery check.

### Running Locally
Prerequisites: Node.js 20+ and npm.

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Run TypeScript type checking
npm run lint

# Build for production
npm run build

# Run DSP, physics, and curriculum unit tests
npx --yes tsx --test src/dsp/dsp.test.ts src/dsp/curriculum.test.ts
```

---

## Project Structure

- `src/dsp/` — Decoupled pure TypeScript DSP, physics, preset, and curriculum modules (`fft.ts`, `physics.ts`, `simulator.ts`, `presets.ts`, `curriculum.ts`, `types.ts`) plus `node:test` suites (`dsp.test.ts`, `curriculum.test.ts`).
- `src/components/` — Modular UI and HTML5 Canvas visualizers (`SpectrumWaterfallCanvas.tsx`, `OscilloscopeCanvas.tsx`, `ConstellationPanel.tsx`, `SignalChainStrip.tsx`, `ControlDeck.tsx`, `FormulaInspector.tsx`, `TutorialsView.tsx`, `TopicInteractiveDemo.tsx`, `MethodMatrixView.tsx`, `CybersecurityLabView.tsx`, `FormulaReferenceView.tsx`).
- `src/hooks/useSdrAudio.ts` — User-initiated Web Audio API demodulated waveform playback.

---

## Known Limitations

- **Synthesized RF Signals Only (No Physical Hardware I/O)**: All I/Q data is synthesized in software inside the browser. The app does not interface with physical SDR hardware (e.g., RTL-SDR, HackRF, BladeRF, USRP via WebUSB/SoapySDR) and does not import or export recorded `.iq`, `.cfile`, or `.wav` baseband files.
- **Simplified RF Front-End & Synchronization Models**: The simulator models uniform quantization, hard $\pm 1.0$ ADC clipping, I/Q gain/phase imbalance, DC offset, AWGN, and analytical BER curves. It does not simulate full analog oscillator phase noise, multi-tone third-order intermodulation ($IIP_3$) cascades, Costas-loop/PLL carrier and symbol-timing recovery jitter, or multipath Rayleigh/Rician fading channels.
- **Frame-Based Browser Simulation Rate**: Frames are computed at ~20 Hz over $N$-sample windows (`256`–`2048` samples) to keep browser canvas rendering smooth rather than running a continuous multi-megahertz DMA stream.
- **Educational Protocol Payloads**: Decoded digital streams demonstrate bit-slicing, preamble framing, and SNR/jammer-induced bit errors on illustrative payloads (`KEY1`, `TEMP`, `LORA`, `SDR!`, `ADSB`) rather than implementing full link-layer protocol decoders (such as Mode-S CRC-24 validation, LoRa de-whitening/Hamming FEC, or rolling-code cryptography).
- **Local-Only Progress Persistence**: Tutorial completion progress is saved only in the browser's `localStorage`; there are no user accounts or server-side persistence.
