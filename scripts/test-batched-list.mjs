import assert from "node:assert/strict";
import { renderBatchedList, stopBatchedList, reorderVisibleItems } from "../batched-list.js";

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
    setAttribute(key, value) { this[key] = value; }
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
    append(...nodes) { nodes.forEach(node => this.insertBefore(node, null)); }
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

{
  const f = fixture();
  const records = Array.from({ length: 5000 }, (_, id) => ({ id, title: 'Game ' + id }));
  const options = { ...f.options, batchSize: 100, itemVersion: item => item.title,
    createItem(item) { const node = f.options.createItem(item.id); node.title = item.title; return node; } };
  renderBatchedList(f.list, records, options);
  assert.equal(f.ids().length, 100);
  const first = f.list.children[0];
  const second = f.list.children[1];
  records[1] = { ...records[1], title: 'Edited' };
  renderBatchedList(f.list, records, options);
  assert.equal(f.list.children[0], first, 'Unchanged cards retain their actual DOM nodes');
  assert.notEqual(f.list.children[1], second, 'Only the changed card is recreated');
  f.observersCreated.at(-1).intersect();
  f.flush();
  assert.equal(f.ids().length, 200, 'Scrolling appends the next batch automatically');
  assert.equal(f.list.children[0], first, 'Scrolling keeps the earlier games in place');
  while (f.more()) f.more().click();
  assert.deepEqual(f.ids(), records.map(record => record.id), 'All 5,000 games remain accessible in one continuous list');
  const created = f.created;
  renderBatchedList(f.list, records, options);
  assert.equal(f.created, created, 'Refreshing 5,000 unchanged games must create no new cards');
  records[4999] = { ...records[4999], title: 'Last edited' };
  renderBatchedList(f.list, records, options);
  assert.equal(f.created, created + 1, 'Editing a fully scrolled collection replaces exactly one card');
  renderBatchedList(f.list, [records[4999]], { ...options, resetKey: 'search-last' });
  assert.deepEqual(f.ids(), [4999], 'Filtering must reach games outside the initially loaded batch');
  assert.equal(f.more(), undefined);
  renderBatchedList(f.list, [], options);
  assert.equal(f.list.children.length, 0);
}
console.log('Continuous rendering tests passed (5,000 games, automatic loading, selective edits, filtering, cleanup).');

{
  const items = Array.from({length:5000}, (_,id)=>({id:String(id)}));
  const page = items.slice(100,200).map(item=>item.id);
  [page[0],page[1]] = [page[1],page[0]];
  const ordered = reorderVisibleItems(items,page);
  assert.deepEqual(ordered.slice(0,100),items.slice(0,100),'Reordering a loaded range must leave earlier games untouched');
  assert.deepEqual(ordered.slice(100,200).map(item=>item.id),page);
  assert.deepEqual(ordered.slice(200),items.slice(200),'Unloaded games must retain their positions');
}
console.log('Partial-list custom-order checks passed.');
