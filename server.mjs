import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { onRequestGet as search } from "./functions/api/search.js";
import { onRequestGet as prices } from "./functions/api/prices.js";
import { onRequestGet as cover } from "./functions/api/cover.js";
import * as gamelistMassAdd from "./functions/api/gamelist-mass-add.js";
import * as gamelistMetadata from "./functions/api/gamelist-metadata.js";
import * as auth from "./functions/api/auth.js";
import * as shelf from "./functions/api/shelf.js";
import * as shelfMassAdd from "./functions/api/shelf-mass-add.js";
import * as shelfMetadata from "./functions/api/shelf-metadata.js";
import * as shelfCovers from "./functions/api/shelf-covers.js";
import * as shelfPriceAudit from "./functions/api/shelf-price-audit.js";
import * as gamelistGamesByList from "./functions/api/gamelist-games-by-list.js";
import * as completedGamesByYear from "./functions/api/completed-games-by-year.js";
import * as shelfGamesPlatforms from "./functions/api/shelf-games-platforms.js";
import * as psnTrophiesByYear from "./functions/api/psn-trophies-by-year.js";
import * as steamTrophiesByYear from "./functions/api/steam-trophies-by-year.js";
import * as xboxTrophiesByYear from "./functions/api/xbox-trophies-by-year.js";
import { onRequestGet as collectionPrice } from "./functions/api/collection-price.js";
import { onRequestGet as trophies } from "./functions/api/trophies.js";
import { onRequestGet as achievements } from "./functions/api/achievements.js";

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
  if (url.pathname === "/api/cover") return sendFunction(res, cover, req, url);
  if (url.pathname === "/api/gamelist-mass-add") return sendModule(res, gamelistMassAdd, req, url);
  if (url.pathname === "/api/gamelist-metadata") return sendModule(res, gamelistMetadata, req, url);
  if (url.pathname === "/api/shelf") return sendModule(res, shelf, req, url);
  if (url.pathname === "/api/shelf-mass-add") return sendModule(res, shelfMassAdd, req, url);
  if (url.pathname === "/api/shelf-metadata") return sendModule(res, shelfMetadata, req, url);
  if (url.pathname === "/api/shelf-covers") return sendModule(res, shelfCovers, req, url);
  if (url.pathname === "/api/shelf-price-audit") return sendModule(res, shelfPriceAudit, req, url);
  if (url.pathname === "/api/gamelist-games-by-list") return sendModule(res, gamelistGamesByList, req, url);
  if (url.pathname === "/api/completed-games-by-year") return sendModule(res, completedGamesByYear, req, url);
  if (url.pathname === "/api/shelf-games-platforms") return sendModule(res, shelfGamesPlatforms, req, url);
  if (url.pathname === "/api/psn-trophies-by-year") return sendModule(res, psnTrophiesByYear, req, url);
  if (url.pathname === "/api/steam-trophies-by-year") return sendModule(res, steamTrophiesByYear, req, url);
  if (url.pathname === "/api/xbox-trophies-by-year") return sendModule(res, xboxTrophiesByYear, req, url);
  if (url.pathname === "/api/collection-price") return sendFunction(res, collectionPrice, req, url);
  if (url.pathname === "/api/trophies") return sendFunction(res, trophies, req, url);
  if (url.pathname === "/api/achievements") return sendFunction(res, achievements, req, url);
  if (url.pathname === "/api/sync") return sendJson(res, { games: [] });
  if (url.pathname === "/api/auth") return sendModule(res, auth, req, url);
  return sendFile(res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`gamelist running at http://127.0.0.1:${port}/`);
});

async function sendFunction(res, handler, req, url) {
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readRequestBody(req);
  const response = await handler({ request: new Request(url.toString(), { method: req.method, body }), env: process.env });
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function sendModule(res, module, req, url) {
  const method = req.method.toLowerCase();
  const handler = module[`onRequest${method[0].toUpperCase()}${method.slice(1)}`];
  if (!handler) return sendJson(res, { error: "Method not allowed" }, 405);
  return sendFunction(res, handler, req, url);
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function sendFile(res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const safePath = pathname === "/" ? "/index.html" : decoded === "/shelf" ? "/shelf.html" : decoded;
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
