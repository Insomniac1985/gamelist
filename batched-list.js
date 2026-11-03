const lists = new WeakMap();

export function reorderVisibleItems(items, visibleIds) {
  const byId = new Map(items.map(item => [item.id, item]));
  const visible = new Set(visibleIds);
  const reordered = visibleIds.map(id => byId.get(id)).filter(Boolean);
  let index = 0;
  return items.map(item => visible.has(item.id) ? reordered[index++] : item);
}

export function stopBatchedList(list) {
  lists.get(list)?.dispose();
  lists.delete(list);
}

/** Keep full-library filtering outside the renderer; create only the next screenful. */
export function renderBatchedList(list, items, {
  createItem, resetKey, batchSize = 200, loadMoreLabel = "Show more",
  beforeAppend = () => {}, afterAppend = () => {}, canLoad = () => true,
  itemKey = item => item?.id ?? item, itemVersion = item => item,
  contextKey = "",
} = {}) {
  const previous = lists.get(list);
  const reusable = previous?.contextKey === contextKey ? previous.nodes || new Map() : new Map();
  const initialCount = previous?.resetKey === resetKey
    ? Math.max(batchSize, previous.shown) : batchSize;
  stopBatchedList(list);
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
    contextKey,
    nodes: new Map(),
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
    if (disposed || controller.shown > 0 && !canLoad()) return;
    observer?.disconnect();
    const end = Math.min(items.length, controller.shown + count);
    const initial = controller.shown === 0;
    const nodes = [];
    for (let index = controller.shown; index < end; index++) {
      const item = items[index];
      const key = itemKey(item);
      const version = itemVersion(item);
      const cached = reusable.get(key);
      const node = cached?.version === version ? cached.node : createItem(item, index);
      controller.nodes.set(key, { node, version });
      nodes.push(node);
    }
    if (initial) {
      const wanted = new Set(nodes);
      for (const node of [...list.children]) if (!wanted.has(node)) node.remove();
      nodes.forEach((node, index) => {
        if (list.children[index] !== node) list.insertBefore(node, list.children[index] || null);
      });
      reusable.clear();
      beforeAppend(list);
    } else {
      const fragment = doc.createDocumentFragment();
      nodes.forEach(node => fragment.append(node));
      beforeAppend(fragment);
      list.insertBefore(fragment, more.parentNode === list ? more : null);
    }
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
