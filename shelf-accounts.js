export function initShelfAccounts(root, { getSettings, saveSettings }) {
  if (!root) return null;
  if (root.__shelfAccountManager) return root.__shelfAccountManager;
  const input = (name) => root.querySelector(`[data-account-input="${name}"]`);
  const status = (name, message = "") => { const node = root.querySelector(`[data-account-status="${name}"]`); if (node) { node.textContent = message; node.hidden = !message; } };
  const error = (name, message = "") => { const node = root.querySelector(`[data-account-error="${name}"]`); if (node) { node.textContent = message; node.hidden = !message; } };
  const show = (name, value) => { const node = root.querySelector(`[data-account-entry="${name}"]`); if (node) node.hidden = !value; };
  const post = async (url, body) => { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Account request failed."); return data; };
  const persistUser = async (key, value) => { const settings = { ...getSettings(), [key]: value }; await saveSettings(settings); };
  const popupResult = (popup, type, expectedState) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Sign-in timed out. Start again.")), 5 * 60 * 1000);
    const onMessage = (event) => { if (event.origin !== location.origin || event.source !== popup || event.data?.type !== type) return; if (event.data?.state !== expectedState && !(event.data?.error && !event.data?.state)) return; finish(null, event.data); };
    const finish = (err, value) => { clearTimeout(timeout); removeEventListener("message", onMessage); err ? reject(err) : resolve(value); };
    addEventListener("message", onMessage);
  });
  async function refresh() {
    const requests = [
      ["igdb", "/api/igdb-account?action=status"], ["psn", "/api/psn-account?action=status"],
      ["steam", `/api/steam-account?action=status&steamId=${encodeURIComponent(getSettings().steamUser || "")}`],
      ["xbox", "/api/xbox-account?action=status"], ["nintendo", "/api/nintendo-playtime?action=status"],
    ];
    const values = await Promise.all(requests.map(async ([key, url]) => { try { const response = await fetch(url, { cache: "no-store" }); return [key, await response.json()]; } catch { return [key, {}]; } }));
    const data = Object.fromEntries(values); const settings = getSettings();
    status("igdb", data.igdb.configured ? "Connected" : "");
    root.querySelector('[data-account-action="igdb-disconnect"]').hidden = !data.igdb.configured;
    root.querySelector('[data-account-action="igdb-setup"]').hidden = Boolean(data.igdb.configured);
    status("psn", data.psn.connected ? `Connected${settings.psnUser ? ` to ${settings.psnUser}` : ""}${Number.isFinite(data.psn.tokenDaysLeft) ? ` · ${data.psn.tokenDaysLeft} days until refresh` : ""}` : "");
    root.querySelector('[data-account-action="psn-start"]').hidden = Boolean(data.psn.connected);
    root.querySelector('[data-account-action="psn-disconnect"]').hidden = !data.psn.connected;
    show("psn", !data.psn.connected);
    status("steam", data.steam.apiKeyAvailable && settings.steamUser ? `Connected${data.steam.personaName ? ` to ${data.steam.personaName}` : ` to ${settings.steamUser}`}` : settings.steamUser ? `Signed in as ${settings.steamUser}; API key required` : "");
    root.querySelector('[data-account-action="steam-start"]').hidden = Boolean(settings.steamUser);
    root.querySelector('[data-account-action="steam-disconnect"]').hidden = !settings.steamUser;
    show("steam-key", Boolean(settings.steamUser) && !data.steam.apiKeyAvailable);
    status("xbox", data.xbox.apiKeyAvailable ? `Connected${settings.microsoftUser ? ` to ${settings.microsoftUser}` : ""}` : "");
    root.querySelector('[data-account-action="xbox-disconnect"]').hidden = !data.xbox.apiKeyAvailable;
    show("xbox", !data.xbox.apiKeyAvailable);
    status("nintendo", data.nintendo.connected ? `Connected${data.nintendo.accountName ? ` to ${data.nintendo.accountName}` : ""}` : "");
    root.querySelector('[data-account-action="nintendo-start"]').hidden = Boolean(data.nintendo.connected);
    root.querySelector('[data-account-action="nintendo-disconnect"]').hidden = !data.nintendo.connected;
    show("nintendo", !data.nintendo.connected);
  }
  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-account-action]"); if (!button) return;
    const action = button.dataset.accountAction; button.disabled = true;
    try {
      if (action === "igdb-setup") show("igdb", true);
      if (action === "igdb-connect") { const clientId = input("igdb-id").value.trim(), clientSecret = input("igdb-secret").value.trim(); await post("/api/igdb-account", { action: "connect", clientId, clientSecret }); input("igdb-id").value = input("igdb-secret").value = ""; show("igdb", false); await refresh(); }
      if (action === "igdb-disconnect") { await post("/api/igdb-account", { action: "disconnect" }); await refresh(); }
      if (action === "psn-start") { window.open("https://www.playstation.com/", "_blank", "noopener"); show("psn", true); }
      if (action === "psn-token") window.open("https://ca.account.sony.com/api/v1/ssocookie", "_blank", "noopener");
      if (action === "psn-connect") { const tokenResponse = input("psn-token").value.trim(), onlineId = input("psn-user").value.trim(); if (!onlineId) throw new Error("Enter your PlayStation online ID."); const data = await post("/api/psn-account", { action: "connect", tokenResponse }); input("psn-token").value = ""; await persistUser("psnUser", onlineId); status("psn", `Connected to ${onlineId}${Number.isFinite(data.tokenDaysLeft) ? ` · ${data.tokenDaysLeft} days until refresh` : ""}`); await refresh(); }
      if (action === "psn-disconnect") { await post("/api/psn-account", { action: "disconnect" }); await refresh(); }
      if (action === "steam-start") { const popup = window.open("about:blank", "_blank"); if (!popup) throw new Error("Allow the sign-in popup, then try again."); const response = await fetch("/api/steam-login?action=start", { cache: "no-store" }); const data = await response.json(); if (!response.ok || !data.url || !data.state) throw new Error(data.error || "Could not start Steam sign-in."); const resultPromise = popupResult(popup, "gamelist-steam-login", data.state); popup.location.href = data.url; const result = await resultPromise; if (result.error) throw new Error(result.error); await persistUser("steamUser", result.steamId); await refresh(); }
      if (action === "steam-disconnect") { await post("/api/steam-account", { action: "disconnect" }); await persistUser("steamUser", ""); await refresh(); }
      if (action === "xbox-disconnect") { await post("/api/xbox-account", { action: "disconnect" }); await persistUser("microsoftUser", ""); await refresh(); }
      if (action === "nintendo-start") { const popup = window.open("about:blank", "_blank"); const data = await post("/api/nintendo-playtime", { action: "begin" }); if (!data.url) throw new Error(data.error || "Could not start Nintendo sign-in."); if (popup) popup.location.href = data.url; else window.open(data.url, "_blank"); show("nintendo", true); }
      if (action === "nintendo-disconnect") { await post("/api/nintendo-playtime", { action: "disconnect" }); await refresh(); }
    } catch (err) { const provider = action.split("-")[0]; if (provider === "psn" || provider === "steam" || provider === "xbox" || provider === "igdb") error(provider, err.message); else status("nintendo", err.message); }
    finally { button.disabled = false; }
  });
  for (const name of ["igdb-id", "igdb-secret", "psn-token", "steam-key", "xbox-key"]) input(name)?.addEventListener("focus", (event) => event.target.removeAttribute("readonly"), { once: true });
  input("psn-token")?.addEventListener("paste", () => setTimeout(() => input("psn-user").focus(), 0));
  input("steam-key")?.addEventListener("paste", async () => { setTimeout(async () => { try { const apiKey = input("steam-key").value.trim(); if (!apiKey) return; await post("/api/steam-account", { action: "connect", apiKey, steamId: getSettings().steamUser }); input("steam-key").value = ""; await refresh(); } catch (err) { error("steam", err.message); } }, 0); });
  input("xbox-key")?.addEventListener("paste", async () => { setTimeout(async () => { try { const data = await post("/api/xbox-account", { action: "connect", apiKey: input("xbox-key").value.trim() }); input("xbox-key").value = ""; await persistUser("microsoftUser", String(data.gamertag || data.xuid || "").trim()); await refresh(); } catch (err) { error("xbox", err.message); } }, 0); });
  input("nintendo-link")?.addEventListener("paste", async () => { setTimeout(async () => { try { const data = await post("/api/nintendo-playtime", { action: "exchange", callbackUrl: input("nintendo-link").value.trim() }); input("nintendo-link").value = ""; status("nintendo", `Connected${data.accountName ? ` to ${data.accountName}` : ""}`); await refresh(); } catch (err) { status("nintendo", err.message); } }, 0); });
  refresh();
  root.__shelfAccountManager = { refresh };
  return root.__shelfAccountManager;
}
