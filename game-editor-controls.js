/** The same collection regions are available from either game editor. */
export const SHELF_COUNTRIES = [
  ["Australia", "Australia", "au"], ["China", "China", "cn"], ["Europe", "EU", "eu"],
  ["France", "France", "fr"], ["Germany", "Germany", "de"], ["Ireland", "Ireland", "ie"],
  ["Italy", "Italy", "it"], ["Japan", "Japan", "jp"], ["Mexico", "Mexico", "mx"],
  ["Portugal", "Portugal", "pt"], ["Spain", "Spain", "es"], ["Taiwan", "Taiwan", "tw"],
  ["United Kingdom", "UK", "gb"], ["United States of America", "US", "us"], ["World", "World", "world"],
];

/** Keep list selection and its indicator identical in both game editors. */
export function syncGameListSlider(picker, section) {
  if (!picker) return;
  const options = picker.querySelector(".shelf-gamelist-target-options");
  if (!options) return;
  const buttons = [...options.querySelectorAll("[data-game-target], [data-gamelist-section]")];
  let selected;
  for (const button of buttons) {
    const active = (button.dataset.gameTarget ?? button.dataset.gamelistSection) === section;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    if (active) selected = button;
  }
  options.style.setProperty("--target-count", String(buttons.length));
  if (selected) requestAnimationFrame(() => {
    options.style.setProperty("--target-left", `${selected.offsetLeft}px`);
    options.style.setProperty("--target-width", `${selected.offsetWidth}px`);
  });
}

/** Apply the same Backlog, preorder, and Stream behavior on either page. */
export function syncGameListControls({
  active, section, preorderCheck, preorderStore, preorderField, preorderRow,
  streamRow, streamInput, hasTwitchAccount, editing = false, playingGrid,
}) {
  const isBacklog = active && section === "backlog";
  if (isBacklog) {
    preorderCheck.checked = false;
    preorderStore.value = "";
  }
  const streamField = streamInput.closest(".stream-check");
  if (editing && playingGrid) {
    playingGrid.insertBefore(streamField, playingGrid.querySelector(".playing-replay-field"));
  } else {
    streamRow.append(streamField);
  }
  const showPreorder = active && !isBacklog;
  const showStream = active && !editing && hasTwitchAccount;
  const hasStore = showPreorder && preorderCheck.checked;
  preorderRow.hidden = !showPreorder;
  preorderField.hidden = !hasStore;
  streamField.hidden = !editing && !showStream;
  streamRow.hidden = !showPreorder && !showStream;
  preorderRow.classList.toggle("has-preorder-store", hasStore);
  streamRow.classList.toggle("has-stream", showStream);
  streamRow.classList.toggle("has-preorder-store", hasStore);
  streamRow.classList.toggle("preorder-hidden", !showPreorder);
  return { isBacklog, showPreorder, showStream, hasStore };
}

export function syncCollectionCondition(inputs, changed) {
  if (changed === inputs.sealed && changed.checked) {
    inputs.game.checked = true;
    inputs.box.checked = true;
  }
  if ((changed === inputs.game && !changed.checked) || (changed === inputs.box && !changed.checked)) {
    inputs.sealed.checked = false;
  }
  inputs.sealed.disabled = false;
}

/** Use the same store favicons in preorder and preferred-store fields on either page. */
export function syncStoreFieldIcon(input, slot) {
  if (!input || !slot) return;
  const raw = input.value.trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const stores = [
    [["amazon"], "Amazon", "assets/stores/amazon.ico"],
    [["ebay"], "eBay", "https://www.ebay.com/favicon.ico"],
    [["kickstarter", "kickstater", "kicstarter", "kickstart"], "Kickstarter", "https://www.kickstarter.com/favicon.ico"],
    [["game", "gamees"], "GAME.es", "assets/stores/game.ico"],
    [["xtralife"], "Xtralife", "assets/stores/xtralife.ico"],
    [["retroisland", "retroislandny"], "Retro Island NY", "assets/stores/retroisland.png"],
    [["limitedrun", "limitedrungames", "lrg"], "Limited Run", "assets/stores/limited-run-games.png"],
    [["squareenix", "squareenixstore", "sqex", "sqexstore"], "Square Enix Store", "assets/stores/square-enix-store.png"],
    [["gamestop"], "GameStop", "https://www.gamestop.com/favicon.ico"],
    [["walmart", "wallmart"], "Walmart", "https://www.walmart.com/favicon.ico"],
    [["worldgame", "worldgamees"], "WorldGame", "https://www.worldgame.es/favicon.ico"],
    [["nintendo"], "Nintendo", "assets/sites/nintendo.png"],
    [["playstation"], "PlayStation", "assets/sites/playstation.png"],
    [["steam"], "Steam", "assets/sites/steam.png"],
    [["xbox"], "Xbox", "assets/platforms/xbox.png"],
  ];
  const match = stores.find(([aliases]) => aliases.includes(key) || ["amazon", "nintendo", "playstation"].some(prefix => aliases.includes(prefix) && key.startsWith(prefix)));
  let icon = match?.[2] || "";
  if (!icon && /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      icon = `${url.origin}/favicon.ico`;
    } catch { /* Keep unrecognized store names free of placeholder icons. */ }
  }
  const wrapper = slot.closest(".icon-input");
  slot.replaceChildren();
  slot.title = icon ? match?.[1] || raw : "";
  wrapper?.classList.toggle("has-icon", Boolean(icon));
  if (!icon) return;
  const image = document.createElement("img");
  image.alt = "";
  image.width = 16;
  image.height = 16;
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (!slot.contains(image)) return;
    slot.replaceChildren();
    slot.title = "";
    wrapper?.classList.remove("has-icon");
  }, { once: true });
  image.src = icon;
  slot.append(image);
}
