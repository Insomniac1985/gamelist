# Collection performance checks

Run the Node checks without additional dependencies:

```sh
node scripts/test-collection-performance.mjs
node scripts/test-batched-list.mjs
node scripts/test-shelf-lending.mjs
node scripts/test-ui-sounds.mjs
```

For the browser checks, install Playwright outside the repository or in your development environment, then run:

```sh
node scripts/test-collection-browser.mjs
```

`PLAYWRIGHT_MODULE` may point to an installed `playwright/index.mjs`. `CHROME_PATH` may point to an existing Chrome executable. Otherwise the script uses Playwright's Chrome channel. The test starts its own local HTTP server and uses isolated browser contexts and in-memory collections; it never contacts a production collection. It covers desktop and mobile layouts, 500/2,000/5,000 games, continuous scrolling, full-library search, condition filters, list view, selective edits, save failure/retry, legacy defaults, IndexedDB backups, and ETag revalidation. It prints local timings and request sizes. Timings are observations, not production latency guarantees.

Normal saves use field changes with expected previous values. The server merges against its current stored document, rejects observed same-field conflicts with HTTP 409, and accepts idempotent retries. Full PUT requests remain available for existing clients and imports. Linked-game and showcase work is skipped when those fields are unchanged.

Lists initially render 100 cards/rows, automatically append more as the user scrolls, search the complete collection, and reuse unchanged DOM nodes. Already loaded games remain in the continuous list; DOM size grows as the user scrolls. Editing a fully loaded 5,000-game list replaces only the changed card. Custom ordering replaces only the loaded range's original slots, leaving other games in place. Search normalization and Shelf filter/statistics results are cached. Optional editor loading waits for user intent, and Shelf achievement loading waits for browser idle time.

Collection reads use private ETags and asynchronous IndexedDB response caches. Cached responses are cloned before use so unsaved mutations cannot modify cached data. Editor reads still require successful revalidation; they do not silently accept stale data after a network failure. Main local backups migrate from localStorage to IndexedDB after a successful write, with a localStorage fallback when IndexedDB is unavailable.

The server still stores each collection as one KV document. These changes reduce browser work, network transfers, and unnecessary KV operations; they do not migrate saved collections to a new database. Field checks are application-level conflict detection, not a transactional lock across simultaneous requests or KV replicas. A future per-record transactional storage migration would address that remaining limitation.

The older `test-shelf-sync.mjs` now verifies recorded completion hours and completion dates with behavioral checks. It still fails an unrelated legacy theme-editor structure assertion before reaching its runtime sync checks. The new performance suite independently exercises the changed save/read handlers, auth, linked-owner sync, source overrides, deletions, and legacy full saves.
