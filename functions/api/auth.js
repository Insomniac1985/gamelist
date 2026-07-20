import { clearEditorCookie, createEditorSession, editorCookie, isEditorRequest } from "./editor-auth.js";

export async function onRequestGet({ request, env }) {
  const ok = await isEditorRequest(request, env);
  const response = json({ ok, status: ok ? "LOGGED IN" : "NOT LOGGED IN" });
  if (ok) response.headers.set("Set-Cookie", editorCookie(await createEditorSession(request, env)));
  return response;
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const password = env.EDIT_PASSWORD || "";
  if (!password) return json({ ok: false, error: "EDIT_PASSWORD is not configured" }, 503);
  if (body.password === password) {
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", editorCookie(await createEditorSession(request, env)));
    return response;
  }
  return json({ ok: false }, 401);
}

export async function onRequestDelete() {
  const response = json({ ok: true });
  response.headers.set("Set-Cookie", clearEditorCookie());
  return response;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
