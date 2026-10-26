# Assets

- `backgrounds/`: page backgrounds.
- `branding/`: site logos and owner marks; `app-icons/` contains installable app icons.
- `icons/`: SVG interface icons grouped into actions, navigation, status, settings, and brands.
- `charts/`: SVG chart templates and chart fragments. Numbered `{{0}}` placeholders receive values calculated by the views.
- `svg/catalog.svg`: generated catalog containing all icon and chart templates for one-request loading.
- `fonts/`, `platforms/`, `flags/`, `sites/`, `stores/`, `discord/`: existing assets grouped by purpose.

Edit the individual SVG files, then run `node scripts/build-svg-catalog.mjs` to rebuild the catalog. `svg-assets.js` renders templates and hydrates static HTML placeholders. User text passed to a template must already be escaped by its view.

Legacy root image URLs are redirected by `asset-paths.js` so saved theme settings continue to work.
