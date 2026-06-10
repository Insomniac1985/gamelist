export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const password = env.EDIT_PASSWORD || "shabii";
  if (body.password === password) {
    return json({ ok: true });
  }
  return json({ ok: false }, 401);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
