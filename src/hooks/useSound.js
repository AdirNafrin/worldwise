import { useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

let sharedCtx = null;
function getAudioContext() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

function beep(ctx, { freq, duration, delay = 0, type = 'sine', gain = 0.15 }) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ctx.currentTime + delay;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gainNode).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function useSound() {
  const { settings } = useSettings();
  const mutedRef = useRef(settings.soundMuted);
  mutedRef.current = settings.soundMuted;

  const playCorrect = () => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    beep(ctx, { freq: 660, duration: 0.12 });
    beep(ctx, { freq: 880, duration: 0.16, delay: 0.1 });
  };

  const playWrong = () => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    beep(ctx, { freq: 220, duration: 0.22, type: 'square', gain: 0.1 });
  };

  return { playCorrect, playWrong };
}
