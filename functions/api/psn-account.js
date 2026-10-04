import { isEditorRequest } from "./editor-auth.js";
import { disconnectPsnNpsso, getPsnNpsso, savePsnNpsso } from "./psn-auth.js";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  if (new URL(request.url).searchParams.get("action") !== "status") return json({ error: "Unknown action" }, 400);
  return json({ connected: Boolean(await getPsnNpsso(env)), hasServerCredential: Boolean(String(env.PSN_NPSSO || "").trim()) });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "connect") {
      await savePsnNpsso(body.npsso, env);
      return json({ connected: true });
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
