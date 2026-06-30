# Gamelist

A personal game backlog, preorder, price, trophy, and physical shelf tracker.

The app is a static frontend served by a Cloudflare Worker. Saved data lives in Cloudflare KV, and API routes under `functions/api` handle sync, search, store prices, trophies, achievements, calendar events, and Shelf collection values.

## App Tour

The project has two connected pages:

- **Gamelist** at `/`: the digital/backlog/preorder tracker.
- **Shelf** at `/shelf`: the physical collection tracker.

Both pages share edit mode, theme settings, account settings, price-store settings, achievement integrations, and the same `GAMELIST` KV namespace. Shelf Sync can link physical collection items back into the main Gamelist backlog/new-addition flow.

### Gamelist Modules

**Currently Playing**
Shows games marked as currently playing, with cover art, owners, platform, start dates, trophy/achievement progress, and quick finish/backlog actions. The carousel also includes last finished games.

**Achievements**
Shows the combined PSN, Steam, and Xbox activity dashboard. Depending on the connected platform activity, the feed labels itself as trophies, achievements, or both. Completed/platinum games open into a filterable modal.

**Calendar**
Shows release dates for games in the list. Calendar popup cards are read-only release cards and do not repeat the release tag because the selected date already provides that context. Preordered games are visually marked on calendar days and in game cards.

**Highlights**
Shows summary counts for backlog, upcoming, available, completed, preordered, owner/status breakdowns, and other quick collection stats.

**Search / Filters**
Filters by title, platform, tag, preorder status, and sort order. The section can be reordered or hidden from Settings.

**Gamelist Board**
The main kanban-style list:

- **New additions**: newly synced physical shelf games that still need setup.
- **Backlog**: owned games waiting to be played.
- **Upcoming**: unreleased games.
- **Available**: released games you may want to buy.

Cards support drag ordering, detail view, prices, store links, trailers, guides, ownership/owner metadata, and trophy/achievement status.

**Finished Games**
Shows completed history with filters, completion dates, duration, owners, platform, and trophy/achievement completion styling.

### Shelf Modules

**Currently Playing**
Projects currently playing Gamelist games into Shelf so physical/digital activity can be seen from the collection page too.

**Last Finished**
Shows the latest finished Gamelist games as a compact carousel.

**Showcase**
A five-game featured shelf row. Editors can pick and reorder showcased games. Hover cards show title, developer/publisher, platform, console pill, trophy/achievement percentage when available, and tags.

**Achievements**
Shows the shared trophy/achievement dashboard on Shelf. Shelf game cards can show compact trophy/achievement progress and platform-aware trophy/achievement labels.

**Calendar**
Shows Gamelist release dates from the Shelf page. Calendar popup cards are neutral/read-only and omit repeated release tags and large trophy/achievement strips. Preordered games show a preorder chip.

**Highlights**
Shows physical collection stats such as owned count, estimated value, platforms, regions, conditions, and collection breakdowns.

**Search / Filters**
Filters the physical shelf by title, platform, region, condition, category, and sort direction.

**Shelf Library**
The main physical collection view. It supports grid/list view, owners, region flags, condition badges, categories, descriptions, collection value, store prices, trophy/achievement pills, and linked Gamelist entries.

### Settings

Settings are available in edit mode on both pages. They include:

- Page/module ordering and visibility.
- Theme editor, including dark/light mode, colors, logos, background glows, title font, gradient titles, and uppercase title toggle.
- Default order, currency, region, default owner, selected price stores, Shelf Sync, and Shelf price visibility.
- PSN, Microsoft/Xbox, and Steam account names.
- CSV import/export for Gamelist and Shelf game rows.

## What You Need

- Node.js 20 or newer
- A Cloudflare account
- Wrangler, Cloudflare's CLI
- One Cloudflare KV namespace bound as `GAMELIST`
- An `EDIT_PASSWORD` Worker secret

After the required Cloudflare setup, IGDB is the main integration to configure. PriceCharting is recommended for Shelf prices, and PSN, Steam, Xbox, and Google Calendar are optional.

## Local Development

Run the local static server:

```bash
node server.mjs
```

Open:

```text
http://localhost:8790
```

For Worker-style local testing, install/use Wrangler and run:

```bash
npx wrangler dev
```

Useful checks before pushing:

```bash
node --check app.js
node --check shelf.js
node --check worker.js
node --check functions/api/prices.js
node --check functions/api/collection-price.js
node --check functions/api/sync.js
node --check functions/api/shelf.js
node --check functions/api/shelf-covers.js
node --check functions/api/search.js
node --check scripts/test-shelf-sync.mjs
node scripts/test-shelf-sync.mjs
git diff --check
```

## Cloudflare Wrangler Setup

1. Install Wrangler and log in:

```bash
npm install -g wrangler
wrangler login
```

You can also use `npx wrangler ...` without a global install.

2. Create a KV namespace:

```bash
npx wrangler kv namespace create GAMELIST
```

3. Copy the generated namespace id into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GAMELIST"
id = "PASTE_THE_NEW_ID_HERE"
```

4. Choose the Worker name in `wrangler.toml`:

```toml
name = "my-gamelist"
```

5. Set the required edit password:

```bash
npx wrangler secret put EDIT_PASSWORD
```

6. Deploy:

```bash
npx wrangler deploy
```

The site will be available on the generated `workers.dev` URL unless you attach a custom domain in Cloudflare.

### Updating An Existing Deploy

For normal updates after editing the repo:

```bash
npx wrangler deploy
```

If you changed `wrangler.toml`, changed KV bindings, or added a new integration, confirm the relevant secret/namespace exists before deploying. Secrets are not stored in git, so a fresh Cloudflare Worker needs them set again with `npx wrangler secret put ...`.

If a browser keeps an old version after deploy, the app checks `version.json` and clears its own caches when the version changes. The service worker cache name is also versioned in `service-worker.js`.

## GitHub And GitLab Deploy Notes

This repo currently includes both default/GitHub and GitLab Wrangler environments because the original project used two Cloudflare deploys with separate saved-data namespaces:

- Default/GitHub deploy: `npx wrangler deploy` or `npx wrangler deploy --env github`
- GitLab deploy: `npx wrangler deploy --env gitlab`

The default and `github` environment keep `SHELF_ENABLED=true`. The `gitlab` environment sets `SHELF_ENABLED=false`, so Shelf routes and Shelf-only assets return `404` there.

For a normal downloaded/forked copy, you probably do not need the GitLab environment. To remove it cleanly:

1. Open `wrangler.toml`.
2. Delete the `[env.gitlab]`, `[env.gitlab.vars]`, and `[[env.gitlab.kv_namespaces]]` sections.
3. If you also do not need the explicit GitHub environment, delete `[env.github]`, `[env.github.vars]`, and `[[env.github.kv_namespaces]]`.
4. Keep the top-level `name`, `[vars]`, `[assets]`, and `[[kv_namespaces]]` sections.
5. Replace the top-level KV namespace id with your own `GAMELIST` namespace id.
6. Deploy with `npx wrangler deploy`.

If you keep multiple environments, each environment needs its own KV namespace binding and its own secrets. Set secrets for a specific environment like this:

```bash
npx wrangler secret put EDIT_PASSWORD --env gitlab
npx wrangler secret put PRICECHARTING_TOKEN --env gitlab
```

If a Cloudflare Pages/Workers project cannot change its deploy command, you can set this normal environment variable in that Cloudflare project's **Settings > Variables and Secrets**:

```text
CLOUDFLARE_ENV=gitlab
```

Then Cloudflare can keep running `npx wrangler deploy`, and Wrangler will deploy the `gitlab` environment.

## Required Cloudflare Pieces

`GAMELIST` KV namespace:
Stores saved Gamelist data, Shelf data, layout settings, favorite/showcase IDs, overrides, and synced preferences.

`EDIT_PASSWORD` secret:
Unlocks edit mode and allows saving to KV. Without it, the app can display data but cannot save edits to the cloud.

## Must-Do Integration

### IGDB Lookup

Game lookup works best with IGDB configured:

```bash
npx wrangler secret put IGDB_CLIENT_ID
npx wrangler secret put IGDB_CLIENT_SECRET
```

IGDB authentication uses Twitch developer credentials:

1. Open the Twitch Developer Console: `https://dev.twitch.tv/console`
2. Log in with a Twitch account.
3. Make sure the Twitch account has email verification and 2FA enabled.
4. Go to **Applications**.
5. Click **Register Your Application**.
6. Use any name, for example `Gamelist`.
7. Use `http://localhost` as the OAuth Redirect URL. The app only needs server-to-server credentials, but Twitch requires a redirect URL when registering.
8. Set the category to **Website Integration** or the closest available app category.
9. Create the app.
10. Copy the **Client ID** into the `IGDB_CLIENT_ID` Cloudflare secret.
11. Create/copy the app secret into `IGDB_CLIENT_SECRET`.

The app requests Twitch app access tokens automatically. Without IGDB credentials, lookup falls back where possible, but results may be weaker.

IGDB is used by:

- Game lookup in Gamelist and Shelf.
- Cover, description, publisher/developer, genre, release date, platform, trailer, and store-link enrichment.
- The Shelf IGDB cover refresh tool.

## Recommended Integration

### PriceCharting Token

Shelf collection values work best with a PriceCharting API token:

```bash
npx wrangler secret put PRICECHARTING_TOKEN
```

To get the token:

1. Log into PriceCharting.
2. Make sure the account has a paid subscription with API access.
3. Open the PriceCharting **Subscription** page.
4. Click **API/Download**.
5. Copy the 40-character access token.
6. Paste it into Wrangler when `npx wrangler secret put PRICECHARTING_TOKEN` asks for the secret value.

With this token, saved PriceCharting product IDs can be fetched directly through PriceCharting's product API. Without it, the app falls back to public PriceCharting search/product pages, which can be slower and less reliable during bulk Shelf price updates.

## Optional Integrations

### PSN Trophy Activity

The trophy widgets use Sony's PSN API through a Cloudflare Worker secret called `PSN_NPSSO`.

1. Log into PlayStation in your browser: `https://www.playstation.com/`
2. In the same browser, open: `https://ca.account.sony.com/api/v1/ssocookie`
3. Copy only the long `npsso` token value from the JSON response.
4. Set it as a Cloudflare secret:

```bash
npx wrangler secret put PSN_NPSSO
```

You can also set a default PSN profile name:

```bash
npx wrangler secret put PSN_PROFILE_USER
```

Treat the NPSSO token like a password. Do not commit it, paste it in chat, or put it in `wrangler.toml`. If trophies stop loading, refresh the token.

### Steam Achievements

PC game overlays can show Steam achievements when these are configured:

```bash
npx wrangler secret put STEAM_API_KEY
npx wrangler secret put STEAM_PROFILE_USER
```

Get a Steam Web API key from `https://steamcommunity.com/dev/apikey`.

Set `STEAM_PROFILE_USER` to a SteamID64, Steam profile URL, or vanity name. The site's Settings overlay also has a **Steam account** field; if filled, it overrides the Cloudflare value for that browser/account. For each PC game, add a Steam store URL or Steam App ID in the game editor.

Steam achievements are only fetched for Steam app IDs owned by the configured Steam account. Make sure the account's game details/library visibility allows Steam Web API access. Legacy games saved with the platform `PC` are treated as `Steam`; use `Xbox PC` for Microsoft Store or PC Game Pass games.

### Xbox Achievements

Xbox 360, Xbox One, Xbox Series, and Xbox PC games can show achievements through OpenXBL. Create a personal API key in the OpenXBL dashboard, then add it as a Cloudflare secret:

```bash
npx wrangler secret put OPENXBL_API_KEY
```

You can optionally set a default gamertag:

```bash
npx wrangler secret put XBOX_GAMERTAG
```

The site's Settings overlay has a **Microsoft account** field that accepts an Xbox gamertag or XUID. When filled, it overrides `XBOX_GAMERTAG`.

### Google Calendar Preorder Events

When a game is newly marked as preordered and has a release date, the Worker can create an all-day Google Calendar event named `Preorder Game Name`.

Set up a Google Cloud service account with Google Calendar API access, then share the target calendar with the service account email with permission to make changes.

Set these Cloudflare secrets:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put GOOGLE_CALENDAR_ID
```

`GOOGLE_CALENDAR_ID` can be your calendar ID from Google Calendar settings. The private key should be the `private_key` value from the service account JSON. Do not commit it.

## First Run

1. Deploy the Worker.
2. Open the site.
3. Click edit/login and enter `EDIT_PASSWORD`.
4. Open Settings.
5. Set currency, region, selected shops, default owner, account names, theme, Shelf Sync, and visible sections.
6. Save settings.

Those settings are stored in the Worker KV namespace.

## Common Workflows

### Add A Gamelist Game

1. Enter edit mode.
2. Click **Add Game**.
3. Search by title or paste an IGDB game URL.
4. Choose the section: Backlog, Upcoming, Available, or New addition.
5. Add platform, owners, preorder store, release date, store links, Steam App ID, trophy name, cover, and notes as needed.
6. Save.

If Google Calendar is configured, adding a new preorder store to an upcoming/wanted game with a release date can create a preorder calendar event.

### Add A Shelf Game

1. Open `/shelf`.
2. Enter edit mode.
3. Click **Add Game**.
4. Search by title, UPC/SKU/ASIN/PriceCharting data, or enter details manually.
5. Set platform, region, owners, condition parts, collection value fields, publisher/developer, genre, cover, and notes.
6. Save.

New physical games can sync into the Gamelist as setup-needed backlog/new-addition entries when Shelf Sync is enabled.

### Import And Export CSV

Both pages have **CSV data** controls at the bottom of Settings, after Stores.

- **Export** downloads the current game rows as CSV.
- **Import** replaces the current game rows from a CSV after confirmation.
- Arrays and objects, such as owners, tags, store links, prices, and metadata, are preserved as JSON text inside CSV cells.

Use CSV export before any large bulk operation if you want a quick backup.

### Refresh Shelf Covers From IGDB

After deploying the current Worker and logging into edit mode, open:

```text
https://YOUR_WORKER.workers.dev/api/shelf-covers?apply=1
```

Click **Start**. The page processes Shelf games in small batches so Cloudflare requests do not time out. It searches IGDB, accepts only `images.igdb.com` covers, and saves each batch to KV.

Auto-start version:

```text
https://YOUR_WORKER.workers.dev/api/shelf-covers?apply=1&run=1
```

Dry run, without saving:

```text
https://YOUR_WORKER.workers.dev/api/shelf-covers
```

If the URL returns `404`, deploy the Worker again with:

```bash
npx wrangler deploy
```

If the URL says unauthorized, open the site, enter edit mode, and then open the URL again in the same browser. If it says IGDB credentials are missing, set `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` as Cloudflare secrets and redeploy.

## Data Notes

- Main Gamelist KV key: `gamelist-data`
- Shelf KV key: `shelf-data`
- Cloud sync endpoint: `/api/sync`
- Shelf sync endpoint: `/api/shelf`
- Shelf IGDB cover refresh endpoint: `/api/shelf-covers`
- Search/IGDB endpoint: `/api/search`
- Auth endpoint: `/api/auth`
- Local browser draft backup: `localStorage`

To start clean, use a brand-new KV namespace. To clone existing data, copy the relevant KV values into the new namespace.
