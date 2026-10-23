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
const ratingPitches = new Set();

for (const profile of Object.keys(sound.SOUND_PROFILES)) {
  assert.ok(sound.setSoundProfile(profile));
  sound.previewSound("click", trusted);
  const click = events.at(-1);
  assert.equal(click.type, "click");
  assert.equal(click.profile, profile);
  assert.equal(audio.voices.at(-2).type, sound.SOUND_PROFILES[profile].shape);
  sound.previewSound("navigation", trusted);
  assert.equal(events.at(-1).frequency / click.frequency, 1.25, "Navigation must remain 25% higher across presets");

  let previous = -1;
  let previousPitch = 0;
  for (let value = 0; value <= 5; value += 0.5) {
    sound.playRatingSound(value, previous, trusted);
    const event = events.at(-1);
    assert.equal(event.type, "rating");
    assert.ok(event.frequency > previousPitch, "Every half-star increase must raise the rating pitch");
    const voice = audio.voices.at(-2);
    assert.ok(voice.frequency.start < voice.frequency.end, "Increasing scores must glide upward");
    previous = value;
    previousPitch = event.frequency;
  }
  ratingPitches.add(previousPitch);
  sound.playRatingSound(1, 5, trusted);
  assert.ok(audio.voices.at(-2).frequency.start > audio.voices.at(-2).frequency.end, "Decreasing scores must glide downward");
  const count = events.length;
  sound.playRatingSound(5, 5, trusted);
  assert.equal(events.length, count, "Unchanged ratings must not play a tone");
  audio.currentTime += 1;
  sound.previewSound("hover", trusted);
  assert.equal(events.at(-1).type, "hover");
  sound.previewSound("swipe", trusted);
  assert.equal(events.at(-1).type, "swipe");
}
assert.equal(ratingPitches.size, 4, "Each console preset must have its own pitch range");
assert.ok(audio.volumes.every(volume => volume.gain.peak <= 0.1), "Individual voices must keep their quiet UI envelope");
const current = sound.getSoundStatus().profile;
assert.equal(sound.setSoundProfile("invalid"), false);
assert.equal(sound.getSoundStatus().profile, current);
unsubscribe();
const count = events.length;
sound.previewSound("click", trusted);
assert.equal(events.length, count, "Diagnostic subscribers must be removable");

globalThis.window = {};
const unsupported = await import("../card-hover-sound.js?unsupported-test");
assert.equal(unsupported.getSoundStatus().supported, false);
assert.doesNotThrow(() => unsupported.previewSound("click", trusted));
console.log("UI sound tests passed: four presets, pitch scaling, rating direction, unchanged/programmatic silence, diagnostic lifecycle, unsupported audio.");
