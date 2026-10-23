const lists = new WeakMap();

export function stopBatchedList(list) {
  lists.get(list)?.dispose();
  lists.delete(list);
}

/** Keep full-library filtering outside the renderer; create only the next screenful. */
export function renderBatchedList(list, items, {
  createItem, resetKey, batchSize = 200, loadMoreLabel = "Show more",
  beforeAppend = () => {}, afterAppend = () => {}, canLoad = () => true,
} = {}) {
  const previous = lists.get(list);
  const initialCount = previous?.resetKey === resetKey
    ? Math.max(batchSize, previous.shown) : batchSize;
  stopBatchedList(list);
  list.replaceChildren();
  const doc = list.ownerDocument;
  const view = doc.defaultView;
  const more = doc.createElement("button");
  more.type = "button";
  more.className = "list-load-more ghost-button";
  more.textContent = loadMoreLabel;
  let observer;
  let frame;
  let disposed = false;
  const controller = {
    resetKey,
    shown: 0,
    dispose() {
      disposed = true;
      observer?.disconnect();
      if (frame) view.cancelAnimationFrame(frame);
      list.removeEventListener("dragend", resume);
    },
  };
  lists.set(list, controller);

  function resume() {
    if (disposed || more.parentNode !== list) return;
    observer?.disconnect();
    observer?.observe(more);
  }

  function appendBatch(count = batchSize) {
    if (disposed || !canLoad()) return;
    observer?.disconnect();
    const end = Math.min(items.length, controller.shown + count);
    const fragment = doc.createDocumentFragment();
    const nodes = [];
    for (let index = controller.shown; index < end; index++) {
      const node = createItem(items[index], index);
      nodes.push(node);
      fragment.append(node);
    }
    beforeAppend(fragment);
    list.insertBefore(fragment, more.parentNode === list ? more : null);
    controller.shown = end;
    if (end < items.length) {
      if (!more.parentNode) list.append(more);
      observer?.observe(more);
    } else more.remove();
    afterAppend(nodes);
  }

  more.addEventListener("click", () => appendBatch());
  list.addEventListener("dragend", resume);
  if (view.IntersectionObserver) {
    observer = new view.IntersectionObserver(entries => {
      if (disposed || frame || !entries.some(entry => entry.isIntersecting)) return;
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        appendBatch();
      });
    }, { rootMargin: "800px 0px" });
  }
  appendBatch(initialCount);
  return controller;
}
