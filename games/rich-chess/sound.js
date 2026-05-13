/* =========================
   RICH CHESS SOUND ENGINE
   /games/rich-chess/sound.js
========================= */

let audioContext = null;
let muted = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioContext;
}

function playTone({
  frequency = 440,
  duration = 0.12,
  type = "sine",
  gain = 0.08,
  slideTo = null
} = {}) {
  if (muted) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(
      slideTo,
      ctx.currentTime + duration
    );
  }

  volume.gain.setValueAtTime(0.0001, ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  oscillator.connect(volume);
  volume.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration + 0.02);
}

function playMoveSound() {
  playTone({
    frequency: 420,
    slideTo: 660,
    duration: 0.13,
    type: "triangle",
    gain: 0.075
  });
}

function playSelectSound() {
  playTone({
    frequency: 720,
    duration: 0.07,
    type: "sine",
    gain: 0.045
  });
}

function playCaptureSound() {
  playTone({
    frequency: 180,
    slideTo: 70,
    duration: 0.18,
    type: "sawtooth",
    gain: 0.085
  });

  setTimeout(() => {
    playTone({
      frequency: 520,
      slideTo: 760,
      duration: 0.12,
      type: "triangle",
      gain: 0.055
    });
  }, 80);
}

function playCheckSound() {
  playTone({
    frequency: 880,
    slideTo: 440,
    duration: 0.22,
    type: "square",
    gain: 0.045
  });
}

function playWinSound() {
  const notes = [392, 494, 587, 784, 988];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone({
        frequency: note,
        duration: 0.16,
        type: "triangle",
        gain: 0.07
      });
    }, index * 110);
  });
}

function playErrorSound() {
  playTone({
    frequency: 160,
    slideTo: 120,
    duration: 0.14,
    type: "square",
    gain: 0.035
  });
}

function playRoomSound() {
  playTone({
    frequency: 300,
    slideTo: 900,
    duration: 0.22,
    type: "triangle",
    gain: 0.065
  });
}

function playTournamentSound() {
  const notes = [523, 659, 784, 1046];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone({
        frequency: note,
        duration: 0.13,
        type: "sine",
        gain: 0.06
      });
    }, index * 90);
  });
}

function toggleMute() {
  muted = !muted;
  return muted;
}

function setMuted(value) {
  muted = Boolean(value);
}

function isMuted() {
  return muted;
}

export {
  playMoveSound,
  playSelectSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playErrorSound,
  playRoomSound,
  playTournamentSound,
  toggleMute,
  setMuted,
  isMuted
};
