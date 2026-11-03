// Keep expensive Unicode normalization off repeated filter/statistics passes.
export function createSearchCache(normalize) {
  const entries = new WeakMap();
  return (game, text) => {
    const cached = entries.get(game);
    if (cached?.text === text) return cached.normalized;
    const normalized = normalize(text);
    entries.set(game, { text, normalized });
    return normalized;
  };
}
