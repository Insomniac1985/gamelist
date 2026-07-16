# Gamelist

Gamelist is a personal game backlog, preorder, price, trophy, achievement, and physical shelf tracker. It runs as a static frontend served by a Cloudflare Worker, with saved data stored in Cloudflare KV.

The app has two connected pages:

- `/` for the main digital backlog, preorder, release, and completion tracker.
- `/shelf` for the physical collection tracker.

Both pages share edit mode, themes, account settings, price-store settings, achievement integrations, and the same `GAMELIST` KV namespace. Shelf Sync can also send physical collection additions back into the main Gamelist flow.

## Features

- Backlog, upcoming, available, currently playing, and finished-game boards.
- Physical Shelf library with multiple owners, regions, conditions, categories, prices, collection value, and linked Gamelist entries.
- Shelf Showcase block for featured games, plus shared Currently Playing, Last Finished, Highlights, and Search modules.
- IGDB-powered lookup for covers, release dates, descriptions, genres, developers, publishers, trailers, and store links.
- PSN, Steam, and Xbox trophy/achievement dashboards.
- Game of the Year tracking and poster export.
- Release calendar with preorder markers.
- Mobile-ready responsive layout for phone, tablet, and desktop use.
- CSV import/export for Gamelist and Shelf data.
- Theme editor with dark/light mode, colors, logos, title styles, and module ordering.
- Cloud sync through Cloudflare Workers KV.
- Google Calendar preorder events when configured.

## How To Setup Your Own Gamelist

This is the main setup path. You do not need to download a ZIP or run terminal commands. Cloudflare Workers Builds can import the GitHub repository, build it, and deploy it from the Cloudflare dashboard.

### 1. Start From Cloudflare

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages**.
3. Click **Create application**.
4. Click **Continue with GitHub**.
5. Choose **Import a repository**.
6. Choose **Clone a public repository via GitHub URL**.
7. Add this repository URL:

```text
https://github.com/ShabiiEXE/Gamelist
```

8. Continue with the imported repository.
9. If Cloudflare sends you to GitHub, set up or sign in to your GitHub account and allow the connection.
10. Keep the default settings and click **Deploy**.
11. Once deployed, open **Overview** in the nav bar and click **Visit** to open your site.
12. If the **Visit** button is not available, open **Domains** in the nav bar and enable both URLs.

### 2. Add Secrets In Cloudflare

In the Worker project settings, add your secrets through the Cloudflare website:

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages**.
3. Open your Gamelist Worker.
4. Open **Settings**.
5. Open **Variables and Secrets**.
6. Click **Add**.
7. Choose **Secret** for passwords, API keys, and tokens.
8. Enter the variable name exactly as shown below.
9. Paste the value.
10. Deploy/Save.

Add this required secret first:

```text
EDIT_PASSWORD
```

`EDIT_PASSWORD` is the password you will type in the app to unlock edit mode and change your site settings and theme.

Required integration:

#### IGDB Lookup

Game lookup works best with IGDB configured. In Cloudflare **Variables and Secrets**, add `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` as secrets.

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

Add these later if you use the recommended integrations:

```text
PRICECHARTING_TOKEN
PSN_NPSSO
STEAM_API_KEY
OPENXBL_API_KEY
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_CALENDAR_ID
```

Use **Secret** for all integration keys/tokens. Do not put them in `wrangler.toml`, do not commit them to GitHub, and do not share them publicly.

Add profile/account names inside the app after the first deploy: enter edit mode, open **Settings**, then fill the PlayStation, Steam, and Microsoft/Xbox account fields there.

### 3. Deploy

Trigger the first build from Cloudflare. After that, every push to your connected GitHub repository can deploy automatically.

Open the generated `workers.dev` URL, log in with your edit password, then configure Settings inside the app.

## Required Cloudflare Pieces

`GAMELIST` KV namespace:
Stores saved Gamelist data, Shelf data, layout settings, favorite/showcase IDs, overrides, and synced preferences.

`EDIT_PASSWORD` secret:
Unlocks edit mode and allows saving to KV. Without it, the app can display data but cannot save edits to the cloud.

## Recommended Integrations

### PriceCharting Token

Shelf collection values work best with a PriceCharting API token. In Cloudflare **Variables and Secrets**, add `PRICECHARTING_TOKEN` as a secret.

To get the token:

1. Log into PriceCharting.
2. Make sure the account has a paid subscription with API access.
3. Open the PriceCharting **Subscription** page.
4. Click **API/Download**.
5. Copy the 40-character access token.
6. Paste it into the `PRICECHARTING_TOKEN` secret in Cloudflare.

With this token, saved PriceCharting product IDs can be fetched directly through PriceCharting's product API. Without it, the app falls back to public PriceCharting search/product pages, which can be slower and less reliable during bulk Shelf price updates.

### PSN Trophy Activity

The trophy widgets use Sony's PSN API through a Cloudflare Worker secret called `PSN_NPSSO`.

1. Log into PlayStation in your browser: `https://www.playstation.com/`.
2. In the same browser, open: `https://ca.account.sony.com/api/v1/ssocookie`.
3. Copy only the long `npsso` token value from the JSON response.
4. Add it to Cloudflare **Variables and Secrets** as `PSN_NPSSO`.

Set your PlayStation profile name inside the app: enter edit mode, open **Settings**, and fill the PlayStation account field.

Treat the NPSSO token like a password. Do not commit it, paste it in chat, or put it in `wrangler.toml`. If trophies stop loading, refresh the token.

### Steam Achievements

PC game overlays can show Steam achievements when these are configured:

```text
STEAM_API_KEY
```

Add `STEAM_API_KEY` in Cloudflare **Variables and Secrets** as a secret.

Get a Steam Web API key from `https://steamcommunity.com/dev/apikey`.

Set your Steam account inside the app: enter edit mode, open **Settings**, and fill the **Steam account** field with a SteamID64, Steam profile URL, or vanity name. For each PC game, add a Steam store URL or Steam App ID in the game editor.

Steam achievements are only fetched for Steam app IDs owned by the configured Steam account. Make sure the account's game details/library visibility allows Steam Web API access. Legacy games saved with the platform `PC` are treated as `Steam`; use `Xbox PC` for Microsoft Store or PC Game Pass games.

### Xbox Achievements

Xbox 360, Xbox One, Xbox Series, and Xbox PC games can show achievements through OpenXBL. Create a personal API key in the OpenXBL dashboard, then add it as a Cloudflare secret:

```text
OPENXBL_API_KEY
```

Add `OPENXBL_API_KEY` in Cloudflare **Variables and Secrets** as a secret.

Set your Xbox account inside the app: enter edit mode, open **Settings**, and fill the **Microsoft account** field with an Xbox gamertag or XUID.

### Google Calendar Preorder Events

When a game is newly marked as preordered and has a release date, the Worker can create an all-day Google Calendar event named `Preorder Game Name`.

Set up a Google Cloud service account with Google Calendar API access, then share the target calendar with the service account email with permission to make changes.

Set these Cloudflare secrets:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_CALENDAR_ID
```

Add them in Cloudflare **Variables and Secrets** as secrets.

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

## Automatic Updates

This repository includes `.github/workflows/sync-from-upstream.yml` for people who deploy from their own GitHub copy of Gamelist.

The workflow:

- Runs hourly.
- Can also be started manually from the GitHub **Actions** tab.
- Fetches updates from `https://github.com/ShabiiEXE/Gamelist`.
- Merges those updates into the connected repository's `main` branch.
- Restores that repository's own `wrangler.toml` before committing, so its Cloudflare Worker name, KV namespace, and account-specific config are not overwritten.
- Pushes the synced result back to that repository.

This matters because every Cloudflare account needs its own `wrangler.toml` values. The app code can stay up to date with the main repository, while each deploy keeps its own Cloudflare binding.

To turn it on in a GitHub copy:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Enable workflows if GitHub asks.
4. Open **Sync from upstream**.
5. Click **Run workflow** once to test it.

If a file other than `wrangler.toml` has a merge conflict, GitHub stops the sync instead of overwriting custom work. Fix the conflict in GitHub or locally, then run the workflow again.

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

## Requirements

- A Cloudflare account
- A Cloudflare KV namespace bound as `GAMELIST`
- An `EDIT_PASSWORD` Worker secret
- A GitHub account for the dashboard-only Cloudflare deploy path

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
