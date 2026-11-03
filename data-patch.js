// Shared by clients and Workers. Only changed records/fields cross the network.
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const shelfShape = { lists: ["sourceGames", "games"], maps: ["overrides"], fields: ["layout", "favoriteGameIds"] };
export const gamelistShape = { lists: ["games"], maps: [], objects: ["settings"], fields: [] };

function fieldsBetween(before = {}, after = {}, comparison = before) {
  before ||= {};
  after ||= {};
  comparison ||= {};
  return [...new Set([...Object.keys(comparison), ...Object.keys(after)])]
    .filter(key => !unsafe.has(key) && (!equal(comparison[key], after[key]) || own(comparison, key) !== own(after, key)))
    .map(key => ({ key, before: own(before, key) ? [before[key]] : [], after: own(after, key) ? [after[key]] : [] }));
}

export function createDataPatch(before, after, shape, comparison = before) {
  const patch = { records: [], fields: [], objects: [] };
  for (const collection of [...shape.lists, ...shape.maps]) {
    const list = shape.lists.includes(collection);
    const old = list ? new Map((before[collection] || []).map(item => [item.id, item])) : new Map(Object.entries(before[collection] || {}));
    const next = list ? new Map((after[collection] || []).map(item => [item.id, item])) : new Map(Object.entries(after[collection] || {}));
    const comparable = list ? new Map((comparison[collection] || []).map(item => [item.id, item])) : new Map(Object.entries(comparison[collection] || {}));
    let index = 0;
    for (const [id, value] of next) {
      if (!old.has(id)) patch.records.push({ collection, id, create: value, ...(list ? { index } : {}) });
      else {
        const fields = fieldsBetween(old.get(id), value, comparable.get(id));
        if (fields.length) patch.records.push({ collection, id, fields });
      }
      index++;
    }
    for (const [id, value] of old) if (!next.has(id)) patch.records.push({ collection, id, remove: value });
  }
  patch.fields = fieldsBetween(before, after, comparison).filter(field => shape.fields.includes(field.key));
  for (const key of shape.objects || []) {
    const fields = fieldsBetween(before[key], after[key], comparison[key]);
    if (fields.length) patch.objects.push({ key, fields });
  }
  return structuredClone(patch);
}

export function hasDataPatch(patch) {
  return Boolean(patch.records.length || patch.fields.length || patch.objects.length);
}

export class PatchConflict extends Error {}

function applyFields(value, fields) {
  if (!Array.isArray(fields)) throw new Error("Invalid changed fields");
  const result = { ...value };
  for (const field of fields) {
    if (!field || typeof field.key !== "string" || unsafe.has(field.key) || !Array.isArray(field.before) || !Array.isArray(field.after) || field.before.length > 1 || field.after.length > 1) throw new Error("Invalid field change");
    const current = own(result, field.key) ? [result[field.key]] : [];
    // Retrying an acknowledged-but-interrupted request is safe.
    if (equal(current, field.after)) continue;
    if (!equal(current, field.before)) throw new PatchConflict("This game was changed elsewhere. Reload before saving again.");
    if (field.after.length) result[field.key] = field.after[0];
    else delete result[field.key];
  }
  return result;
}

export function applyDataPatch(data, patch, shape) {
  if (!patch || !Array.isArray(patch.records) || !Array.isArray(patch.fields) || !Array.isArray(patch.objects)) throw new Error("Invalid collection changes");
  let result = { ...data };
  const collections = new Map();
  for (const change of patch.records) {
    if (!change || typeof change.id !== "string" || !change.id || unsafe.has(change.id) || ![...shape.lists, ...shape.maps].includes(change.collection)) throw new Error("Invalid game change");
    const list = shape.lists.includes(change.collection);
    if (!collections.has(change.collection)) collections.set(change.collection, list
      ? new Map((data[change.collection] || []).map(item => [item.id, item]))
      : new Map(Object.entries(data[change.collection] || {})));
    const items = collections.get(change.collection);
    if (own(change, "create")) {
      if (!change.create || typeof change.create !== "object" || Array.isArray(change.create) || list && change.create.id !== change.id) throw new Error("Invalid new game");
      if (items.has(change.id) && !equal(items.get(change.id), change.create)) throw new PatchConflict("This game already exists. Reload before saving again.");
      if (!items.has(change.id)) {
        const entries = [...items];
        const index = Number.isInteger(change.index) ? Math.max(0, Math.min(change.index, entries.length)) : 0;
        entries.splice(index, 0, [change.id, change.create]);
        collections.set(change.collection, new Map(entries));
      }
    } else if (own(change, "remove")) {
      if (items.has(change.id) && !equal(items.get(change.id), change.remove)) throw new PatchConflict("This game was changed elsewhere. Reload before deleting it.");
      items.delete(change.id);
    } else {
      if (!items.has(change.id)) throw new PatchConflict("This game no longer exists. Reload before saving again.");
      if (list && change.fields?.some(field => field.key === "id")) throw new Error("Game IDs cannot change");
      items.set(change.id, applyFields(items.get(change.id), change.fields));
    }
  }
  for (const [key, items] of collections) result[key] = shape.lists.includes(key) ? [...items.values()] : Object.fromEntries(items);
  if (patch.fields.some(field => !shape.fields.includes(field.key))) throw new Error("Invalid collection field");
  result = applyFields(result, patch.fields);
  for (const change of patch.objects) {
    if (!(shape.objects || []).includes(change.key)) throw new Error("Invalid settings change");
    result[change.key] = applyFields(result[change.key] || {}, change.fields);
  }
  return result;
}
