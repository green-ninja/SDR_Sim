import { useEffect, useRef, useState } from 'react';
import type { SimulationFrame } from '../dsp/types';

export function useSdrAudio(frame: SimulationFrame, isRunning: boolean) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const toggleAudio = async () => {
    if (!audioEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!ctxRef.current) {
          ctxRef.current = new AudioCtx();
          gainRef.current = ctxRef.current.createGain();
          gainRef.current.gain.value = 0.12;
          gainRef.current.connect(ctxRef.current.destination);
        }
        if (ctxRef.current.state === 'suspended') {
          await ctxRef.current.resume();
        }
        nextPlayTimeRef.current = ctxRef.current.currentTime + 0.02;
        setAudioEnabled(true);
      } catch {
        setAudioEnabled(false);
      }
    } else {
      if (ctxRef.current && ctxRef.current.state === 'running') {
        await ctxRef.current.suspend();
      }
      setAudioEnabled(false);
    }
  };

  useEffect(() => {
    if (!audioEnabled || !isRunning || !ctxRef.current || !gainRef.current) return;
    const audioCtx = ctxRef.current;
    if (audioCtx.state !== 'running') return;

    // Resample demodWave slice cleanly into an audible 24 kHz buffer (~40 ms)
    const targetRate = 24000;
    const outLen = 960;
    const buffer = audioCtx.createBuffer(1, outLen, targetRate);
    const channel = buffer.getChannelData(0);
    const src = frame.demodWave;
    const srcLen = src.length;

    // Remove DC offset for clean speaker playback
    let mean = 0;
    for (let i = 0; i < srcLen; i++) mean += src[i];
    mean /= srcLen || 1;

    for (let i = 0; i < outLen; i++) {
      const idx = Math.floor((i / outLen) * srcLen);
      const val = (src[idx] - mean) * 0.65;
      channel[i] = Math.max(-0.9, Math.min(0.9, val));
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainRef.current);

    const now = audioCtx.currentTime;
    if (nextPlayTimeRef.current < now) {
      nextPlayTimeRef.current = now + 0.01;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += outLen / targetRate;
  }, [frame, audioEnabled, isRunning]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);

  return { audioEnabled, toggleAudio };
}
