# gamelist

A local-first game buying tracker based on `Games List.xlsx`.

## Run Locally

Run the local dev server:

```sh
node server.mjs
```

Then visit `http://127.0.0.1:8790`.

Use this server instead of `python3 -m http.server` when you want autocomplete or price lookup, because it also routes `/api/search` and `/api/prices` to the local function code.

The base editor password is `shabii` while running locally. When hosted on Cloudflare, set `EDIT_PASSWORD` so the password is checked by the Pages Function instead.

## What It Does

- Tracks games in `Available now`, `To Release`, `Backlog`, and `Completed`.
- Imports the spreadsheet into `data/seed-games.json`.
- Keeps local edits in `localStorage`.
- Requires edit mode for add/edit/delete/reorder.
- Lets everyone view the list without a password.
- Moves bought games into Backlog.
- Marks backlog games as completed without deleting their history.
- Deletes games from visible lists with a delete action.
- Lets Backlog be manually reordered by drag and drop.
- Supports covers by URL or compressed local upload.
- Shows owner tags and different title colors for Judy/Jordi.
- Adds release status by platform entry, so the same title can exist with different platform dates.
- Includes Cloudflare Pages Functions for auth, sync, lookup, and price refresh.

## Cloudflare Setup Later

Create a KV namespace and bind it to the Pages project as:

```txt
GAMELIST
```

Set these environment variables:

```txt
EDIT_PASSWORD=your-password
IGDB_CLIENT_ID=your-twitch-client-id
IGDB_CLIENT_SECRET=your-twitch-client-secret
```

IGDB is used first for game metadata such as genres, developer, publisher, platform releases, and covers. HowLongToBeat remains the fallback and is also used to enrich game length.

The sync function stores all tracker data under one KV key. For larger uploaded covers, switch uploads to R2 later; the current base stores compressed images inline, which is fine for local use and small lists.

## Refresh Spreadsheet Seed

If you change `Games List.xlsx`, regenerate the seed data:

```sh
python3 scripts/extract-xlsx.py
```

Refresh canonical names, covers, and prices:

```sh
node scripts/fix-game-names.mjs
node scripts/fetch-covers.mjs
node scripts/fetch-prices.mjs
```
