const cardSelector = ".game-card, .game-row, .playing-finished-game, .completed-row, .platinum-card";
const activationSelector = `button, a[href], [role="button"], input[type="button"], input[type="submit"], input[type="reset"], ${cardSelector}`;
const navigationSelector = ".mobile-action-dock, .floating-edit-actions, .floating-search-button, .scroll-top-button, .mobile-section-tabs";
const sliderSelector = ".playing-list, .playing-finished-list, .goty-choice-list, .goty-stats-preview-list, .finished-stats-playtime-list";
const sliderButtonSelector = ".playing-slider-button, .goty-stats-preview-nav, .finished-stats-playtime-nav";
const boundRoots = new WeakSet();
const handledEvents = new WeakSet();
const sliderStates = new WeakMap();
const diagnosticListeners = new Set();
export const SOUND_PROFILES = {
  ds: { label: "DS", description: "Crisp, tiny digital clicks and playful handheld notes.", shape: "square", click: 780, end: 520, gain: 0.025, tail: 0.055, harmonic: 2, shimmer: 0.005, hover: 1550, noise: 0.035, rating: 392, ratingShape: "triangle", ratingTail: 0.11, low: 900, high: 3400 },
  "3ds": { label: "3DS", description: "Rounded glassy taps, gentle chimes, and soft airy movement.", shape: "sine", click: 620, end: 930, gain: 0.065, tail: 0.075, harmonic: 2, shimmer: 0.012, hover: 1200, noise: 0.03, rating: 330, ratingShape: "sine", ratingTail: 0.12, low: 600, high: 2600 },
  ps2: { label: "PS2", description: "Lower, spacious tones with a floating harmonic tail.", shape: "sine", click: 310, end: 207, gain: 0.06, tail: 0.12, harmonic: 1.5, shimmer: 0.02, hover: 760, noise: 0.025, rating: 196, ratingShape: "sine", ratingTail: 0.18, low: 350, high: 1700 },
  dreamcast: { label: "Dreamcast", description: "Bright arcade-like taps and a warm, optimistic chime.", shape: "triangle", click: 880, end: 1320, gain: 0.05, tail: 0.08, harmonic: 1.5, shimmer: 0.018, hover: 1800, noise: 0.04, rating: 440, ratingShape: "sine", ratingTail: 0.11, low: 900, high: 3200 },
};
let soundProfile = "3ds";

export function setSoundProfile(profile) {
  if (!Object.hasOwn(SOUND_PROFILES, profile)) return false;
  soundProfile = profile;
  reportSound("profile");
  return true;
}

let context;
let snapBuffer;
let swipeBuffer;
let lastPlayed = -Infinity;

export function getSoundStatus() {
  return {
    supported: Boolean(window.AudioContext || window.webkitAudioContext),
    state: context?.state || "locked",
    sampleRate: context?.sampleRate || null,
    profile: soundProfile,
  };
}

export function subscribeSoundDiagnostics(listener) {
  diagnosticListeners.add(listener);
  return () => diagnosticListeners.delete(listener);
}

function reportSound(type, detail = {}) {
  for (const listener of diagnosticListeners) {
    try { listener({ type, ...detail, ...getSoundStatus() }); } catch { /* Diagnostics cannot interrupt audio. */ }
  }
}

function unlockAudio(event) {
  if (!event.isTrusted) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    if (!context) {
      context = new AudioContext();
      context.addEventListener("statechange", () => reportSound("audio-state"));
      reportSound("audio-state");
    }
    if (context.state === "suspended") return context.resume().catch(() => {});
  } catch {
    // Audio support or permission must never interrupt browsing.
    reportSound("audio-error");
  }
}

function playVoice(start, end, shape, gain, duration, delay = 0) {
  const now = context.currentTime + delay;
  const tone = context.createOscillator();
  tone.type = shape;
  tone.frequency.setValueAtTime(start, now);
  tone.frequency.exponentialRampToValueAtTime(end, now + Math.min(0.04, duration * 0.6));
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 5000;
  const volume = context.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(gain, now + 0.004);
  volume.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.005);
  tone.connect(filter).connect(volume).connect(context.destination);
  tone.onended = () => { tone.disconnect(); filter.disconnect(); volume.disconnect(); };
  tone.start(now);
  tone.stop(now + duration);
}

function playClick(higherPitch) {
  if (context?.state !== "running") return;
  const style = SOUND_PROFILES[soundProfile];
  const pitch = higherPitch ? 1.25 : 1;
  playVoice(style.click * pitch, style.end * pitch, style.shape, style.gain, style.tail);
  playVoice(style.click * pitch * style.harmonic, style.end * pitch * style.harmonic, "sine", style.shimmer, style.tail * 1.2);
  reportSound(higherPitch ? "navigation" : "click", { frequency: style.click * pitch, duration: Math.round(style.tail * 1.2 * 1000) });
}

function withAudio(event, play) {
  const ready = unlockAudio(event);
  if (context?.state === "running") play();
  else if (ready) {
    const activatedAt = performance.now();
    void ready.then(() => {
      if (performance.now() - activatedAt < 150) play();
    });
  }
}

export function playRatingSound(value, previousValue, event) {
  if (!event?.isTrusted || value === previousValue) return;
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  withAudio(event, () => {
    if (context?.state !== "running") return;
    const style = SOUND_PROFILES[soundProfile];
    const frequency = style.rating * 2 ** (rating / 2.5);
    const start = frequency * (value > previousValue ? 0.88 : 1.12);
    playVoice(start, frequency, style.ratingShape, 0.065, style.ratingTail);
    playVoice(start * style.harmonic, frequency * style.harmonic, "sine", style.shimmer, style.ratingTail * 1.15, 0.008);
    reportSound("rating", { value: rating, previousValue, frequency, duration: Math.round((style.ratingTail * 1.15 + 0.008) * 1000) });
  });
}

function playSnap() {
  if (context?.state !== "running") return;
  const now = context.currentTime;
  if (now - lastPlayed < 0.07) return;
  lastPlayed = now;
  const style = SOUND_PROFILES[soundProfile];
  playVoice(style.hover, style.hover * 0.82, "sine", 0.022, 0.035);
  if (!snapBuffer) {
    snapBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.035), context.sampleRate);
    const samples = snapBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = snapBuffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = style.hover * 1.5;
  filter.Q.value = 0.7;
  const volume = context.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(style.noise, now + 0.002);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
  source.connect(filter).connect(volume).connect(context.destination);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    volume.disconnect();
  };
  source.start(now);
  source.stop(now + 0.035);
  reportSound("hover", { duration: 35 });
}

function playSwipe(direction) {
  if (context?.state !== "running") return;
  const now = context.currentTime;
  const style = SOUND_PROFILES[soundProfile];
  if (!swipeBuffer) {
    swipeBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.18), context.sampleRate);
    const samples = swipeBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = swipeBuffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.65;
  filter.frequency.setValueAtTime(direction > 0 ? style.low : style.high, now);
  filter.frequency.exponentialRampToValueAtTime(direction > 0 ? style.high : style.low, now + 0.15);
  const volume = context.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(0.075, now + 0.035);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.175);
  source.connect(filter).connect(volume).connect(context.destination);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    volume.disconnect();
  };
  source.start(now);
  source.stop(now + 0.18);
  reportSound("swipe", { direction, duration: 180 });
}

/** The developer lab previews the same generators used by real interactions. */
export function previewSound(type, event) {
  if (!event?.isTrusted) return;
  withAudio(event, () => {
    if (type === "hover") playSnap();
    else if (type === "click") playClick(false);
    else if (type === "navigation") playClick(true);
    else if (type === "swipe") playSwipe(1);
  });
}

function armSlider(event) {
  if (!event.isTrusted) return;
  const path = event.composedPath();
  let list = path.find(node => node.matches?.(sliderSelector));
  if (!list && path.some(node => node.matches?.(sliderButtonSelector))) {
    const section = path.find(node => node.matches?.(".playing-current, .goty-picker-field, .goty-stats-preview-strip, .finished-stats-playtime-strip"));
    list = section?.querySelector(sliderSelector);
  }
  if (!list) return;
  let state = sliderStates.get(list);
  if (!state) {
    state = { left: list.scrollLeft, sounded: false, timer: 0 };
    sliderStates.set(list, state);
  }
  if (event.type === "pointerover") return;
  // Passive wheel handlers may run after compositor scrolling has already started.
  if (event.type !== "wheel" && !state.sounded && performance.now() > (state.armedUntil || 0)) state.left = list.scrollLeft;
  state.armedUntil = performance.now() + 1500;
}

function sliderScrolled(event) {
  const list = event.target;
  const state = sliderStates.get(list);
  if (!state) return;
  if (!state.armedUntil || performance.now() > state.armedUntil) {
    state.left = list.scrollLeft;
    return;
  }
  const delta = list.scrollLeft - state.left;
  if (!state.sounded && Math.abs(delta) >= 8) {
    playSwipe(Math.sign(delta));
    state.sounded = true;
  }
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    state.left = list.scrollLeft;
    state.sounded = false;
    state.armedUntil = 0;
  }, 150);
}

/** Delegation also covers cards appended by batch loading and shadow-root Shelf cards. */
export function bindCardHoverSounds(root) {
  if (boundRoots.has(root)) return;
  boundRoots.add(root);
  root.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  root.addEventListener("keydown", unlockAudio, { capture: true, passive: true });
  for (const type of ["pointerover", "pointerdown", "wheel", "keydown"]) {
    root.addEventListener(type, armSlider, { capture: true, passive: true });
  }
  root.addEventListener("scroll", sliderScrolled, { capture: true, passive: true });
  root.addEventListener("click", event => {
    if (!event.isTrusted || handledEvents.has(event)) return;
    const path = event.composedPath();
    if (path.some(node => node.matches?.("[data-sound-preview]"))) return;
    // Rating controls play their own tone after the new value is applied.
    if (path.some(node => node.matches?.(".rating-row"))) return;
    if (path.some(node => node.matches?.(sliderButtonSelector))) return;
    const control = path.find(node => node.matches?.(activationSelector));
    if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
    handledEvents.add(event);
    const higherPitch = path.some(node => node.matches?.(navigationSelector));
    withAudio(event, () => playClick(higherPitch));
  }, { capture: true, passive: true });
  root.addEventListener("pointerover", event => {
    if (event.pointerType === "touch" || event.buttons || handledEvents.has(event)) return;
    const card = event.composedPath().find(node => node.matches?.(cardSelector));
    if (!card || card.contains(event.relatedTarget)) return;
    handledEvents.add(event);
    playSnap();
  }, { passive: true });
}
