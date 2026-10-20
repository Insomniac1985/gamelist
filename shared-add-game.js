/** Host the native Shelf add editor so both pages run the same form and save code. */
export const embeddedGameEditor = window.parent !== window && new URLSearchParams(location.search).get("editor") === "1";

let activeHost;
export function openSharedAddGame(options = {}) {
  if (activeHost) return;
  const host = document.createElement("dialog");
  host.className = "shared-add-game-host";
  host.setAttribute("aria-label", "Add game");
  const frame = document.createElement("iframe");
  frame.title = "Add game";
  frame.src = "shelf.html?editor=1";
  host.append(frame);
  document.body.append(host);
  activeHost = host;
  const wasLocked = document.body.classList.contains("dialog-open");
  document.body.classList.add("dialog-open");
  return new Promise(resolve => {
    let ready = false;
    const finish = result => {
      window.removeEventListener("message", onMessage);
      host.close();
      host.remove();
      activeHost = null;
      if (!wasLocked) document.body.classList.remove("dialog-open");
      resolve(result);
    };
    const onMessage = event => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === "game-editor:ready") {
        ready = true;
        frame.contentWindow.postMessage({ type: "game-editor:open", options }, location.origin);
      }
      if (event.data?.type === "game-editor:closed") finish({ saved: false });
      if (event.data?.type === "game-editor:saved") finish({ saved: true, target: event.data.target });
    };
    window.addEventListener("message", onMessage);
    host.addEventListener("cancel", event => {
      event.preventDefault();
      if (!ready) return finish({ saved: false });
      frame.contentWindow?.postMessage({ type: "game-editor:request-close" }, location.origin);
    });
    host.showModal();
  });
}

export function connectEmbeddedGameEditor({ open, requestClose, dialog }) {
  if (!embeddedGameEditor) return;
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === "game-editor:open") open(event.data.options || {});
    if (event.data?.type === "game-editor:request-close") requestClose();
  });
  dialog.addEventListener("close", () => window.parent.postMessage({ type: "game-editor:closed" }, location.origin));
  window.parent.postMessage({ type: "game-editor:ready" }, location.origin);
}

export function notifyEmbeddedGameSaved(target) {
  if (embeddedGameEditor) window.parent.postMessage({ type: "game-editor:saved", target }, location.origin);
}
