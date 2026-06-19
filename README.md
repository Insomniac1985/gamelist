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
npx wrangler deploy --env github
```

The app should be live on the `workers.dev` URL unless you attach a custom domain in Cloudflare.

### Deploying Both GitHub And GitLab Copies

This repo has two KV bindings configured so the GitHub and GitLab Cloudflare deploys can use different saved-data namespaces:

- GitHub copy deploy command: `npx wrangler deploy --env github`
- GitLab copy deploy command: `npx wrangler deploy --env gitlab`

Set each Cloudflare site's deploy command to the matching environment. This keeps each site connected to its own `GAMELIST` KV namespace instead of one deploy overwriting the other's binding.

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
