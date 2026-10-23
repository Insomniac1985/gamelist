import { bindCardHoverSounds, getSoundStatus, subscribeSoundDiagnostics, previewSound, playRatingSound, CUSTOM_SOUND, scrollWithSound } from "./card-hover-sound.js";

const $ = selector => document.querySelector(selector);
const names = { hover: "Hover click", click: "Button click", navigation: "Navigation click", rating: "Rating tone", swipe: "Slider swish", "audio-state": "Audio state", "audio-error": "Audio unavailable", profile: "Preset changed", fold: "Close click", unfold: "Open click", posture: "Device posture" };
let total = 0;
let rating = 0;

function updateAudioStatus() {
  const status = getSoundStatus();
  const running = status.state === "running";
  $("#postureStatus").textContent = status.postureSupported
    ? `Device posture: ${status.posture}. Fold/unfold transitions play once audio is enabled.`
    : "Device posture is unavailable in this browser. Use the Fold and Unfold previews to test the sounds.";
  $("#audioStatus").textContent = !status.supported ? "Audio unsupported" : status.disabled ? "Sounds disabled" : running ? "Audio ready" : `Audio ${status.state}`;
  $("#audioStatus").classList.toggle("ready", running && !status.disabled);
  $("#engineState").textContent = !status.supported ? "Unsupported" : status.state;
  $("#sampleRate").textContent = status.sampleRate ? `${(status.sampleRate / 1000).toFixed(1)} kHz` : "—";
  $("#enableAudio").textContent = running ? "Test audio ↗" : "Enable audio ↗";
  if (!status.supported) $("#audioHelp").textContent = "This browser does not support Web Audio. Open this page in a browser with Web Audio support.";
  else if (status.disabled) $("#audioHelp").textContent = "Sounds are disabled in Settings. Check Enable under Sounds and save to resume playback.";
  else if (running) $("#audioHelp").textContent = "Audio is running. Each entry below confirms a sound was scheduled by the app’s audio engine.";
}

subscribeSoundDiagnostics(event => {
  updateAudioStatus();
  const isSound = Boolean(event.duration);
  if (isSound) {
    $("#soundCount").textContent = String(++total);
    $("#lastSound").textContent = names[event.type] || event.type;
  }
  const details = [];
  if (event.type === "rating") details.push(`${event.previousValue} → ${event.value} / 5`);
  if (event.type === "swipe") details.push(event.direction > 0 ? "Next slide · rising sweep" : "Previous slide · falling sweep");
  if (event.frequency) details.push(`${Math.round(event.frequency)} Hz`);
  if (event.duration) details.push(`${event.duration}ms`);
  if (!isSound) details.push(event.type === "posture" ? event.posture : event.state);
  if (isSound) details.push("Custom");
  const item = document.createElement("li");
  const title = document.createElement("div");
  title.className = "log-title";
  const label = document.createElement("strong");
  label.textContent = names[event.type] || event.type;
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });
  title.append(label, time);
  const meta = document.createElement("span");
  meta.className = "log-meta";
  meta.textContent = details.join(" · ");
  item.append(title, meta);
  const log = $("#soundLog");
  log.querySelector(".log-empty")?.remove();
  log.prepend(item);
  while (log.children.length > 40) log.lastElementChild.remove();
});

bindCardHoverSounds(document);
updateAudioStatus();
document.querySelectorAll("[data-sound-preview]").forEach(button => {
  if (button.dataset.soundPreview) button.addEventListener("click", event => previewSound(button.dataset.soundPreview, event));
});
$("#clearLog").addEventListener("click", () => {
  $("#soundLog").replaceChildren();
  total = 0;
  $("#soundCount").textContent = "0";
  $("#lastSound").textContent = "—";
});

function setRating(value, event) {
  const previous = rating;
  rating = Math.max(0, Math.min(5, Math.round(Number(value) * 2) / 2));
  $("#ratingRange").value = String(rating);
  $("#ratingOutput").innerHTML = `${rating}<span>/5</span>`;
  $("#ratingDetail").textContent = `${rating} / 5 · ${Math.round(CUSTOM_SOUND.rating * 2 ** (rating / 2.5))} Hz${rating === previous ? " · unchanged" : rating > previous ? " · rising tone" : " · falling tone"}`;
  document.querySelectorAll("[data-rate]").forEach(button => {
    const star = Number(button.dataset.rate);
    button.classList.toggle("selected", rating >= star);
    button.classList.toggle("half", rating === star - 0.5);
    button.setAttribute("aria-pressed", String(rating === star));
  });
  playRatingSound(rating, previous, event);
}
document.querySelectorAll("[data-rate]").forEach(button => button.addEventListener("click", event => setRating(button.dataset.rate, event)));
document.querySelectorAll("[data-rating-step]").forEach(button => button.addEventListener("click", event => setRating(rating + Number(button.dataset.ratingStep), event)));
$("#ratingRange").addEventListener("input", event => setRating(event.target.value, event));
$("#clearRating").addEventListener("click", event => setRating(0, event));

const slider = $("#testSlider");
function slide(direction) {
  const step = slider.firstElementChild.getBoundingClientRect().width + 14;
  slider.scrollBy({ left: step * direction, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
function updateSlider() {
  const max = slider.scrollWidth - slider.clientWidth;
  const step = slider.firstElementChild.getBoundingClientRect().width + 14;
  const index = Math.max(0, Math.min(4, Math.round(slider.scrollLeft / step)));
  $("#previousSlide").disabled = slider.scrollLeft <= 1;
  $("#nextSlide").disabled = slider.scrollLeft >= max - 1;
  $("#slideCount").textContent = `0${index + 1} / 05`;
  $("#slideDots").querySelectorAll("i").forEach((dot, i) => dot.classList.toggle("active", i === index));
}
$("#previousSlide").addEventListener("click", () => slide(-1));
$("#nextSlide").addEventListener("click", () => slide(1));
slider.addEventListener("scroll", updateSlider, { passive: true });
slider.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  slide(event.key === "ArrowRight" ? 1 : -1);
});
window.addEventListener("resize", updateSlider, { passive: true });
updateSlider();

document.querySelectorAll(".hover-targets button").forEach(card => card.addEventListener("click", () => {
  $("#cardResult").textContent = `Opened sample: ${card.querySelector("small").textContent}.`;
}));
document.querySelectorAll(".mobile-action-dock button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".mobile-action-dock button").forEach(item => item.removeAttribute("aria-current"));
  button.setAttribute("aria-current", "page");
  $("#navigationResult").textContent = `${button.textContent.trim()} selected · navigation pitch is 25% higher.`;
}));

for (const type of ["playing", "stream", "backlog", "complete", "delete", "add-game"]) {
  names[type] = type === "add-game" ? "Add game cheer" : `${type[0].toUpperCase()}${type.slice(1)} action`;
  names[`hover-${type}`] = `${names[type]} hover`;
}
Object.assign(names, { congrats: "GOTY congratulations", "bounce-up": "Arrived at top", "bounce-down": "Arrived below" });
document.querySelectorAll(".test-tabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".test-tabs button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
}));
$("#testScrollDown").addEventListener("click", () => scrollWithSound($("#pageBottom")));
$("#testScrollUp").addEventListener("click", () => scrollWithSound(0));
