export async function conditionalJson(request, data) {
  const body = JSON.stringify(data);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}"`;
  const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-cache", ETag: etag, Vary: "Cookie" };
  if (request?.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(body, { headers });
}
