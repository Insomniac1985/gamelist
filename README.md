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

This is the main setup path. You do not need to download a ZIP or run terminal commands. Cloudflare can import the public GitHub repository URL directly from the dashboard and automatically setup your own personal copy for you, for free.

#### Setup requirements

- A Cloudflare account
- A Github account
- A Twitch account

### 1. Start From Cloudflare

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
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
13. After your site opens, continue to **Automatic Updates** below if you want to add update sync.

### 2. Add Secrets In Cloudflare

In the Worker project settings, add your secrets through the Cloudflare website:

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
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

Use **Secret** for all integration keys/tokens. Do not put them in `wrangler.toml`, do not commit them to GitHub, and do not share them publicly.

Now **continue** the setup until you reach **Recommended Integrations**. The next integrations are **required** to make it all work properly, but the recommended ones will help you improve your experience a bit more.

### 3. Add game search and auto-fill

Game lookup requires integrating with IGDB.
IGDB authentication uses Twitch developer credentials:

1. Open the [Twitch Developer Console](https://dev.twitch.tv/console).
2. Log in with a Twitch account.
3. Make sure the account has email verification and 2FA enabled.
4. Go to **Applications**.
5. Click **Register Your Application**.
6. Use any app name, for example `Gamelist`.
7. Use `http://localhost` as the OAuth Redirect URL.
8. Set the category to **Website Integration** or the closest available category.
9. Create the app.
10. Copy the **Client ID** and create a new **Cloudflare secret**:

```text
IGDB_CLIENT_ID
```

11. Copy the **app secret** and create another **secret**:

```text
IGDB_CLIENT_SECRET
```

### 4. Automatic Updates

To receive upcoming Gamelist feature updates, add the GitHub Actions sync workflow to your repository.

1. Once the setup is done, go to your newly added GitHub repository.
2. Go to **Actions**.
3. Click **set up a workflow yourself**.
4. Name the file:

```text
main.yml
```

5. Open the [main.yml](https://github.com/ShabiiEXE/Gamelist/blob/main/.github/workflows/main.yml) workflow action file from the main Gamelist repository.
6. Copy the code from that file.
7. Paste it into the empty workflow text box.
8. Commit the changes.
9. Go back to **Actions**.
10. Open **Sync from upstream**.
11. Enable the workflow if GitHub asks.
12. Click **Run workflow** once to test it.
13. After that, the workflow checks for updates every 30 minutes and keeps your own `wrangler.toml` settings.

To force an update manually later, open your repository, go to **Actions**, open **Sync from upstream**, and click **Run workflow**. This manual button is still available even when Cloudflare cron triggering is configured.

If GitHub scheduled actions stop running, Cloudflare can trigger this workflow instead.

1. Open [GitHub fine-grained personal access tokens](https://github.com/settings/personal-access-tokens).
2. Click **Generate new token**.
3. Use a clear name, for example `Gamelist Cloudflare updater`.
4. Set an expiration date.
5. Under **Resource owner**, choose the GitHub account that owns your Gamelist repository.
6. Under **Repository access**, choose **Only select repositories**.
7. Select only your Gamelist repository. Do not select any other repositories.
8. Under **Repository permissions**, set **Actions** to **Read and write**.
9. Leave every other permission as **No access** unless GitHub requires **Metadata**, which is added automatically.
10. Click **Generate token**.
11. Copy the token immediately. GitHub will not show it again.
12. Add it in Cloudflare **Variables and Secrets** as a **Secret**:

```text
GITHUB_WORKFLOW_TOKEN
```

The token must only have access to one repository. Gamelist will detect that repository automatically and dispatch `.github/workflows/main.yml` on the Cloudflare cron schedule. If the token can access more than one repository, the automatic updater will refuse to run so it cannot update the wrong repo.

For existing deployments, add this to your own `wrangler.toml` if it is missing:

```toml
[triggers]
crons = ["13,43 * * * *"]
```

## Recommended Integrations

### PlayStation Trophy Activity

1. Log into your [PlayStation](https://www.playstation.com/) account.
2. In the same browser, open the [Sony SSO cookie page](https://ca.account.sony.com/api/v1/ssocookie).
3. Copy only the long `npsso` token value from the JSON response.
4. Add it to Cloudflare **Variables and Secrets** as:

```text
PSN_NPSSO
```

5. Set your **PlayStation profile name** inside the app: enter edit mode, open **Settings**, and fill the PlayStation account field.

The Playstation API access can expire after a while and will require adding the `npsso` token value again, if that is the case.

### Steam Achievements

1. Enter [Steam Web API key page](https://steamcommunity.com/dev/apikey) and log into your account.
2. Copy the key and create a new Cloudflare **Variables and Secrets** entry:

```text
STEAM_API_KEY
```

3. Set your **Steam account** inside the app: enter edit mode, open **Settings**, and fill the **Steam account** field with a SteamID64, Steam profile URL, or vanity name.

Steam achievements are fetched only for app IDs owned by the configured Steam account. Make sure the account's game details and library visibility are set to **Public**.

### Xbox Achievements

Xbox 360, Xbox One, Xbox Series, and Xbox PC games can show achievements through OpenXBL.
1.Register on [OpenXBL](https://xbl.io/), create a personal API key in the dashboard, then add it as a Cloudflare secret:

```text
OPENXBL_API_KEY
```

2.Set your **Xbox account** inside the app: enter edit mode, open **Settings**, and fill the **Microsoft account** field with an Xbox gamertag or XUID.

### Google Calendar Preorder Events (ADVANCED)

When you mark a game with a release date as preordered, the Worker can add an all-day Google Calendar event named `Preorder "Game Name"`.

1. Set up a [Google Cloud](https://console.cloud.google.com/) service account with Google Calendar API access, then share the target calendar with the service account email generated with permission to make changes.

2. Add the created service account email address as a Cloudflare **Variables and Secrets** entry:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
```

3. Add the `private_key` value from the service account JSON as another **secrets** entry:

```text
GOOGLE_PRIVATE_KEY
```

4. Add this service account email to your calendar and give it all the permissions.

5. Add the calendar ID from the calendar you are using as a **secrets** entry. You can get this from your calendar settings after:

```text
GOOGLE_CALENDAR_ID
```

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
