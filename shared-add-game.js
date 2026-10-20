/** Host the native Shelf add editor so both pages run the same form and save code. */
export const embeddedGameEditor = window.parent !== window && new URLSearchParams(location.search).get("editor") === "1";

let editorHost;

/** Load the shared document once and keep it ready between opens. */
export function warmSharedAddGame() {
  if (editorHost) return editorHost;
  const host = document.createElement("dialog");
  host.className = "shared-add-game-host";
  host.setAttribute("aria-label", "Add game");
  const frame = document.createElement("iframe");
  frame.title = "Add game";
  const editor = { host, frame, ready: false, session: null };
  editorHost = editor;
  const finish = async result => {
    const session = editor.session;
    if (!session) return;
    editor.session = null;
    host.close();
    if (!session.wasLocked) document.body.classList.remove("dialog-open");
    try {
      if (result.saved) await session.lifecycle.afterSave?.(result);
      else session.lifecycle.afterClose?.();
    } finally { session.resolve(result); }
  };
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === "game-editor:ready") {
      editor.ready = true;
      if (editor.session) frame.contentWindow.postMessage({ type: "game-editor:open", options: editor.session.options }, location.origin);
    }
    if (event.data?.type === "game-editor:closed") finish({ saved: false });
    if (event.data?.type === "game-editor:saved") finish({ saved: true, target: event.data.target });
  });
  host.addEventListener("cancel", event => {
    event.preventDefault();
    if (!editor.ready) return finish({ saved: false });
    frame.contentWindow?.postMessage({ type: "game-editor:request-close" }, location.origin);
  });
  frame.src = "shelf.html?editor=1";
  host.append(frame);
  document.body.append(host);
  return editor;
}

export function openSharedAddGame(options = {}, lifecycle = {}) {
  const editor = warmSharedAddGame();
  if (editor.session) return editor.session.promise;
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  editor.session = { options, promise, resolve, lifecycle, wasLocked: document.body.classList.contains("dialog-open") };
  document.body.classList.add("dialog-open");
  editor.session.lifecycle.beforeOpen?.();
  editor.host.showModal();
  if (editor.ready) editor.frame.contentWindow.postMessage({ type: "game-editor:open", options }, location.origin);
  return promise;
}

export function connectEmbeddedGameEditor({ dialog, form, requestClose, open, applyData, saveShelf, saveGamelist, onLoadError }) {
  if (!embeddedGameEditor) return;
  let dataReady = Promise.resolve(false);
  let loadId = 0;
  const loadCurrentData = async () => {
    const currentLoad = ++loadId;
    try {
      const read = async endpoint => {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load current game data.");
        return response.json();
      };
      const [shelf, gamelist] = await Promise.all([read("/api/shelf"), read("/api/sync")]);
      if (!Array.isArray(shelf.games) || !Array.isArray(gamelist.games) || currentLoad !== loadId) return false;
      applyData({ shelf, gamelist });
      return true;
    } catch { return false; }
  };
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === "game-editor:open") {
      dataReady = loadCurrentData();
      open(event.data.options || {});
    }
    if (event.data?.type === "game-editor:request-close") requestClose();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const generation = loadId;
    if (!await dataReady) {
      if (!dialog.open || generation !== loadId) return;
      onLoadError?.();
      dataReady = loadCurrentData();
      return;
    }
    if (!dialog.open || generation !== loadId) return;
    const destination = form.querySelector('[data-gamelist-target].active')?.dataset.gamelistTarget || "shelf";
    const saved = await (destination === "gamelist" ? saveGamelist() : saveShelf());
    if (!saved || !dialog.open || generation !== loadId) return;
    window.parent.postMessage({ type: "game-editor:saved", target: destination }, location.origin);
    dialog.close();
  });
  dialog.addEventListener("close", () => window.parent.postMessage({ type: "game-editor:closed" }, location.origin));
  window.parent.postMessage({ type: "game-editor:ready" }, location.origin);
}
