import assert from "node:assert/strict";

let audio;
const parameter = () => ({
  value: 0,
  setValueAtTime(value) { this.start = value; },
  linearRampToValueAtTime(value) { this.peak = value; },
  exponentialRampToValueAtTime(value) { this.end = value; },
});
const node = () => ({
  frequency: parameter(), gain: parameter(), Q: parameter(),
  connect(next) { return next; }, disconnect() {}, start() {}, stop() {},
});
class TestAudioContext {
  constructor() {
    audio = this;
    this.state = "running";
    this.sampleRate = 48000;
    this.currentTime = 0;
    this.destination = {};
    this.voices = [];
    this.volumes = [];
  }
  addEventListener() {}
  createOscillator() { const voice = node(); this.voices.push(voice); return voice; }
  createGain() { const volume = node(); this.volumes.push(volume); return volume; }
  createBiquadFilter() { return node(); }
  createBufferSource() { return node(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
}
globalThis.window = { AudioContext: TestAudioContext };
const sound = await import("../card-hover-sound.js");
const trusted = { isTrusted: true };
const events = [];
const unsubscribe = sound.subscribeSoundDiagnostics(event => events.push(event));
assert.equal(sound.getSoundStatus().state, "locked", "Reading diagnostics must not create an audio context");
sound.previewSound("click", { isTrusted: false });
assert.equal(audio, undefined, "Scripted interactions must stay silent");
assert.equal(sound.getSoundStatus().profile, "custom");

sound.previewSound("click", trusted);
assert.equal(events.at(-1).frequency, 310, "Clicks must retain the PS2-style voice");
sound.previewSound("navigation", trusted);
assert.equal(events.at(-1).frequency, 310 * 1.25);
let previous = -1;
let previousPitch = 0;
for (let value = 0; value <= 5; value += 0.5) {
  sound.playRatingSound(value, previous, trusted);
  const event = events.at(-1);
  assert.equal(event.type, "rating");
  assert.ok(event.frequency > previousPitch);
  assert.ok(audio.voices.at(-2).frequency.start < audio.voices.at(-2).frequency.end);
  previous = value;
  previousPitch = event.frequency;
}
assert.equal(previousPitch, 330 * 4, "Ratings must retain the 3DS voice");
sound.playRatingSound(1, 5, trusted);
assert.ok(audio.voices.at(-2).frequency.start > audio.voices.at(-2).frequency.end);
let count = events.length;
sound.playRatingSound(1, 1, trusted);
assert.equal(events.length, count, "Unchanged ratings stay silent");
for (const type of ["hover", "swipe", "fold", "unfold", "playing", "stream", "backlog", "complete", "delete", "add-game", "congrats", "bounce-up", "bounce-down", "calendar"]) {
  audio.currentTime += 1;
  sound.previewSound(type, trusted);
  assert.equal(events.at(-1).type, type, `${type} must have a distinct diagnostic event`);
}
assert.ok(audio.volumes.filter(volume => volume.gain.peak != null).every(volume => volume.gain.peak <= 0.1));
sound.setSoundsDisabled(true);
assert.equal(sound.getSoundStatus().disabled, true);
const voicesBeforeMute = audio.voices.length;
const mutedCount = events.filter(event => event.duration).length;
for (const type of ["click", "hover", "swipe", "fold", "unfold", "congrats", "add-game", "bounce-up"]) sound.previewSound(type, trusted);
sound.playRatingSound(5, 0, trusted);
assert.equal(audio.voices.length, voicesBeforeMute, "Muted interactions must not create voices");
assert.equal(events.filter(event => event.duration).length, mutedCount);
assert.equal(audio.volumes[0].gain.start, 0, "Master output must silence already scheduled voices");
sound.setSoundsDisabled(false);
assert.equal(audio.volumes[0].gain.start, 1);
sound.previewSound("click", trusted);
assert.ok(audio.voices.length > voicesBeforeMute);
unsubscribe();
count = events.length;
sound.previewSound("click", trusted);
assert.equal(events.length, count);

globalThis.window = {};
const unsupported = await import("../card-hover-sound.js?unsupported-test");
assert.equal(unsupported.getSoundStatus().supported, false);
assert.doesNotThrow(() => unsupported.previewSound("click", trusted));

const postureListeners = [];
const posture = { type: "continuous", addEventListener(type, listener) { postureListeners.push(listener); } };
globalThis.window = { AudioContext: TestAudioContext, navigator: { devicePosture: posture }, document: { visibilityState: "visible" } };
const foldable = await import("../card-hover-sound.js?posture-test");
const changes = [];
foldable.subscribeSoundDiagnostics(event => changes.push(event));
foldable.bindCardHoverSounds({ addEventListener() {} });
foldable.bindCardHoverSounds({ addEventListener() {} });
assert.equal(postureListeners.length, 1, "Main and Shelf must share one posture listener");
assert.equal(changes.length, 0, "Initial posture must be silent");
const transition = value => { posture.type = value; postureListeners[0](); };
transition("folded");
assert.equal(changes.filter(event => event.duration).length, 0, "Sensor events must not unlock audio");
foldable.previewSound("click", trusted);
changes.length = 0;
transition("continuous");
assert.equal(changes.filter(event => event.type === "unfold").length, 1);
transition("continuous");
assert.equal(changes.filter(event => event.type === "unfold").length, 1, "Duplicate posture events must stay silent");
transition("folded");
assert.equal(changes.filter(event => event.type === "fold").length, 1);
window.document.visibilityState = "hidden";
transition("continuous");
assert.equal(changes.filter(event => event.type === "unfold").length, 1, "Hidden pages must stay silent");
console.log("UI sound tests passed: custom action cues, pitch scaling, ratings, fold/unfold detection, duplicate/background/locked silence, diagnostics, unsupported audio.");

// Regress the consecutive-slider bug: a new movement must invalidate the old reset timer.
globalThis.window = { AudioContext: TestAudioContext, setTimeout, clearTimeout, document: { visibilityState: "visible" } };
const sliders = await import("../card-hover-sound.js?slider-regression");
const rootListeners = new Map();
const root = { addEventListener(type, fn) { const list = rootListeners.get(type) || []; list.push(fn); rootListeners.set(type, list); } };
const carousel = { scrollLeft: 0 };
const arrow = { matches: selector => selector.includes(".playing-slider-button") };
const section = { matches: selector => selector.includes(".playing-current"), querySelector: () => carousel };
const emit = (type, target = arrow) => {
  const event = { type, isTrusted: true, target, composedPath: () => [arrow, section] };
  for (const listener of rootListeners.get(type) || []) listener(event);
};
const swishes = [];
sliders.subscribeSoundDiagnostics(event => { if (event.type === "swipe") swishes.push(event); });
sliders.bindCardHoverSounds(root);
sliders.previewSound("click", trusted);
for (let i = 0; i < 8; i++) {
  emit("pointerdown");
  emit("click");
  carousel.scrollLeft += 100;
  emit("scroll", carousel);
  await new Promise(resolve => setTimeout(resolve, 20));
}
assert.equal(swishes.length, 8, "Every consecutive movement must sound, even before the old timer settles");
emit("scrollend", carousel);
emit("click");
emit("scroll", carousel);
assert.equal(swishes.length, 8, "Clicking at an edge without moving must stay silent");
await new Promise(resolve => setTimeout(resolve, 200));
assert.equal(swishes.length, 8, "Settling must not replay a sound");
console.log("Consecutive slider regression tests passed (eight rapid moves, edge silence, stale timers).");
