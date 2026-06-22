# Gamelist

A personal game backlog, preorder, price, and trophy tracker.

## How Easy Is It To Make A Copy?

Pretty easy. The app is a static frontend plus Cloudflare Worker API routes. A friend's copy mainly needs:

- a separate GitHub repo or fork
- a separate Cloudflare Worker deploy
- a separate Cloudflare KV namespace for their saved games/settings
- their own edit password
- optional PSN/IGDB/Google Calendar secrets

The game data is saved in Cloudflare KV through `/api/sync`. A fresh copy starts with an empty list.

## Local Development

Install dependencies on demand with `npx`; there is no committed package lock right now.

Run a local static server:

```bash
node server.mjs
```

Then open:

```text
http://localhost:8790
```

Useful checks before pushing:

```bash
node --check app.js
node --check functions/api/prices.js
node --check functions/api/sync.js
node --check functions/api/achievements.js
git diff --check
```

## Deploy A Fresh Copy

1. Fork or copy this repo.
2. Install Wrangler if needed:

```bash
npm install -g wrangler
wrangler login
```

3. Create a new KV namespace:

```bash
npx wrangler kv namespace create GAMELIST
```

4. Copy the generated KV namespace id into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GAMELIST"
id = "PASTE_THE_NEW_ID_HERE"
```

5. Change the Worker name in `wrangler.toml` if this is a friend's separate copy:

```toml
name = "friends-gamelist"
```

6. Set the edit password secret:

```bash
npx wrangler secret put EDIT_PASSWORD
```

7. Deploy:

```bash
npx wrangler deploy
```

The app should be live on the `workers.dev` URL unless you attach a custom domain in Cloudflare.

### Deploying Both GitHub And GitLab Copies

This repo has two KV bindings configured so the GitHub and GitLab Cloudflare deploys can use different saved-data namespaces:

- GitHub copy deploy command: `npx wrangler deploy` or `npx wrangler deploy --env github`
- GitLab copy deploy command: `npx wrangler deploy --env gitlab`

Set each Cloudflare site's deploy command to the matching environment. The top-level/default config is kept on the GitHub KV namespace so GitHub can also use Cloudflare's default `npx wrangler deploy` command. This keeps each site connected to its own `GAMELIST` KV namespace instead of one deploy overwriting the other's binding.

The standalone Shelf is enabled only for the default/GitHub deployment. Its one-time imported collection now lives in the GitHub KV namespace rather than repository data files. The `gitlab` environment sets `SHELF_ENABLED=false`, so Shelf routes and the cover proxy return `404` on that copy.

If the GitLab Cloudflare project cannot change its deploy command, add this plaintext environment variable in that Cloudflare project's **Settings > Variables and Secrets**:

```text
CLOUDFLARE_ENV=gitlab
```

Use a normal variable, not a secret. With that variable set, Cloudflare can keep running:

```bash
npx wrangler deploy
```

and Wrangler will deploy the `gitlab` environment.

## Required Cloudflare Pieces

`GAMELIST` KV namespace:
Stores the saved games and cloud-synced settings.

`EDIT_PASSWORD` secret:
Unlocks edit mode and allows saving to KV. Without it, the app can display data but cannot save edits to the cloud.

## Optional Setup

### IGDB Lookup

Game lookup can use IGDB if these secrets are configured:

```bash
npx wrangler secret put IGDB_CLIENT_ID
npx wrangler secret put IGDB_CLIENT_SECRET
```

IGDB authentication uses Twitch developer credentials. To get them:

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
11. Click **New Secret** / **Manage** for the app secret, then copy that value into `IGDB_CLIENT_SECRET`.

The app does not need you to manually create an access token. The Worker uses the Client ID and Client Secret to request an app access token from Twitch when it calls IGDB.

Without IGDB credentials, lookup falls back where possible, but results may be weaker.

### PSN Trophy Activity

The trophy widgets use Sony's PSN API through a Cloudflare Worker secret called `PSN_NPSSO`.

To set it up:

1. Log into PlayStation in your browser:
   `https://www.playstation.com/`
2. In the same browser, open:
   `https://ca.account.sony.com/api/v1/ssocookie`
3. Copy only the long `npsso` token value from the JSON response.
4. Set it as a Cloudflare secret:

```bash
npx wrangler secret put PSN_NPSSO
```

You can also set a default PSN profile name:

```bash
npx wrangler secret put PSN_PROFILE_USER
```

Treat the NPSSO token like a password. Do not commit it, paste it in chat, or put it in `wrangler.toml`. If trophies stop loading, refresh the token and redeploy if needed.

### Steam Achievements

PC game overlays can show Steam achievements when these are configured:

```bash
npx wrangler secret put STEAM_API_KEY
npx wrangler secret put STEAM_PROFILE_USER
```

Get a Steam Web API key from `https://steamcommunity.com/dev/apikey`.

Set `STEAM_PROFILE_USER` to a SteamID64, Steam profile URL, or vanity name, for example `shabii_`. The site's Settings overlay also has a **Steam account** field; if filled, it overrides the Cloudflare value for that browser/account. For each PC game, add a Steam store URL or Steam App ID in the game editor.

Steam achievements are only fetched for Steam app IDs owned by the configured Steam account. Make sure the account's game details/library visibility allows Steam Web API access, otherwise the owned-games list can come back empty. Legacy games saved with the platform `PC` are treated as `Steam`; use `Xbox PC` for Microsoft Store or PC Game Pass games.

### Xbox Achievements

Xbox 360, Xbox One, Xbox Series, and Xbox PC games can show achievements through OpenXBL. Create a personal API key in the [OpenXBL dashboard](https://xbl.io/dashboard), then add it as a Cloudflare secret:

```bash
npx wrangler secret put OPENXBL_API_KEY
```

The personal key can read the Xbox profile connected to that OpenXBL account. You can optionally set its default gamertag:

```bash
npx wrangler secret put XBOX_GAMERTAG
```

The site's Settings overlay has a **Microsoft account** field that accepts an Xbox gamertag or XUID. When filled, it overrides `XBOX_GAMERTAG` and fetches that player's achievement history through OpenXBL's player endpoints.

Use `Xbox PC` for Microsoft Store or PC Game Pass releases, `X360` for Xbox 360, `XOne` for Xbox One, `Xbox Series` for Series X/S, and `Xbox` for the original console. Xbox Store prices are fetched automatically for those platforms and follow the region selected in Settings.

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

## Personalizing A Friend's Copy

After deploying:

1. Open the site.
2. Click edit/login and enter `EDIT_PASSWORD`.
3. Open Settings.
4. Change:
   - target PSN account
   - currency
   - region
   - selected shops
   - default owner
   - page visibility/order
5. Save settings.

Those settings are stored in that copy's KV namespace, so each friend can have their own layout and data.

## Data Notes

- Live saved data: Cloudflare KV key `gamelist-data`
- Local browser backup: `localStorage`
- Cloud sync endpoint: `/api/sync`

To make a totally clean copy, use a brand-new KV namespace. To clone your current data for someone, export/copy the KV value for `gamelist-data` into their namespace.
