import { useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

// Sound effects are synthesized on the fly with the Web Audio API instead
// of shipping .mp3/.wav files - keeps the bundle small and needs no audio
// assets to maintain. One AudioContext is shared across the whole app
// (browsers only allow a limited number, and it needs to persist across
// re-renders/mounts of whatever component happens to play a sound).
let sharedCtx = null;
function getAudioContext() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

// Plays a single short tone: a sine (or square) wave oscillator whose
// volume ramps up quickly then decays away exponentially, so it sounds
// like a soft "blip" rather than an abrupt click at the start/end.
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

// Exposes playCorrect/playWrong, both respecting the player's mute setting.
export function useSound() {
  const { settings } = useSettings();
  // A ref (rather than reading `settings.soundMuted` directly in the
  // closures below) so the mute check always sees the latest value even
  // if playCorrect/playWrong were captured by an event handler set up on
  // an earlier render.
  const mutedRef = useRef(settings.soundMuted);
  mutedRef.current = settings.soundMuted;

  // Correct answer: two quick ascending notes (an upward "ding-ding").
  const playCorrect = () => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    beep(ctx, { freq: 660, duration: 0.12 });
    beep(ctx, { freq: 880, duration: 0.16, delay: 0.1 });
  };

  // Wrong answer / timeout: one low, slightly harsher buzz.
  const playWrong = () => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    beep(ctx, { freq: 220, duration: 0.22, type: 'square', gain: 0.1 });
  };

  return { playCorrect, playWrong };
}
