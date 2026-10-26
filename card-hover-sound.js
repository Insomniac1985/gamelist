const cardSelector = ".game-card, .game-row, .playing-finished-game, .completed-row, .platinum-card";
const activationSelector = `button, a[href], [role="button"], input[type="button"], input[type="submit"], input[type="reset"], [data-stat-action], .playing-finished .achievement-subtitle, ${cardSelector}`;
const navigationSelector = ".mobile-action-dock, .floating-edit-actions, .floating-search-button, .scroll-top-button, .mobile-section-tabs";
const sliderSelector = ".playing-list, .playing-finished-list, .goty-choice-list, .goty-stats-preview-list, .finished-stats-playtime-list";
const sliderButtonSelector = ".playing-slider-button, .goty-stats-preview-nav, .finished-stats-playtime-nav";
const boundRoots = new WeakSet();
const handledEvents = new WeakSet();
const sliderStates = new WeakMap();
const sliderInputEvents = new WeakSet();
const diagnosticListeners = new Set();
export const CUSTOM_SOUND = Object.freeze({
  label: "Custom", click: 310, end: 207, shape: "sine", gain: 0.06, tail: 0.12,
  harmonic: 1.5, shimmer: 0.02, low: 350, high: 1700,
  rating: 330, ratingShape: "sine", ratingTail: 0.12,
});
const style = CUSTOM_SOUND;
let suppressHoverUntil = 0;

function readSoundsDisabled() {
  try { return JSON.parse(window.localStorage?.getItem("gamelist:settings:v1") || "{}")?.disableSounds === true; }
  catch { return false; }
}
function readSessionMuted() {
  try { return window.sessionStorage?.getItem("gamelist:sounds-muted") === "true"; }
  catch { return false; }
}
let globalSoundsDisabled = readSoundsDisabled();
let soundsDisabled = globalSoundsDisabled || readSessionMuted();
let outputGain;
export function setSoundsDisabled(disabled) {
  globalSoundsDisabled = disabled === true;
  const next = globalSoundsDisabled || readSessionMuted();
  if (soundsDisabled === next) return;
  soundsDisabled = next;
  if (outputGain) outputGain.gain.setValueAtTime(next ? 0 : 1, context.currentTime);
  reportSound("audio-state");
}

export function setSessionSoundsEnabled(enabled) {
  try { window.sessionStorage?.setItem("gamelist:sounds-muted", String(!enabled)); } catch { /* The current page can still be muted. */ }
  soundsDisabled = globalSoundsDisabled || !enabled;
  if (outputGain) outputGain.gain.setValueAtTime(soundsDisabled ? 0 : 1, context.currentTime);
  reportSound("audio-state");
}
window.addEventListener?.("storage", event => {
  if (event.key === "gamelist:settings:v1" || event.key === null) setSoundsDisabled(readSoundsDisabled());
});

let context;
let swipeBuffer;
let lastPlayed = -Infinity;
let postureBound = false;

export function getSoundStatus() {
  return {
    supported: Boolean(window.AudioContext || window.webkitAudioContext),
    disabled: soundsDisabled,
    state: context?.state || "locked",
    sampleRate: context?.sampleRate || null,
    profile: "custom",
    postureSupported: Boolean(window.navigator?.devicePosture),
    posture: window.navigator?.devicePosture?.type || null,
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
  if (!event.isTrusted || soundsDisabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    if (!context) {
      context = new AudioContext();
      outputGain = context.createGain();
      outputGain.gain.value = soundsDisabled ? 0 : 1;
      outputGain.connect(context.destination);
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
  tone.connect(filter).connect(volume).connect(outputGain);
  tone.onended = () => { tone.disconnect(); filter.disconnect(); volume.disconnect(); };
  tone.start(now);
  tone.stop(now + duration);
}

function playClick(higherPitch) {
  if (soundsDisabled || context?.state !== "running") return;
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
    if (soundsDisabled || context?.state !== "running") return;
    const frequency = style.rating * 2 ** (rating / 2.5);
    const start = frequency * (value > previousValue ? 0.88 : 1.12);
    playVoice(start, frequency, style.ratingShape, 0.065, style.ratingTail);
    playVoice(start * 2, frequency * 2, "sine", 0.012, style.ratingTail * 1.15, 0.008);
    reportSound("rating", { value: rating, previousValue, frequency, duration: Math.round((style.ratingTail * 1.15 + 0.008) * 1000) });
  });
}

function playSnap() {
  if (soundsDisabled || context?.state !== "running") return;
  const now = context.currentTime;
  if (now - lastPlayed < 0.06) return;
  lastPlayed = now;
  playVoice(360, 190, "triangle", 0.032, 0.028);
  playVoice(1350, 720, "sine", 0.008, 0.018);
  reportSound("hover", { duration: 28 });
}

function playAction(type, hover = false) {
  if (soundsDisabled || context?.state !== "running") return;
  const notes = {
    playing: [440, 660], stream: [520, 780], backlog: [460, 330],
    complete: [660, 880], delete: [180, 95], "add-game": [620, 830, 990],
  }[type] || [310];
  notes.forEach((frequency, i) => playVoice(frequency * 0.9, frequency,
    type === "delete" ? "triangle" : "sine", hover ? 0.022 : 0.045,
    hover ? 0.065 : 0.11, i * (hover ? 0.025 : 0.045)));
  reportSound(hover ? `hover-${type}` : type, { duration: hover ? 120 : 220 });
}

export function playUiSound(type, { direction = 1 } = {}) {
  if (soundsDisabled || context?.state !== "running") return;
  if (type === "swipe") { playSwipe(direction); return; }
  if (type === "fold" || type === "unfold") { playFold(type === "unfold"); return; }
  if (type === "hover") { playSnap(); return; }
  if (type === "click" || type === "navigation") { playClick(type === "navigation"); return; }
  if (type === "calendar") {
    playVoice(470, 590, "sine", 0.045, 0.09);
    reportSound(type, { duration: 90 }); return;
  }
  if (type === "congrats") {
    [523, 659, 784, 1046].forEach((frequency, i) => {
      playVoice(frequency, frequency, "sine", 0.045, 0.23, i * 0.095);
      playVoice(frequency * 1.5, frequency * 1.5, "sine", 0.009, 0.26, i * 0.095);
    });
    reportSound(type, { duration: 545 }); return;
  }
  if (type === "bounce-up" || type === "bounce-down") {
    const base = type === "bounce-up" ? 620 : 310;
    playVoice(base * 0.65, base, "sine", 0.045, 0.1);
    playVoice(base * 1.2, base, "sine", 0.025, 0.13, 0.075);
    reportSound(type, { duration: 205 }); return;
  }
  playAction(type);
}

let cancelScrollArrival;
export function scrollWithSound(target) {
  if (target == null) return;
  cancelScrollArrival?.();
  const start = window.scrollY;
  let moved = false;
  let timer;
  let deadline;
  const cleanup = () => {
    window.clearTimeout(timer); window.clearTimeout(deadline);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", onScrollEnd);
    for (const type of ["wheel", "touchmove", "pointerdown"]) window.removeEventListener(type, cleanup);
    if (cancelScrollArrival === cleanup) cancelScrollArrival = null;
  };
  const finish = () => {
    const delta = window.scrollY - start;
    cleanup();
    if (moved && Math.abs(delta) > 16) playUiSound(delta < 0 ? "bounce-up" : "bounce-down");
  };
  const onScrollEnd = event => {
    if (moved && (event.target === window.document || event.target === window)) finish();
  };
  const onScroll = () => {
    moved ||= Math.abs(window.scrollY - start) > 4;
    window.clearTimeout(timer); timer = window.setTimeout(finish, 180);
  };
  cancelScrollArrival = cleanup;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", onScrollEnd, { passive: true });
  for (const type of ["wheel", "touchmove", "pointerdown"]) window.addEventListener(type, cleanup, { passive: true });
  deadline = window.setTimeout(cleanup, 3000);
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function playSwipe(direction) {
  if (soundsDisabled || context?.state !== "running") return;
  const now = context.currentTime;
  if (!swipeBuffer) {
    swipeBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.18), context.sampleRate);
    const samples = swipeBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = swipeBuffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(direction > 0 ? style.low : style.high, now);
  filter.frequency.exponentialRampToValueAtTime(direction > 0 ? style.high : style.low, now + 0.15);
  const volume = context.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(0.045, now + 0.035);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.175);
  source.connect(filter).connect(volume).connect(outputGain);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    volume.disconnect();
  };
  source.start(now);
  source.stop(now + 0.18);
  const bubbles = direction > 0 ? [0.9, 1.1] : [1.1, 0.9];
  bubbles.forEach((ratio, index) => {
    const pitch = style.click * 1.7 * ratio;
    playVoice(pitch * 0.82, pitch, "sine", 0.006 - index * 0.0015, 0.085, index * 0.055);
  });
  suppressHoverUntil = performance.now() + 260;
  reportSound("swipe", { direction, duration: 180 });
}

function playFold(unfolding) {
  if (soundsDisabled || context?.state !== "running") return;
  const start = unfolding ? 310 : 440;
  const end = unfolding ? 465 : 220;
  playVoice(start, end, "sine", 0.055, 0.105);
  playVoice(end * 1.5, end * 1.5, "sine", 0.015, 0.1, 0.035);
  reportSound(unfolding ? "unfold" : "fold", { frequency: start, duration: 135 });
}

function bindPostureSounds() {
  // The shared editor iframe must not duplicate the top-level page's posture sound.
  if (postureBound || (window.top && window.top !== window)) return;
  const posture = window.navigator?.devicePosture;
  if (!posture?.addEventListener) return;
  postureBound = true;
  let previous = posture.type;
  posture.addEventListener("change", () => {
    const next = posture.type;
    if (!["folded", "continuous"].includes(next) || next === previous) return;
    const wasKnown = ["folded", "continuous"].includes(previous);
    previous = next;
    reportSound("posture");
    if (!wasKnown || window.document?.visibilityState !== "visible") return;
    // Never unlock or queue sound from a sensor event; audio needs prior interaction.
    playFold(next === "continuous");
  });
}

/** The developer lab previews the same generators used by real interactions. */
export function previewSound(type, event) {
  if (!event?.isTrusted) return;
  withAudio(event, () => playUiSound(type));
}

function finishSlider(list, state) {
  window.clearTimeout(state.timer);
  state.timer = 0;
  state.left = state.observedLeft = list.scrollLeft;
  state.sounded = false;
  state.armedUntil = 0;
}

function armSlider(event) {
  if (!event.isTrusted || sliderInputEvents.has(event)) return;
  const path = event.composedPath();
  const isButton = path.some(node => node.matches?.(sliderButtonSelector));
  if (event.type === "click" && !isButton) return;
  let list = path.find(node => node.matches?.(sliderSelector));
  if (!list && isButton) {
    const section = path.find(node => node.matches?.(".playing-current, .goty-picker-field, .goty-stats-preview-strip, .finished-stats-playtime-strip"));
    list = section?.querySelector(sliderSelector);
  }
  if (!list) return;
  sliderInputEvents.add(event);
  let state = sliderStates.get(list);
  if (!state) {
    state = { left: list.scrollLeft, observedLeft: list.scrollLeft, sounded: false, timer: 0, generation: 0, lastWheel: -Infinity };
    sliderStates.set(list, state);
  }
  if (event.type === "pointerover") return;
  const now = performance.now();
  const wheelDirection = Math.sign(event.deltaX || 0);
  const newGesture = event.type !== "wheel" || !state.armedUntil
    || now > state.armedUntil || now - state.lastWheel > 180
    || wheelDirection !== state.wheelDirection;
  if (newGesture) {
    window.clearTimeout(state.timer);
    state.timer = 0;
    state.generation++;
    // Passive wheel handlers can run after compositor scrolling starts.
    state.left = event.type === "wheel" ? state.observedLeft : list.scrollLeft;
    state.sounded = false;
  }
  if (event.type === "wheel") {
    state.lastWheel = now;
    state.wheelDirection = wheelDirection;
  }
  state.armedUntil = now + 2000;
}

function sliderScrolled(event) {
  const list = event.target;
  const state = sliderStates.get(list);
  if (!state) return;
  suppressHoverUntil = performance.now() + 220;
  state.observedLeft = list.scrollLeft;
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
  const generation = state.generation;
  state.timer = window.setTimeout(() => {
    if (state.generation === generation) finishSlider(list, state);
  }, 180);
}

const hoverSelector = `${cardSelector}, button, a[href], [role="button"], .playing-finished .achievement-subtitle, label.check-filter, label.toggle-check, .stat, .achievement-kpi, .finished-stats-kpi, [data-stats-overlay-title], .finished-stats-game-row, .finished-stats-platform-row, .finished-stats-category-row, .finished-stats-month, .finished-stats-pie-segment, .finished-stats-chart-list > *, .finished-stats-mini-list > *, .goty-card:not(.goty-card-empty), .goty-choice-card, .goty-stats-preview-card, .showcase-picker-card, .showcase-selected-slot:not(.is-empty), .favorite-card`;
const discreteSliderSelector = "[data-calendar-shift], [data-stats-source-tab], [data-mobile-section], [data-game-target], [data-game-destination], [data-gamelist-target], [data-gamelist-section], [data-shelf-tab], .media-format-toggle, [role='tab']";

function actionKind(control) {
  if (control?.matches?.(`${cardSelector}, .completed-stream-toggle, .playing-stream-toggle, .local-sound-toggle`)) return null;
  if (["playing", "stream", "backlog", "complete", "delete", "add-game"].includes(control?.dataset?.soundAction)) return control.dataset.soundAction;
  const input = control?.matches?.("input") ? control : control?.control || control?.querySelector?.("input");
  const key = `${control?.id || ""} ${control?.className?.baseVal ?? control?.className ?? ""} ${control?.dataset?.action || ""} ${input?.id || ""}`;
  if (/delete|danger-button/i.test(key)) return "delete";
  if (/addGameButton|^addButton |floatingAddButton|mobileDockAdd|mobileDockEdit|add-collection-action|data-add-search/i.test(key) || control?.hasAttribute?.("data-add-search")) return "add-game";
  if (/stream/i.test(key)) return "stream";
  if (/backlog|bought-action|shelfAddCollection/i.test(key)) return "backlog";
  if (/complete-action/.test(key)) return control.closest(".playing-list, .playing-card") ? "complete" : "playing";
  if (/playing-completed|trophy-action|platinum|finishPlatinum/i.test(key)) return "complete";
  if (/playingInput|playing-check|row-primary-action|play-action/i.test(key)) return "playing";
  return null;
}

function isActiveTab(control) {
  return control.matches(".active, [aria-pressed='true'], [aria-selected='true'], [aria-current='page']");
}

/** Delegation covers newly rendered controls and the collection's shadow surfaces. */
export function bindCardHoverSounds(root) {
  if (boundRoots.has(root)) return;
  boundRoots.add(root);
  bindPostureSounds();
  root.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  root.addEventListener("keydown", unlockAudio, { capture: true, passive: true });
  for (const type of ["pointerover", "pointerdown", "wheel", "keydown", "click"]) {
    root.addEventListener(type, armSlider, { capture: true, passive: true });
  }
  root.addEventListener("scroll", event => {
    suppressHoverUntil = performance.now() + 220;
    sliderScrolled(event);
  }, { capture: true, passive: true });
  root.addEventListener("scrollend", event => {
    const state = sliderStates.get(event.target);
    if (state?.sounded) finishSlider(event.target, state);
  }, { capture: true, passive: true });
  root.addEventListener("change", event => {
    if (!event.isTrusted || handledEvents.has(event)) return;
    const input = event.composedPath()[0];
    if (!input.matches?.("input[type='checkbox'], input[type='radio'], select, input[type='date']") || input.closest(".rating-row")) return;
    handledEvents.add(event);
    const kind = actionKind(input) || (input.matches("input[type='date']") ? "calendar" : "click");
    withAudio(event, () => playUiSound(kind));
  }, { capture: true, passive: true });
  root.addEventListener("click", event => {
    if (!event.isTrusted || handledEvents.has(event)) return;
    const path = event.composedPath();
    if (path.some(node => node.matches?.("[data-sound-preview], .rating-row"))) return;
    const control = path.find(node => node.matches?.(`${activationSelector}, input[type='checkbox'], input[type='radio'], input[type='date'], select, label`));
    if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
    const input = control.matches("input") ? control : control.control || control.querySelector?.("input");
    if (input?.matches("input[type='checkbox'], input[type='radio']")) return;
    if (path.some(node => node.matches?.(sliderButtonSelector))) return;
    handledEvents.add(event);
    if (control.matches(discreteSliderSelector)) {
      if (!isActiveTab(control)) withAudio(event, () => playSwipe(Number(control.dataset.calendarShift) || 1));
      return;
    }
    const kind = actionKind(control) || (control.matches("[data-calendar-today], .release-day, input[type='date']") ? "calendar" : path.some(node => node.matches?.(navigationSelector)) ? "navigation" : "click");
    withAudio(event, () => playUiSound(kind));
  }, { capture: true, passive: true });
  root.addEventListener("pointerover", event => {
    if (event.pointerType === "touch" || event.buttons || handledEvents.has(event) || performance.now() < suppressHoverUntil) return;
    const path = event.composedPath();
    const target = path.find(node => node.matches?.(hoverSelector));
    if (!target || target.contains(event.relatedTarget) || target.matches(`:disabled, [aria-disabled='true'], [data-sound-preview], ${sliderButtonSelector}`)) return;
    if (target.control?.disabled) return;
    const kind = actionKind(target);
    if (target.matches(".goty-card-empty, .showcase-selected-slot.is-empty")) return;
    handledEvents.add(event);
    if (kind) playAction(kind, true);
    else playSnap();
  }, { passive: true });
}
