import { isEditorRequest } from "./editor-auth.js";
import { disconnectPsnNpsso, getPsnNpsso, getPsnNpssoDaysLeft, parsePsnTokenResponse, savePsnNpsso } from "./psn-auth.js";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  if (new URL(request.url).searchParams.get("action") !== "status") return json({ error: "Unknown action" }, 400);
  const connected = Boolean(await getPsnNpsso(env));
  const tokenDaysLeft = connected ? await getPsnNpssoDaysLeft(env) : null;
  return json({ connected, tokenDaysLeft, hasServerCredential: Boolean(String(env.PSN_NPSSO || "").trim()) });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "connect") {
      const { npsso, expiresAt } = parsePsnTokenResponse(body.tokenResponse);
      await savePsnNpsso(npsso, env, expiresAt);
      return json({ connected: true, tokenDaysLeft: await getPsnNpssoDaysLeft(env) ?? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) });
    }
    if (body.action === "disconnect") {
      await disconnectPsnNpsso(env);
      return json({ connected: false });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error?.message || "PlayStation connection failed." }, 400);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
