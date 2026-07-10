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

// Plays a single short tone: an oscillator whose volume ramps up quickly
// then decays away exponentially, so it sounds like a soft "blip" rather
// than an abrupt click at the start/end.
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

// A "sound theme" is just a fixed sequence of beep() calls for each
// outcome. Each one is deliberately built from a different waveform/pitch
// pattern so the 4 themes feel distinct rather than just louder/quieter
// versions of each other.
export const SOUND_THEMES = {
  classic: {
    label: 'settings.sound.theme.classic',
    correct: [
      { freq: 660, duration: 0.12 },
      { freq: 880, duration: 0.16, delay: 0.1 },
    ],
    wrong: [{ freq: 220, duration: 0.22, type: 'square', gain: 0.1 }],
  },
  arcade: {
    label: 'settings.sound.theme.arcade',
    correct: [
      { freq: 523, duration: 0.07, type: 'square' },
      { freq: 659, duration: 0.07, delay: 0.07, type: 'square' },
      { freq: 784, duration: 0.12, delay: 0.14, type: 'square' },
    ],
    wrong: [
      { freq: 300, duration: 0.15, type: 'sawtooth', gain: 0.1 },
      { freq: 180, duration: 0.18, delay: 0.12, type: 'sawtooth', gain: 0.1 },
    ],
  },
  chime: {
    label: 'settings.sound.theme.chime',
    correct: [
      { freq: 784, duration: 0.35, gain: 0.12 },
      { freq: 988, duration: 0.4, delay: 0.05, gain: 0.1 },
    ],
    wrong: [{ freq: 220, duration: 0.3, gain: 0.12 }],
  },
  marimba: {
    label: 'settings.sound.theme.marimba',
    correct: [
      { freq: 440, duration: 0.1, type: 'triangle' },
      { freq: 554, duration: 0.1, delay: 0.09, type: 'triangle' },
      { freq: 659, duration: 0.15, delay: 0.18, type: 'triangle' },
    ],
    wrong: [
      { freq: 330, duration: 0.15, type: 'triangle', gain: 0.12 },
      { freq: 247, duration: 0.2, delay: 0.12, type: 'triangle', gain: 0.12 },
    ],
  },
};

function playSequence(ctx, sequence) {
  for (const config of sequence) beep(ctx, config);
}

// Exposes playCorrect/playWrong for the player's currently-selected sound
// theme, both respecting the mute setting.
export function useSound() {
  const { settings } = useSettings();
  // A ref (rather than reading settings directly in the closures below) so
  // the mute/theme check always sees the latest value even if
  // playCorrect/playWrong were captured by an event handler set up on an
  // earlier render.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const playCorrect = () => {
    if (settingsRef.current.soundMuted) return;
    const theme = SOUND_THEMES[settingsRef.current.soundTheme] || SOUND_THEMES.classic;
    playSequence(getAudioContext(), theme.correct);
  };

  const playWrong = () => {
    if (settingsRef.current.soundMuted) return;
    const theme = SOUND_THEMES[settingsRef.current.soundTheme] || SOUND_THEMES.classic;
    playSequence(getAudioContext(), theme.wrong);
  };

  // Auditions a theme regardless of the mute setting - used by the
  // settings screen's preview button, where muting shouldn't prevent the
  // player from previewing what a theme sounds like.
  const previewTheme = (themeKey) => {
    const theme = SOUND_THEMES[themeKey] || SOUND_THEMES.classic;
    playSequence(getAudioContext(), theme.correct);
  };

  return { playCorrect, playWrong, previewTheme };
}
