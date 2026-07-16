# Gamelist

Gamelist is a personal game backlog, preorder, price, trophy, achievement, and physical shelf tracker. It runs as a static frontend served by a Cloudflare Worker, with saved data stored in Cloudflare KV.

The app has two connected pages:

- `/` for the main digital backlog, preorder, release, and completion tracker.
- `/shelf` for the physical collection tracker.

Both pages share edit mode, themes, account settings, price-store settings, achievement integrations, and the same `GAMELIST` KV namespace. Shelf Sync can also send physical collection additions back into the main Gamelist flow.

## Features

- Backlog, upcoming, available, currently playing, and finished-game boards.
- Physical Shelf library with owners, regions, conditions, categories, prices, collection value, and linked Gamelist entries.
- IGDB-powered lookup for covers, release dates, descriptions, genres, developers, publishers, trailers, and store links.
- PSN, Steam, and Xbox trophy/achievement dashboards.
- Release calendar with preorder markers.
- CSV import/export for Gamelist and Shelf data.
- Theme editor with dark/light mode, colors, logos, title styles, and module ordering.
- Cloud sync through Cloudflare Workers KV.
- Google Calendar preorder events when configured.

## Project Structure

```text
.
|-- index.html                 # Main Gamelist app shell
|-- shelf.html                 # Shelf app shell
|-- app.js                     # Main Gamelist frontend
|-- shelf.js                   # Shelf frontend
|-- styles.css                 # Main styles
|-- shelf.css                  # Shelf styles
|-- worker.js                  # Cloudflare Worker entry
|-- functions/api/             # Worker API routes
|-- assets/                    # Icons, platform art, flags, fonts, backdrops
|-- scripts/                   # Local helper/test scripts
|-- server.mjs                 # Simple local static server
`-- wrangler.toml              # Cloudflare Worker configuration
```

## Requirements

- A Cloudflare account
- A Cloudflare KV namespace bound as `GAMELIST`
- An `EDIT_PASSWORD` Worker secret
- A GitHub account for the dashboard-only Cloudflare deploy path
- Node.js 20 or newer and Wrangler only if you want local development or command-line deploys

## Quick Start

Run the local static server:

```bash
node server.mjs
```

Open:

```text
http://localhost:8790
```

For Worker-style local testing, use Wrangler:

```bash
npx wrangler dev
```

Before pushing changes, these checks are useful:

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

## Download Or Clone

### Option 1: Clone With Git

```bash
git clone https://github.com/ShabiiEXE/Gamelist.git
cd Gamelist
```

This is the best option if you want to pull future updates.

### Option 2: Fork On GitHub

1. Open `https://github.com/ShabiiEXE/Gamelist`.
2. Click **Fork**.
3. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/Gamelist.git
cd Gamelist
```

This is the best option if you want your own GitHub copy that can deploy to Cloudflare and still receive updates from the main repository.

### Option 3: Download ZIP

1. Open `https://github.com/ShabiiEXE/Gamelist`.
2. Click **Code > Download ZIP**.
3. Extract the ZIP.
4. Open a terminal in the extracted folder.

ZIP downloads are fine for testing, but they do not keep Git history. Use a fork or clone if you want automatic updates.

## Cloudflare Dashboard Deploy

This is the easiest no-terminal path for most people. It uses a GitHub fork and Cloudflare Workers Builds, so Cloudflare pulls the code from GitHub and deploys it from the Cloudflare dashboard.

### 1. Fork This Repository

1. Open `https://github.com/ShabiiEXE/Gamelist`.
2. Click **Fork**.
3. Keep the fork on the `main` branch.

### 2. Create Your Cloudflare KV Namespace

1. Open the Cloudflare dashboard.
2. Go to **Storage & Databases > KV**.
3. Create a namespace named `GAMELIST`.
4. Copy the namespace ID.

### 3. Edit `wrangler.toml` In GitHub

In your fork, open `wrangler.toml` and click GitHub's edit button.

Change the Worker name and top-level KV namespace ID:

```toml
name = "your-gamelist-name"

[[kv_namespaces]]
binding = "GAMELIST"
id = "YOUR_CLOUDFLARE_KV_NAMESPACE_ID"
```

You can also delete the `[env.github]`, `[env.gitlab]`, and matching environment KV sections if you only want one deploy. Commit the edit directly to your fork's `main` branch.

The Worker name in Cloudflare must match the `name` in `wrangler.toml`.

### 4. Connect The Fork In Cloudflare

1. In Cloudflare, open **Workers & Pages**.
2. Create or import a Worker from a Git repository.
3. Choose your GitHub fork.
4. Use the repository root as the project directory.
5. Leave the build command empty unless Cloudflare requires one.
6. Set the deploy command to:

```bash
npx wrangler deploy
```

Cloudflare will use the `wrangler.toml` file from your fork.

### 5. Add Secrets In Cloudflare

In the Worker project settings, open **Variables and Secrets** and add:

```text
EDIT_PASSWORD
```

That is the only required secret. Add these later if you use the integrations:

```text
IGDB_CLIENT_ID
IGDB_CLIENT_SECRET
PRICECHARTING_TOKEN
PSN_NPSSO
PSN_PROFILE_USER
STEAM_API_KEY
STEAM_PROFILE_USER
OPENXBL_API_KEY
XBOX_GAMERTAG
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_CALENDAR_ID
```

### 6. Deploy

Trigger the first build from Cloudflare. After that, every push to your GitHub fork can deploy automatically.

Open the generated `workers.dev` URL, log in with your edit password, then configure Settings inside the app.

## Cloudflare Command-Line Deploy

This project deploys as a Cloudflare Worker with static assets and Worker API routes.

### 1. Install Wrangler And Log In

```bash
npm install -g wrangler
wrangler login
```

You can also use `npx wrangler ...` without installing Wrangler globally.

### 2. Create A KV Namespace

```bash
npx wrangler kv namespace create GAMELIST
```

Copy the namespace ID that Wrangler prints.

### 3. Edit `wrangler.toml`

Replace the Worker name and KV namespace ID with your own values:

```toml
name = "my-gamelist"

[[kv_namespaces]]
binding = "GAMELIST"
id = "PASTE_YOUR_KV_NAMESPACE_ID_HERE"
```

The checked-in `wrangler.toml` includes the original project's namespace IDs. Anyone cloning or forking should replace them with their own Cloudflare KV namespace IDs before deploying.

If you do not need multiple deploy environments, you can delete the `[env.github]`, `[env.gitlab]`, and matching environment KV sections. Keep the top-level `name`, `main`, `compatibility_date`, `[vars]`, `[assets]`, and `[[kv_namespaces]]` sections.

### 4. Set The Required Secret

```bash
npx wrangler secret put EDIT_PASSWORD
```

This password unlocks edit mode and allows the app to save data to KV.

### 5. Deploy

```bash
npx wrangler deploy
```

Wrangler will print your `workers.dev` URL. Open it, log in with your edit password, then open Settings to configure currency, region, stores, owners, account names, theme, Shelf Sync, and visible sections.

## Keep A Fork Or Clone Synced

The main repository is:

```text
https://github.com/ShabiiEXE/Gamelist.git
```

### Manual Sync For A Local Clone

If you cloned your own fork, add the main repository as `upstream`:

```bash
git remote add upstream https://github.com/ShabiiEXE/Gamelist.git
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Run the same commands whenever you want to pull updates from the main repository.

If you only cloned the main repository directly, update with:

```bash
git pull origin main
```

### Automatic Sync For GitHub Forks

This repository includes `.github/workflows/sync-from-upstream.yml`. In a fork, that workflow:

- Runs once per day.
- Can be started manually from the GitHub **Actions** tab.
- Fetches `ShabiiEXE/Gamelist`.
- Fast-forwards your fork's `main` branch.
- Pushes the updated `main` branch back to your fork.

To enable it in your fork:

1. Open your fork on GitHub.
2. Go to **Actions**.
3. Enable workflows if GitHub asks.
4. Open **Sync from upstream**.
5. Click **Run workflow** once to test it.

The workflow uses `--ff-only`, so it updates cleanly when your fork has no conflicting commits. If you edit the same files differently in your fork, GitHub will stop the sync instead of overwriting your work. Resolve the conflict locally, then push your fixed `main` branch.

### Fork Layout That Syncs Cleanly

For the smoothest syncing:

- Keep your deploy-specific changes small, usually just `wrangler.toml` and secrets in Cloudflare.
- Put personal experiments on a feature branch instead of directly on `main`.
- Pull upstream updates before making large local changes.
- Export CSV data before bulk edits inside the app.

## Updating An Existing Deploy

For normal updates after editing or syncing the repo:

```bash
npx wrangler deploy
```

If you changed `wrangler.toml`, changed KV bindings, or added a new integration, confirm the relevant secret/namespace exists before deploying.

If a browser keeps an old version after deploy, the app checks `version.json` and clears its own caches when the version changes. The service worker cache name is also versioned in `service-worker.js`.

## Cloudflare Preview Deploys

To deploy the current repo to a separate Workers preview URL without replacing the main Worker, use a different Worker name:

```bash
npx wrangler deploy --env="" --name gamelist-dev --message "Preview build"
```

Preview deploys use the same top-level `GAMELIST` KV binding unless you change `wrangler.toml` to point at a separate namespace.

## Required Cloudflare Pieces

`GAMELIST` KV namespace:
Stores saved Gamelist data, Shelf data, layout settings, favorite/showcase IDs, overrides, and synced preferences.

`EDIT_PASSWORD` secret:
Unlocks edit mode and allows saving to KV. Without it, the app can display data but cannot save edits to the cloud.

## Required Integration

### IGDB Lookup

Game lookup works best with IGDB configured:

```bash
npx wrangler secret put IGDB_CLIENT_ID
npx wrangler secret put IGDB_CLIENT_SECRET
```

IGDB authentication uses Twitch developer credentials:

1. Open the Twitch Developer Console: `https://dev.twitch.tv/console`.
2. Log in with a Twitch account.
3. Make sure the account has email verification and 2FA enabled.
4. Go to **Applications**.
5. Click **Register Your Application**.
6. Use any app name, for example `Gamelist`.
7. Use `http://localhost` as the OAuth Redirect URL.
8. Set the category to **Website Integration** or the closest available category.
9. Create the app.
10. Copy the **Client ID** into the `IGDB_CLIENT_ID` Cloudflare secret.
11. Create/copy the app secret into `IGDB_CLIENT_SECRET`.

The app requests Twitch app access tokens automatically. Without IGDB credentials, lookup falls back where possible, but search and metadata quality will be weaker.

## Recommended Integrations

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
6. Paste it into Wrangler when prompted.

With this token, saved PriceCharting product IDs can be fetched directly through PriceCharting's product API. Without it, the app falls back to public PriceCharting search/product pages, which can be slower and less reliable during bulk Shelf price updates.

### PSN Trophy Activity

The trophy widgets use Sony's PSN API through a Cloudflare Worker secret called `PSN_NPSSO`.

1. Log into PlayStation in your browser: `https://www.playstation.com/`.
2. In the same browser, open: `https://ca.account.sony.com/api/v1/ssocookie`.
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

### Run Shelf Price Audit

After logging into edit mode, open:

```text
https://YOUR_WORKER.workers.dev/api/shelf-price-audit
```

The audit page lists Shelf games that still look dollar-priced or have zero/missing values. JSON version:

```text
https://YOUR_WORKER.workers.dev/api/shelf-price-audit?format=json
```

### Bulk Shelf API

Bulk Shelf write endpoints require edit authentication. Send the edit password in the same header used by the app:

```text
x-edit-password: YOUR_EDIT_PASSWORD
```

Mass add owned physical games to Shelf:

```bash
curl -X POST https://YOUR_WORKER.workers.dev/api/shelf-mass-add \
  -H "Content-Type: application/json" \
  -H "x-edit-password: YOUR_EDIT_PASSWORD" \
  --data '{"games":[{"title":"Game Title","platform":"Sony PlayStation 5","country":"Spain","owners":["Owner"]}]}'
```

Accept all pending Shelf **New additions** into the physical collection:

```bash
curl -X POST https://YOUR_WORKER.workers.dev/api/shelf-mass-add \
  -H "Content-Type: application/json" \
  -H "x-edit-password: YOUR_EDIT_PASSWORD" \
  --data '{"acceptPending":true}'
```

You can also accept selected pending additions with:

```json
{ "ids": ["shelf-id-1", "shelf-id-2"] }
```

Mass fill missing Shelf metadata from IGDB and PriceCharting:

```bash
curl -X POST https://YOUR_WORKER.workers.dev/api/shelf-metadata \
  -H "Content-Type: application/json" \
  -H "x-edit-password: YOUR_EDIT_PASSWORD" \
  --data '{"all":true,"limit":25}'
```

By default, `/api/shelf-metadata` only fills missing fields and leaves existing metadata, PriceCharting IDs, prices, and collection values alone. Use `ids` to target specific Shelf games, and use `igdb:false` or `pricecharting:false` to run only one metadata source:

```json
{ "ids": ["shelf-id-1"], "igdb": true, "pricecharting": false }
```

`overwrite:true` is available for intentional replacement, but use CSV export first if you are doing a large overwrite.

## Data Notes

- Main Gamelist KV key: `gamelist-data`
- Shelf KV key: `shelf-data`
- Cloud sync endpoint: `/api/sync`
- Settings-only sync endpoint: `/api/sync?settings=1`
- Shelf sync endpoint: `/api/shelf`
- Shelf mass add endpoint: `/api/shelf-mass-add`
- Shelf missing metadata endpoint: `/api/shelf-metadata`
- Shelf IGDB cover refresh endpoint: `/api/shelf-covers`
- Shelf price audit endpoint: `/api/shelf-price-audit`
- Search/IGDB endpoint: `/api/search`
- Store price endpoint: `/api/prices`
- Shelf collection price endpoint: `/api/collection-price`
- Cover proxy endpoint: `/api/cover`
- Gamelist games by list endpoint: `/api/gamelist-games-by-list`
- Completed Gamelist games by year endpoint: `/api/completed-games-by-year`
- Shelf games and platforms endpoint: `/api/shelf-games-platforms`
- PSN trophies and platinums by year endpoint: `/api/psn-trophies-by-year`
- Steam achievements and completed games by year endpoint: `/api/steam-trophies-by-year`
- Xbox achievements, gamerscore, and completed games by year endpoint: `/api/xbox-trophies-by-year`
- PSN trophy endpoint: `/api/trophies`
- PSN activity endpoint: `/api/achievements`
- Steam achievements endpoint: `/api/steam-achievements`
- Xbox achievements endpoint: `/api/xbox-achievements`
- Google Calendar preorder endpoint: `/api/calendar`
- Auth endpoint: `/api/auth`
- Local browser draft backup: `localStorage`

The summary endpoints above are served under `/api/...` and cache their generated JSON in KV for one hour, including the PSN/Steam/Xbox aggregate endpoints so they do not repeatedly call external profile APIs. Add `?refresh=1` to rebuild a summary immediately.

In edit mode, Settings also exposes page-specific **Dev features** links. Gamelist shows data/settings/auth endpoints. Shelf shows Shelf data, mass add, metadata fill, Shelf price audit, and Shelf IGDB cover refresh tools.

To start clean, use a brand-new KV namespace. To clone existing saved data, copy the relevant KV values into the new namespace.
