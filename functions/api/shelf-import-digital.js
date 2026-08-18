import { isEditorRequest } from "./editor-auth.js";
import { runnerStyle, runnerThemeSettings } from "./runner-style.js";
import * as psnAchievements from "./achievements.js";
import * as steamAchievements from "./steam-achievements.js";
import * as xboxAchievements from "./xbox-achievements.js";

const SHELF_KEY = "shelf-data";
const LIST_KEY = "gamelist-data";

export async function onRequestGet({ env }) {
  return html(importHtml(await runnerThemeSettings(env)));
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request" }, 400);
  if (body.action === "fetch") return fetchLibrary(body.provider, request, env);
  if (body.action === "add") return addPendingGames(body.games, env);
  return json({ error: "Unknown action" }, 400);
}

async function fetchLibrary(provider, request, env) {
  const list = await env.GAMELIST.get(LIST_KEY, "json") || {};
  const settings = list.settings || {};
  const base = new URL(request.url);
  let handler;
  let user = "";
  if (provider === "steam") {
    handler = steamAchievements.onRequestGet;
    user = settings.steamUser || "";
    base.pathname = "/api/steam-achievements";
    base.search = new URLSearchParams({ user, owned: "1" }).toString();
  } else if (provider === "playstation") {
    handler = psnAchievements.onRequestGet;
    user = settings.psnUser || "";
    base.pathname = "/api/achievements";
    base.search = new URLSearchParams({ user }).toString();
  } else if (provider === "xbox" || provider === "xbox-pc") {
    handler = xboxAchievements.onRequestGet;
    user = settings.microsoftUser || "";
    base.pathname = "/api/xbox-achievements";
    base.search = new URLSearchParams({ user }).toString();
  } else return json({ error: "Unknown provider" }, 400);
  if (!user) return json({ error: `Set the ${providerLabel(provider)} account in Shelf settings first.` }, 400);
  const response = await handler({ request: new Request(base.toString()), env });
  const data = await response.json().catch(() => ({}));
  if (data.needsSetup || data.authError || data.error) return json({ error: data.error || `${providerLabel(provider)} account is unavailable.` }, 400);
  const games = providerGames(provider, data);
  return json({ ok: true, provider, account: user, games });
}

function providerGames(provider, data) {
  const source = provider === "steam" ? data.ownedGames : data.games;
  const games = (Array.isArray(source) ? source : []).map((game) => ({
    remoteId: String(game.appId || game.titleId || game.npCommunicationId || ""),
    title: String(game.name || game.title || "").trim(),
    platform: provider === "steam" ? "Steam" : provider === "xbox" || provider === "xbox-pc" ? canonicalXboxPlatform(game.platform) : canonicalPsnPlatform(game.rarity || game.platform),
    cover: String(game.cover || game.icon || ""),
    provider: provider === "xbox-pc" ? "xbox" : provider,
  })).filter((game) => game.title);
  if (provider === "xbox-pc") return games.filter((game) => game.platform === "Xbox PC");
  if (provider === "xbox") return games.filter((game) => game.platform !== "Xbox PC");
  return games;
}

async function addPendingGames(rawGames, env) {
  const incoming = Array.isArray(rawGames) ? rawGames.slice(0, 1000) : [];
  if (!incoming.length) return json({ error: "No games selected" }, 400);
  const [shelf, list] = await Promise.all([
    env.GAMELIST.get(SHELF_KEY, "json").then((value) => value || {}),
    env.GAMELIST.get(LIST_KEY, "json").then((value) => value || {}),
  ]);
  const sourceGames = Array.isArray(shelf.sourceGames) ? shelf.sourceGames : [];
  const games = Array.isArray(shelf.games) ? shelf.games.slice() : [];
  const known = new Set([...sourceGames, ...games].filter((game) => !game.deletedAt).map(gameKey));
  const now = new Date().toISOString();
  const owner = String(list.settings?.defaultOwner || "").trim();
  let added = 0;
  let addedToDrive = 0;
  let addedToNewAdditions = 0;
  for (const raw of incoming) {
    const title = String(raw?.title || "").trim();
    const platform = canonicalPlatform(raw?.platform);
    if (!title || known.has(gameKey({ title, platform }))) continue;
    const hasMetadata = Boolean(raw.metadata && typeof raw.metadata === "object" && (raw.metadata.igdbUrl || raw.metadata.hltbId || raw.metadata.cover || raw.metadata.description));
    const id = `digital-import-${slug(`${raw.provider || "digital"}-${raw.remoteId || title}-${platform}`)}-${crypto.randomUUID().slice(0, 8)}`;
    games.unshift({
      id, title, platform, digital: true, dlc: false, pendingCollection: !hasMetadata, skipGamelistSync: true,
      psPlus: ["Sony PlayStation 3", "Sony PlayStation 4", "Sony PlayStation 5"].includes(platform) && raw.psPlus === true,
      gamesWithGold: ["Xbox 360", "Xbox One"].includes(platform) && raw.gamesWithGold === true,
      country: "", region: "", game: false, manual: false, box: false, other: false, sealed: false,
      price: null, owners: owner ? [owner] : [], category: "Game", recordType: "Owned", releaseType: "Official",
      cover: String(raw.metadata?.cover || ""), genre: (raw.metadata?.genres || []).join(", "),
      publisher: String(raw.metadata?.publisher || ""), developer: String(raw.metadata?.developer || ""),
      description: String(raw.metadata?.description || ""), releaseDate: String(raw.metadata?.releaseDate || ""),
      igdbUrl: String(raw.metadata?.igdbUrl || ""), hltbUrl: String(raw.metadata?.hltbUrl || (raw.metadata?.hltbId ? `https://howlongtobeat.com/game/${raw.metadata.hltbId}` : "")),
      lengthHours: Number(raw.metadata?.lengthHours) || null, storeLinks: raw.metadata?.storeLinks || {},
      importProvider: String(raw.provider || ""), importRemoteId: String(raw.remoteId || ""),
      createdAt: now, updatedAt: now,
    });
    known.add(gameKey({ title, platform }));
    added += 1;
    if (hasMetadata) addedToDrive += 1;
    else addedToNewAdditions += 1;
  }
  await env.GAMELIST.put(SHELF_KEY, JSON.stringify({
    ...shelf, sourceGames, games: games.slice(0, 1000),
    overrides: shelf.overrides && typeof shelf.overrides === "object" ? shelf.overrides : {}, updatedAt: now,
  }));
  return json({ ok: true, added, addedToDrive, addedToNewAdditions, skipped: incoming.length - added });
}

function gameKey(game) { return `${normalize(game?.title)}|${normalize(canonicalPlatform(game?.platform))}`; }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function slug(value) { return normalize(value).replace(/\s+/g, "-").slice(0, 70) || "game"; }
function canonicalPsnPlatform(value) { const text = String(value || "").toUpperCase(); return text.includes("PS5") ? "Sony PlayStation 5" : text.includes("PS3") ? "Sony PlayStation 3" : "Sony PlayStation 4"; }
function canonicalXboxPlatform(value) { const text = String(value || "").toLowerCase(); return text.includes("360") ? "Xbox 360" : text.includes("pc") || text.includes("windows") ? "Xbox PC" : text.includes("one") ? "Xbox One" : "Xbox Series"; }
function canonicalPlatform(value) { const text = String(value || "").trim(); return ({ PS3: "Sony PlayStation 3", PS4: "Sony PlayStation 4", PS5: "Sony PlayStation 5", X360: "Xbox 360", XOne: "Xbox One" })[text] || text; }
function providerLabel(value) { return value === "playstation" ? "PlayStation" : value === "steam" ? "Steam" : "Xbox"; }

function importHtml(settings) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Import Digital Games</title>${runnerStyle({ maxWidth: "1240px", settings, page: "shelf" })}<style>
  .provider-actions{display:flex;gap:10px;flex-wrap:wrap}.provider-actions button{min-width:170px}.status{min-height:22px;color:var(--muted)}
  .progress-stack{display:grid;gap:7px}.progress-line{display:grid;grid-template-columns:110px 1fr 52px;gap:10px;align-items:center;color:var(--muted);font-size:12px}.bar{height:9px}.workspace{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);gap:16px}
  .panel{display:grid;grid-template-rows:auto minmax(260px,1fr) auto;gap:12px;min-height:520px}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.count{padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:var(--muted)}
  .game-list{list-style:none;margin:0;padding:0;display:grid;align-content:start;gap:7px;max-height:62vh;overflow:auto}.game{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:56px;padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:rgba(255,255,255,.035)}.game img{width:42px;height:42px;object-fit:cover;border-radius:5px;background:rgba(255,255,255,.06)}.game strong,.game small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.import-entitlement{display:inline-flex!important;width:max-content;min-height:36px!important;margin:0;padding:2px 6px!important;white-space:nowrap}.import-entitlement input{width:15px;height:15px}.game .import-entitlement img{width:22px;height:22px;object-fit:contain;border-radius:0;background:transparent}.game-actions{display:flex;align-items:center;gap:5px}.game-action{opacity:0;min-width:36px;width:36px;padding:0}.game:hover .game-action,.game:focus-within .game-action{opacity:1}.empty{padding:30px 12px;text-align:center;color:var(--muted)}
  @media(max-width:760px){.workspace{grid-template-columns:1fr}.panel{min-height:380px}.provider-actions button{flex:1;min-width:135px}.game-action{opacity:1}.progress-line{grid-template-columns:82px 1fr 42px}}
  </style></head><body><main><h1>Import Digital</h1><p>Fetch owned games from the accounts configured in Shelf settings, review metadata matches, and send selected games to New additions.</p>
  <div class="actions provider-actions"><button class="primary" data-fetch="steam">Fetch Steam</button><button class="primary" data-fetch="playstation">Fetch PlayStation</button><button class="primary" data-fetch="xbox">Fetch Xbox</button><button class="primary" data-fetch="xbox-pc">Fetch only Xbox PC</button><a href="/shelf">Back to Shelf</a></div>
  <div class="progress-stack"><div class="progress-line"><span>Account</span><div class="bar"><span id="fetchBar"></span></div><b id="fetchPct">0%</b></div><div class="progress-line"><span>Metadata</span><div class="bar"><span id="matchBar"></span></div><b id="matchPct">0%</b></div></div><div class="status" id="status">Choose an account to begin.</div>
  <div class="workspace"><section class="panel"><div class="panel-head"><h2>Ready to import</h2><span class="count" id="readyCount">0</span></div><ul class="game-list" id="ready"></ul><button class="primary" id="addReady" disabled>Add to Shelf</button></section>
  <section class="panel"><div class="panel-head"><h2>Needs attention</h2><span class="count" id="errorCount">0</span></div><ul class="game-list" id="errors"></ul><button id="addAllErrors" disabled>Add all</button></section></div></main>
  <script>
  const state={ready:[],errors:[],busy:false};const q=(s)=>document.querySelector(s);const password=()=>sessionStorage.getItem("gamelist-editor:password")||"";
  const esc=(v)=>String(v||"").replace(/[&<>\"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const progress=(kind,value)=>{const pct=Math.max(0,Math.min(100,Math.round(value)));q("#"+kind+"Bar").style.width=pct+"%";q("#"+kind+"Pct").textContent=pct+"%"};
  async function read(response){const data=await response.json().catch(()=>({}));if(!response.ok||data.error)throw new Error(data.error||"Request failed ("+response.status+")");return data}
  function icon(game){return game.metadata?.cover||("/assets/platforms/"+(game.provider==="steam"?"steam":game.provider==="xbox"?"xbox":"playstation")+".png")}
  function entitlementControl(game,index,error){const key=game.provider==='playstation'&&['Sony PlayStation 3','Sony PlayStation 4','Sony PlayStation 5'].includes(game.platform)?'psPlus':game.provider==='xbox'&&['Xbox 360','Xbox One'].includes(game.platform)?'gamesWithGold':'';if(!key)return '';const label=key==='psPlus'?'PlayStation Plus':'Games with Gold';const icon=key==='psPlus'?'/assets/platforms/psplus.png':'/assets/platforms/gameswithgold.png';return '<label class="import-entitlement" title="'+label+'" aria-label="'+label+'"><input type="checkbox" data-entitlement="'+key+':'+(error?'errors':'ready')+':'+index+'" '+(game[key]?'checked':'')+'><img src="'+icon+'" alt=""></label>'}
  function row(game,index,error){const actions=error?'<button class="game-action" data-manual="'+index+'" title="Add game">+</button><button class="game-action" data-remove-error="'+index+'" title="Remove">×</button>':'<button class="game-action" data-add-ready="'+index+'" title="Add game">+</button><button class="game-action" data-remove="'+index+'" title="Remove">×</button>';return '<li class="game"><img src="'+esc(icon(game))+'" alt=""><span><strong>'+esc(game.title)+'</strong><small>'+esc(game.platform)+(error?' · Metadata match failed':' · '+esc(game.metadata?.source||'Matched'))+'</small></span><span class="game-actions">'+entitlementControl(game,index,error)+actions+'</span></li>'}
  function render(){q("#ready").innerHTML=state.ready.length?state.ready.map((g,i)=>row(g,i,false)).join(""):'<li class="empty">No matched games.</li>';q("#errors").innerHTML=state.errors.length?state.errors.map((g,i)=>row(g,i,true)).join(""):'<li class="empty">No errors.</li>';q("#readyCount").textContent=state.ready.length;q("#errorCount").textContent=state.errors.length;q("#addReady").disabled=!state.ready.length||state.busy;q("#addAllErrors").disabled=!state.errors.length||state.busy}
  async function search(game){const data=await fetch("/api/search?q="+encodeURIComponent(game.title),{cache:"no-store"}).then(read);const metadata=(data.results||[])[0];if(!metadata)throw new Error("No metadata match");return {...game,metadata,cover:metadata.cover||""}}
  async function fetchProvider(provider){if(state.busy)return;state.busy=true;render();progress("fetch",8);progress("match",0);q("#status").textContent="Fetching account library…";try{const data=await fetch("/api/shelf-import-digital",{method:"POST",headers:{"Content-Type":"application/json","x-edit-password":password()},body:JSON.stringify({action:"fetch",provider})}).then(read);progress("fetch",100);const games=data.games||[];state.ready=[];state.errors=[];let done=0;const queue=games.slice();const workers=Array.from({length:Math.min(4,queue.length)},async()=>{while(queue.length){const game=queue.shift();try{state.ready.push(await search(game))}catch{state.errors.push(game)}done++;progress("match",games.length?done/games.length*100:100);if(done%5===0||done===games.length)render()}});await Promise.all(workers);q("#status").textContent="Found "+state.ready.length+" matches and "+state.errors.length+" games needing attention for "+data.account+"."}catch(error){q("#status").textContent=error.message;progress("fetch",0)}finally{state.busy=false;render()}}
  async function add(games){if(!games.length||state.busy)return;state.busy=true;render();q("#status").textContent="Adding "+games.length+" game"+(games.length===1?"":"s")+" to Shelf…";try{const data=await fetch("/api/shelf-import-digital",{method:"POST",headers:{"Content-Type":"application/json","x-edit-password":password()},body:JSON.stringify({action:"add",games})}).then(read);const ids=new Set(games.map((g)=>g.provider+":"+g.remoteId+":"+g.title));state.ready=state.ready.filter((g)=>!ids.has(g.provider+":"+g.remoteId+":"+g.title));state.errors=state.errors.filter((g)=>!ids.has(g.provider+":"+g.remoteId+":"+g.title));const parts=[];if(data.addedToDrive)parts.push(data.addedToDrive+" added to Drive");if(data.addedToNewAdditions)parts.push(data.addedToNewAdditions+" sent to New additions");if(data.skipped)parts.push(data.skipped+" duplicate(s) skipped");q("#status").textContent=parts.join("; ")+"."}catch(error){q("#status").textContent=error.message}finally{state.busy=false;render()}}
  function updateEntitlement(event){const input=event.target.closest('[data-entitlement]');if(!input)return;const [key,list,index]=input.dataset.entitlement.split(':');state[list][Number(index)][key]=input.checked}document.querySelectorAll("[data-fetch]").forEach((button)=>button.addEventListener("click",()=>fetchProvider(button.dataset.fetch)));q("#ready").addEventListener("change",updateEntitlement);q("#errors").addEventListener("change",updateEntitlement);q("#ready").addEventListener("click",(e)=>{const addButton=e.target.closest("[data-add-ready]");if(addButton){add([state.ready[Number(addButton.dataset.addReady)]]);return}const removeButton=e.target.closest("[data-remove]");if(removeButton){state.ready.splice(Number(removeButton.dataset.remove),1);render()}});q("#errors").addEventListener("click",(e)=>{const addButton=e.target.closest("[data-manual]");if(addButton){add([state.errors[Number(addButton.dataset.manual)]]);return}const removeButton=e.target.closest("[data-remove-error]");if(removeButton){state.errors.splice(Number(removeButton.dataset.removeError),1);render()}});q("#addReady").addEventListener("click",()=>add(state.ready));q("#addAllErrors").addEventListener("click",()=>add(state.errors));render();
  </script></body></html>`;
}

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function html(markup) { return new Response(markup, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }); }
