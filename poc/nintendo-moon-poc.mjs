#!/usr/bin/env node

// Local Moon/PCTL proof of concept based on nxapi's reference flow:
// https://github.com/samuelthomas2774/nxapi
// This script does not save or print authorization codes or Nintendo tokens.

import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import process from "node:process";

const CLIENT_ID = "54789befb391a838";
const ACCOUNT_BASE = "https://accounts.nintendo.com/connect/1.0.0";
const USER_URL = "https://api.accounts.nintendo.com/2.0.0/users/me";
const MOON_BASE = "https://api-lp1.pctl.srv.nintendo.net/moon";
const MOON_VERSION = "1.20.0";
const MOON_BUILD = "282";
const MOON_USER_AGENT = `moon_ANDROID/${MOON_VERSION} (com.nintendo.znma; build:${MOON_BUILD}; ANDROID 26)`;
const SCOPES = [
  "openid",
  "user",
  "user.mii",
  "moonUser:administration",
  "moonDevice:create",
  "moonOwnedDevice:administration",
  "moonParentalControlSetting",
  "moonParentalControlSetting:update",
  "moonParentalControlSettingState",
  "moonPairingState",
  "moonSmartDevice:administration",
  "moonDailySummary",
  "moonMonthlySummary",
];

const state = randomBytes(36).toString("base64url");
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const redirectUri = `npf${CLIENT_ID}://auth`;
const authorizeUrl = new URL(`${ACCOUNT_BASE}/authorize`);
authorizeUrl.search = new URLSearchParams({
  state,
  redirect_uri: redirectUri,
  client_id: CLIENT_ID,
  scope: SCOPES.join(" "),
  response_type: "session_token_code",
  session_token_code_challenge: challenge,
  session_token_code_challenge_method: "S256",
  theme: "login_form",
});

try {
  console.log("Opening Nintendo sign-in. Sign in, then copy the link from ‘Select this person’.");
  console.log("If the browser did not open, use this Nintendo URL:\n" + authorizeUrl.href + "\n");
  openUrl(authorizeUrl.href);

  const callback = new URL(await readHidden("Paste the Nintendo callback link (input is hidden): "));
  if (callback.protocol !== `npf${CLIENT_ID}:` || callback.hostname !== "auth") {
    throw new Error("That is not the Nintendo Parental Controls callback link.");
  }

  const params = new URLSearchParams(callback.hash.slice(1));
  if (params.get("state") !== state) throw new Error("Nintendo sign-in state did not match. Run the POC again.");
  if (params.has("error")) throw new Error(`Nintendo sign-in was cancelled or failed (${params.get("error")}).`);
  const code = params.get("session_token_code");
  if (!code) throw new Error("The callback did not contain a session token code.");

  console.log("Exchanging Nintendo authorization code…");
  const session = await postForm(`${ACCOUNT_BASE}/api/session_token`, {
    client_id: CLIENT_ID,
    session_token_code: code,
    session_token_code_verifier: verifier,
  }, { "User-Agent": "NASDKAPI; Android" });
  if (!session.session_token) throw new Error("Nintendo did not return a session token.");

  console.log("Authenticating with Nintendo Account and Moon/PCTL…");
  const accountToken = await postJson(`${ACCOUNT_BASE}/api/token`, {
    client_id: CLIENT_ID,
    session_token: session.session_token,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
  }, { "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 8.0.0)" });
  if (!accountToken.access_token) throw new Error("Nintendo did not return an account access token.");

  const accountUser = await getJson(USER_URL, {
    "Accept-Language": "en-GB",
    "User-Agent": "NASDKAPI; Android",
    "Authorization": `Bearer ${accountToken.access_token}`,
  });
  const accountId = accountUser.id;
  if (!accountId) throw new Error("Nintendo Account response did not contain a user ID.");

  const moonHeaders = {
    "Authorization": `Bearer ${accountToken.access_token}`,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Moon-App-Id": "com.nintendo.znma",
    "X-Moon-Os": "ANDROID",
    "X-Moon-Os-Version": "26",
    "X-Moon-Model": "",
    "X-Moon-TimeZone": "Europe/London",
    "X-Moon-Os-Language": "en-GB",
    "X-Moon-App-Language": "en-GB",
    "X-Moon-App-Display-Version": MOON_VERSION,
    "X-Moon-App-Internal-Version": MOON_BUILD,
    "User-Agent": MOON_USER_AGENT,
  };
  const moonUser = await getJson(`${MOON_BASE}/v1/users/${encodeURIComponent(accountId)}`, moonHeaders);
  const devices = await getJson(`${MOON_BASE}/v1/users/${encodeURIComponent(accountId)}/devices`, moonHeaders);
  const items = Array.isArray(devices.items) ? devices.items : [];

  console.log(`Nintendo account authenticated: ${moonUser.nickname || accountUser.nickname || "account"}`);
  console.log(`Linked Switch devices found: ${items.length}`);
  if (!items.length) {
    console.log("No Parental Controls console is linked. Link a Switch in Nintendo Switch Parental Controls, then run this again.");
    process.exitCode = 0;
  } else {
    for (const [index, item] of items.entries()) {
      console.log(`  ${index + 1}. ${item.label || "Nintendo Switch"} (${item.device?.region || "region unknown"})`);
    }
    const selected = items[0];
    console.log(`Fetching daily summaries for device 1: ${selected.label || "Nintendo Switch"}…`);
    const summaries = await getJson(`${MOON_BASE}/v1/devices/${encodeURIComponent(selected.deviceId)}/daily_summaries`, moonHeaders);
    const records = normalizeSummaries(summaries);
    console.log(`\nNormalized activity records: ${records.length}`);
    console.log(JSON.stringify(records, null, 2));
    if (!records.length) console.log("No per-title daily playtime was present in the returned summaries.");
  }
} catch (error) {
  console.error("Nintendo Moon POC failed:", error.message);
  process.exitCode = 1;
}

function normalizeSummaries(response) {
  const records = new Map();
  for (const summary of response.items || []) {
    const titles = new Map((summary.playedApps || []).map((title) => [title.applicationId, title]));
    const players = [...(summary.devicePlayers || []), ...(summary.anonymousPlayer ? [summary.anonymousPlayer] : [])];
    for (const player of players) {
      for (const played of player.playedApps || []) {
        const key = `${summary.date}:${played.applicationId}`;
        const title = titles.get(played.applicationId);
        const previous = records.get(key);
        records.set(key, {
          nintendoTitleId: played.applicationId,
          title: title?.title || played.title || "Unknown Nintendo title",
          date: summary.date,
          // Moon's duration fields are seconds; nxapi's CLI divides daily playingTime by 60
          // before formatting it as minutes/hours.
          playtimeSeconds: (previous?.playtimeSeconds || 0) + Number(played.playingTime || 0),
        });
      }
    }
  }
  return [...records.values()].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep response errors free of raw bodies */ }
  if (!response.ok || data.error || data.errorCode) {
    const detail = data.error_description || data.detail || data.error || data.errorCode || `HTTP ${response.status}`;
    throw new Error(`Nintendo request failed: ${String(detail).slice(0, 240)}`);
  }
  return data;
}

function postForm(url, values, extraHeaders = {}) {
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...extraHeaders },
    body: new URLSearchParams(values),
  });
}

function postJson(url, values, extraHeaders = {}) {
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...extraHeaders },
    body: JSON.stringify(values),
  });
}

function getJson(url, headers) {
  return requestJson(url, { headers: { Accept: "application/json", ...headers } });
}

function openUrl(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}

function readHidden(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Run this script in an interactive terminal so the callback can be entered without echoing it.");
  }

  process.stdout.write(prompt);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      error ? reject(error) : resolve(value.trim());
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else if (character >= " " && character !== "\u007f") value += character;
      }
    };
    input.on("data", onData);
  });
}
