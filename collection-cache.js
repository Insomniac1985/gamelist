// IndexedDB stores structured data asynchronously; localStorage stays small.
const memory = new Map();
const pending = new Map();
let localWriteQueue = Promise.resolve();
let database;
function openDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return database ||= new Promise(resolve => {
    const request = indexedDB.open("gamelist-collections", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("responses");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}
async function stored(key, value, remove = false) {
  try {
    const db = await openDatabase();
    if (!db) return null;
    return await new Promise(resolve => {
      const tx = db.transaction("responses", value === undefined && !remove ? "readonly" : "readwrite");
      const store = tx.objectStore("responses");
      const request = remove ? store.delete(key) : value === undefined ? store.get(key) : store.put(value, key);
      tx.oncomplete = () => resolve(request.result || null);
      tx.onerror = tx.onabort = () => resolve(null);
    });
  } catch { return null; }
}
export async function invalidateCollectionCache(endpoint) {
  memory.delete(endpoint);
  await stored(endpoint, undefined, true);
}
export async function readLocalGames(key, legacyKey) {
  const marker = localStorage.getItem(`${key}:backend`);
  if (marker !== "local") {
    const cached = await stored(`local:${key}`);
    if (Array.isArray(cached?.games)) return cached.games;
  }
  const saved = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
  try { return saved ? JSON.parse(saved) : []; } catch { return []; }
}
export function saveLocalGames(key, games) {
  // Snapshot before yielding; later in-place edits cannot alter an in-flight save.
  const snapshot = structuredClone(games);
  const task = localWriteQueue.then(async () => {
    if (await stored(`local:${key}`, { games: snapshot })) {
      try { localStorage.removeItem(key); localStorage.setItem(`${key}:backend`, "idb"); } catch {}
      return true;
    }
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
      localStorage.setItem(`${key}:backend`, "local");
      return true;
    } catch { return false; }
  });
  localWriteQueue = task.catch(() => false);
  return task;
}
export function fetchCollectionJson(endpoint) {
  if (pending.has(endpoint)) return pending.get(endpoint);
  const task = (async () => {
    const cached = memory.get(endpoint) || await stored(endpoint);
    const headers = cached?.etag ? { "If-None-Match": cached.etag } : {};
    const response = await fetch(endpoint, { cache: "no-store", headers });
    if (response.status === 304 && cached) {
      memory.set(endpoint, cached);
      return structuredClone(cached.data);
    }
    if (!response.ok) throw new Error(`Could not load current game data (${response.status}).`);
    const value = { data: await response.json(), etag: response.headers.get("ETag") };
    memory.set(endpoint, value);
    // A failed/quota-limited cache must never turn a successful read into an error.
    void stored(endpoint, value);
    return structuredClone(value.data);
  })().finally(() => pending.delete(endpoint));
  pending.set(endpoint, task);
  return task;
}
