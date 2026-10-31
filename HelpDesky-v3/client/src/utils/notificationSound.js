const CHIME_LOCK = 'helpdesky-notification-chime';
const MIN_GAP_MS = 1000;
const NOTES = [
  { frequency: 659.25, start: 0 },
  { frequency: 880, start: 0.12 }
];

let context = null;
let lastPlayedAt = 0;

// Browsers only allow audio after the person has interacted with the page, so the audio
// context is created on their first click or key press. Signing in already counts as one.
export const enableNotificationSound = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return () => {};

  const unlock = () => {
    context = context || new AudioContextClass();
    context.resume().catch(() => {});
    removeListeners();
  };
  const removeListeners = () => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };

  if (navigator.userActivation?.hasBeenActive) {
    unlock();
    return removeListeners;
  }

  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  return removeListeners;
};

const ring = () => {
  const startAt = context.currentTime;

  NOTES.forEach(({ frequency, start }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + start;

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.4);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.4);
  });
};

const playChime = () => {
  context.resume().then(ring).catch(() => {});
};

export const playNotificationSound = () => {
  if (!context) return;

  // Every open tab receives each notification. Holding this lock for the gap means only one tab
  // plays it, and a burst of notifications doesn't turn into a burst of sound.
  if (navigator.locks) {
    navigator.locks.request(CHIME_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      playChime();
      await new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS));
    }).catch(() => {});
    return;
  }

  // Locks need HTTPS. Without them each tab can only limit its own chimes.
  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;
  playChime();
};
