import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequestGet as search } from "./functions/api/search.js";
import { onRequestGet as prices } from "./functions/api/prices.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8790);
const types = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/search") return sendFunction(res, search, req, url);
  if (url.pathname === "/api/prices") return sendFunction(res, prices, req, url);
  if (url.pathname === "/api/sync") return sendJson(res, { games: [] });
  if (url.pathname === "/api/auth") return sendJson(res, { ok: true });
  return sendFile(res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`gamelist running at http://127.0.0.1:${port}/`);
});

async function sendFunction(res, handler, req, url) {
  const response = await handler({ request: new Request(url.toString(), { method: req.method }), env: process.env });
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(await response.text());
}

function sendJson(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function sendFile(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(root, safePath));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const info = await stat(filePath);
  if (!info.isFile()) return sendFile(res, "/index.html");
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}
