import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createDataPatch, applyDataPatch, hasDataPatch, PatchConflict, shelfShape, gamelistShape } from "../data-patch.js";
import { createSearchCache } from "../search-cache.js";
import { onRequestGet as getShelf, onRequestPut as putShelf } from "../functions/api/shelf.js";
import { onRequestGet as getList, onRequestPut as putList } from "../functions/api/sync.js";
import worker from "../worker.js";
import { fetchCollectionJson, invalidateCollectionCache, readLocalGames, saveLocalGames } from "../collection-cache.js";

class KV {
  values = new Map(); writes = [];
  async get(key) { return this.values.has(key) ? JSON.parse(this.values.get(key)) : null; }
  async put(key, value) { this.writes.push(key); this.values.set(key, value); }
  seed(key, value) { this.values.set(key, JSON.stringify(value)); }
}
const request = (path, body, password = 'test') => new Request(`https://example.test${path}`, {
  method: body ? 'PUT' : 'GET', headers: { 'Content-Type': 'application/json', 'x-edit-password': password },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const kv = new KV();
const env = { GAMELIST: kv, EDIT_PASSWORD: 'test' };
const initial = { sourceGames: [{id:'source', title:'Imported', game:true}], games: [{ id:'one', title:'Original', notes:'', owners:['A'], box:true }], overrides:{}, layout:null, favoriteGameIds:[] };
kv.seed('shelf-data', initial);
kv.seed('gamelist-data', { games:[{id:'linked', shelfId:'one', title:'Linked', owners:['A'], trophyName:'', psPlus:false, gamesWithGold:false}], settings:{shelfShowcaseFavoriteGameIds:[]} });
const edited = structuredClone(initial);
edited.games[0].notes = 'Edited notes';
const patch = createDataPatch(initial, edited, shelfShape);
assert.equal(patch.records.length, 1);
assert.deepEqual(patch.records[0].fields.map(field => field.key), ['notes']);
assert.equal(hasDataPatch(createDataPatch(initial, initial, shelfShape)), false);
assert.deepEqual(applyDataPatch(initial, patch, shelfShape), edited);
assert.deepEqual(applyDataPatch(edited, patch, shelfShape), edited, 'Retries must be idempotent');
const legacy = {games:[{id:'legacy',title:'Legacy'}],settings:{}};
const normalized = {games:[{...legacy.games[0],digital:false,emulator:false}],settings:{}};
const toggle = structuredClone(normalized); toggle.games[0].digital = true;
const defaultPatch = createDataPatch(legacy, toggle, gamelistShape, normalized);
assert.equal(defaultPatch.records.length,1);
assert.deepEqual(defaultPatch.records[0].fields,[{key:'digital',before:[],after:[true]}]);
assert.equal(applyDataPatch(legacy, defaultPatch, gamelistShape).games[0].digital,true);
const added = {...initial,games:[{id:'new-a'},{id:'new-b'},...initial.games]};
assert.deepEqual(applyDataPatch(initial,createDataPatch(initial,added,shelfShape),shelfShape).games.map(game=>game.id),['new-a','new-b','one']);
const concurrent = structuredClone(initial);
concurrent.games[0].box = false;
assert.equal(applyDataPatch(concurrent, patch, shelfShape).games[0].box, false, 'Different-field edits must merge');
concurrent.games[0].notes = 'Someone else';
assert.throws(() => applyDataPatch(concurrent, patch, shelfShape), PatchConflict);

let response = await putShelf({ request:request('/api/shelf', {patch}), env });
assert.equal(response.status, 200);
assert.deepEqual(kv.writes, ['shelf-data'], 'An ordinary edit must write Shelf only');
assert.equal((await kv.get('shelf-data')).games[0].notes, 'Edited notes');
kv.writes = [];
assert.equal((await putShelf({ request:request('/api/shelf', {patch}, 'wrong'), env })).status, 401);
const conflicting = structuredClone(edited); conflicting.games[0].notes = 'Newer notes';
kv.seed('shelf-data', conflicting);
assert.equal((await putShelf({ request:request('/api/shelf', {patch}), env })).status, 409);
assert.equal(kv.writes.length, 0);

// Linked changes still propagate; unrelated values remain intact.
const ownersEdit = structuredClone(conflicting); ownersEdit.games[0].owners = ['B'];
response = await putShelf({request:request('/api/shelf', {patch:createDataPatch(conflicting, ownersEdit, shelfShape)}), env});
assert.equal(response.status, 200);
assert.deepEqual((await kv.get('gamelist-data')).games[0].owners, ['B']);
assert.equal((await kv.get('shelf-data')).games[0].notes, 'Newer notes');

const sourceEdit = structuredClone(ownersEdit); sourceEdit.overrides.source = { notes:'Override' };
response = await putShelf({request:request('/api/shelf', {patch:createDataPatch(ownersEdit, sourceEdit, shelfShape)}), env});
assert.equal(response.status, 200);
assert.equal((await kv.get('shelf-data')).overrides.source.notes, 'Override');

const removed = structuredClone(sourceEdit); removed.games = [];
assert.equal((await putShelf({request:request('/api/shelf', {patch:createDataPatch(sourceEdit, removed, shelfShape)}), env})).status, 200);
assert.equal((await kv.get('shelf-data')).games.length, 0);
assert.equal((await putShelf({request:request('/api/shelf', initial), env})).status, 200, 'Legacy full saves remain supported');

const list = await kv.get('gamelist-data');
const listEdit = structuredClone(list); listEdit.games[0].notes = 'New list notes';
kv.writes = [];
response = await putList({request:request('/api/sync', {patch:createDataPatch(list, listEdit, gamelistShape)}), env});
assert.equal(response.status, 200);
assert.deepEqual(kv.writes, ['gamelist-data'], 'Unlinked Gamelist edits must not rewrite Shelf');
assert.equal((await kv.get('gamelist-data')).games[0].notes, 'New list notes');

const bad = { records:[{collection:'settings', id:'one', create:{id:'one'}}], fields:[], objects:[] };
assert.equal((await putShelf({request:request('/api/shelf', {patch:bad}), env})).status, 400);
assert.equal((await putShelf({request:request('/api/shelf', {patch:{records:[],fields:[{key:'__proto__',before:[],after:[{}]}],objects:[]}}), env})).status, 400);

for (const [path, handler] of [['/api/shelf', getShelf], ['/api/sync', getList]]) {
  const first = await handler({request:request(path), env});
  assert.equal(first.status, 200);
  const etag = first.headers.get('ETag');
  assert.ok(etag);
  const cachedRequest = new Request(`https://example.test${path}`, {headers:{'If-None-Match':etag}});
  const cached = await handler({request:cachedRequest, env});
  assert.equal(cached.status, 304);
  assert.equal(await cached.text(), '');
}
response = await worker.fetch(request('/api/shelf'), env, {});
assert.equal(response.status, 200, 'Production Worker routes must expose conditional reads');

const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    if (options.headers['If-None-Match'] === '"cached"') return new Response(null,{status:304});
    return Response.json({games:[{id:'cached',title:'Original'}]},{headers:{ETag:'"cached"'}});
  };
  const first = await fetchCollectionJson('/cache-test');
  first.games[0].title = 'Unsaved mutation';
  const cached = await fetchCollectionJson('/cache-test');
  assert.equal(cached.games[0].title,'Original','Unsaved client mutations must never pollute the response cache');
  assert.equal(calls,2);
  await invalidateCollectionCache('/cache-test');
  await Promise.all([fetchCollectionJson('/cache-test'),fetchCollectionJson('/cache-test')]);
  assert.equal(calls,3,'Concurrent readers should share one network request');
  globalThis.fetch = async () => { throw new Error('Offline'); };
  await assert.rejects(fetchCollectionJson('/cache-test'),/Offline/,'Editor reads must not silently use stale data while offline');
} finally { globalThis.fetch = originalFetch; }

const originalStorage = globalThis.localStorage;
try {
  const values = new Map([['legacy',JSON.stringify([{id:'old'}])]]);
  globalThis.localStorage = {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  assert.deepEqual(await readLocalGames('current','legacy'),[{id:'old'}]);
  const games = [{id:'local',notes:'Saved'}];
  const saving = saveLocalGames('current',games);
  games[0].notes = 'Later unsaved change';
  assert.equal(await saving,true);
  assert.deepEqual(await readLocalGames('current'),[{id:'local',notes:'Saved'}],'Local saves must take a stable snapshot');
  globalThis.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(await saveLocalGames('current',[]),false,'Storage failure must be reported without an uncaught exception');
} finally { if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; }

const results = [];
for (const count of [500, 2000, 5000]) {
  const games = Array.from({length:count}, (_, i) => ({id:`game-${i}`, title:`Game ${i}`, platform:i%2?'PS5':'Switch', notes:'', description:'A detailed game description. '.repeat(40), owners:['Owner'], game:true, box:true}));
  const data = {games, sourceGames:[], overrides:{}, layout:null, favoriteGameIds:[]};
  const next = {...data, games:games.map((game,i) => i === count-1 ? {...game, notes:'Edited'} : game)};
  const start = performance.now();
  const delta = createDataPatch(data, next, shelfShape);
  const diffMs = performance.now() - start;
  assert.equal(delta.records.length, 1);
  const fullBytes = Buffer.byteLength(JSON.stringify(next));
  const editBytes = Buffer.byteLength(JSON.stringify({patch:delta}));
  assert.ok(editBytes < 500, 'A notes edit must remain small regardless of library size');
  let normalizations = 0;
  const search = createSearchCache(text => { normalizations++; return text.toLowerCase(); });
  const searchStart = performance.now();
  for (const query of ['game', `${count-1}`, 'missing']) {
    const found = games.filter(game => search(game, `${game.title} ${game.description}`).includes(query));
    if (query === `${count-1}`) assert.ok(found.some(game => game.id === `game-${count-1}`));
  }
  assert.equal(normalizations, count, 'Each unchanged game is normalized once across repeated searches');
  const changed = games[0]; changed.title = 'Changed title';
  assert.ok(search(changed, `${changed.title} ${changed.description}`).includes('changed title'));
  assert.equal(normalizations, count+1, 'Mutated search fields must invalidate the cache');
  results.push({games:count, fullBytes, editBytes, diffMs:Number(diffMs.toFixed(2)), threeSearchesMs:Number((performance.now()-searchStart).toFixed(2))});
}
console.table(results);
console.log('Collection performance/API tests passed: deltas, retry, merge/conflict, auth, linked sync, imports, ETags, Worker routing, search at 500/2,000/5,000 games.');
