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
