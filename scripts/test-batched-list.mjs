import assert from "node:assert/strict";
import { renderBatchedList, stopBatchedList } from "../batched-list.js";

// Minimal DOM fixture keeps these lifecycle tests runnable with plain Node.
function fixture({ observers = true } = {}) {
  const frames = new Map();
  const observersCreated = [];
  let nextFrame = 0;
  const view = {
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  if (observers) view.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observersCreated.push(this); }
    observe(node) { this.target = node; }
    disconnect() { this.target = null; }
    intersect() { this.callback([{ isIntersecting: true }]); }
  };
  class Node {
    constructor(fragment = false) {
      this.ownerDocument = doc;
      this.children = [];
      this.listeners = new Map();
      this.fragment = fragment;
    }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
    click() { this.listeners.get("click")?.(); }
    remove() {
      if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
      this.parentNode = null;
    }
    insertBefore(node, before) {
      if (node.fragment) { [...node.children].forEach(child => this.insertBefore(child, before)); return; }
      node.remove();
      const index = before ? this.children.indexOf(before) : this.children.length;
      assert.ok(index >= 0, "Insertion target must belong to the list");
      this.children.splice(index, 0, node);
      node.parentNode = this;
    }
    append(node) { this.insertBefore(node, null); }
    replaceChildren() { [...this.children].forEach(child => child.remove()); }
  }
  const doc = { defaultView: view, createElement: () => new Node(), createDocumentFragment: () => new Node(true) };
  const list = new Node();
  let created = 0;
  const options = {
    resetKey: "all",
    createItem(id) { created++; const node = new Node(); node.id = id; return node; },
  };
  return {
    list, options, observersCreated,
    get created() { return created; },
    ids: () => list.children.filter(node => node.id != null).map(node => node.id),
    more: () => list.children.find(node => node.className === "list-load-more ghost-button"),
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
  };
}

const games = Array.from({ length: 3000 }, (_, index) => index);
{
  const f = fixture();
  renderBatchedList(f.list, games, f.options);
  assert.equal(f.created, 200, "A 3,000-game library must initially create only 200 nodes");
  const first = f.list.children[0];
  f.more().click();
  assert.equal(f.ids().length, 400);
  assert.equal(f.list.children[0], first, "Loading more must retain existing cards and their handlers");
  f.observersCreated[0].intersect();
  f.observersCreated[0].intersect();
  f.flush();
  assert.equal(f.ids().length, 600, "Repeated observer notifications must schedule just one batch");
  renderBatchedList(f.list, games, f.options);
  assert.equal(f.ids().length, 600, "Refreshing data must retain the loaded prefix");
  renderBatchedList(f.list, [2999], { ...f.options, resetKey: "search" });
  assert.deepEqual(f.ids(), [2999], "Filtering must reach games outside the rendered prefix");
  assert.equal(f.more(), undefined);
}
{
  const f = fixture();
  renderBatchedList(f.list, games, f.options);
  const old = f.observersCreated[0];
  old.intersect();
  renderBatchedList(f.list, [42], { ...f.options, resetKey: "new-filter" });
  old.intersect();
  f.flush();
  assert.deepEqual(f.ids(), [42], "Queued callbacks must not append stale filter results");
  renderBatchedList(f.list, [], { ...f.options, resetKey: "empty" });
  assert.equal(f.list.children.length, 0);
}
{
  const f = fixture({ observers: false });
  renderBatchedList(f.list, games.slice(0, 425), f.options);
  f.more().click();
  f.more().click();
  assert.deepEqual(f.ids(), games.slice(0, 425), "Manual loading must work without IntersectionObserver");
  assert.equal(f.more(), undefined, "The button must disappear when the complete list is rendered");
}
{
  const f = fixture();
  let dragging = false;
  renderBatchedList(f.list, games, { ...f.options, canLoad: () => !dragging });
  dragging = true;
  f.observersCreated[0].intersect();
  f.flush();
  assert.equal(f.ids().length, 200, "Loading must pause during a drag");
  dragging = false;
  f.list.listeners.get("dragend")();
  assert.equal(f.observersCreated[0].target, f.more(), "Observation must resume after dragging");
  f.observersCreated[0].intersect();
  stopBatchedList(f.list);
  f.flush();
  assert.equal(f.ids().length, 200, "Disposal must cancel pending work");
}
console.log("Batch rendering tests passed (3,000 records, scroll/click loading, filtering, refresh, drag, cleanup, fallback).");
