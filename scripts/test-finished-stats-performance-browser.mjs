// Run with PLAYWRIGHT_MODULE pointing to an installed playwright module if needed.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { onRequestGet as getShelf, onRequestPut as putShelf } from '../functions/api/shelf.js';
import { onRequestGet as getList, onRequestPut as putList } from '../functions/api/sync.js';
const playwright = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : await import('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const values = new Map();
const writes = [];
let notModified = 0;
let rejectSave = false;
const env = { EDIT_PASSWORD:'test', GAMELIST:{ async get(key) { return values.has(key) ? JSON.parse(values.get(key)) : null; }, async put(key, value) { values.set(key, value); } } };
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let response;
    if (url.pathname === '/version.json') {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({version:'test', notificationVersion:0}));
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      let body = '';
      for await (const chunk of req) body += chunk;
      if (req.method === 'PUT') writes.push({path:url.pathname, bytes:Buffer.byteLength(body), body:JSON.parse(body)});
      const request = new Request(url, {method:req.method, headers:{...req.headers, 'x-edit-password':'test'}, ...(body?{body}:{})});
      if (req.method === 'PUT' && rejectSave) response = Response.json({error:'Simulated save failure'}, {status:503});
      else if (url.pathname === '/api/shelf') response = await (req.method === 'PUT' ? putShelf : getShelf)({request, env});
      else if (url.pathname === '/api/sync') response = await (req.method === 'PUT' ? putList : getList)({request, env});
      else if (url.pathname === '/api/auth') response = Response.json({ok:true});
      else response = Response.json({games:[],achievements:[],trophies:[],needsSetup:true});
      if (response.status === 304) notModified++;
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(body);
  } catch (error) { res.writeHead(404); res.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'})});
try {
 const current=String(new Date().getFullYear());
 const games=Array.from({length:2000},(_,i)=>({id:'g-'+i,title:'Finished Game '+i,platform:i%2?'Switch':'PS5',section:'backlog',completedAt:current+'-'+String(i%12+1).padStart(2,'0')+'-15',releaseDate:'2020-01-01',lengthHours:20,finishHours:20,genres:['Adventure','Action'],statuses:[],owners:['Tester'],ratings:{gameplay:8,story:8},storeLinks:{}}));
 values.set('gamelist-data',JSON.stringify({games,settings:{defaultOwner:'Tester',language:'en',disableLoginAnimation:true}}));
 values.set('shelf-data',JSON.stringify({games:[],sourceGames:[],overrides:{},favoriteGameIds:[]}));
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin+'/?list=backlog',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-booting'));
 await page.waitForFunction(()=>document.querySelector('#collectionLibrary')?.shadowRoot?.querySelector('.shelf-grid'));
 const timing=await page.evaluate(()=>{
  const start=performance.now();document.querySelector('#completedStatsButton').click();
  return {ms:performance.now()-start,nodes:document.querySelector('#finishedStatsBody').querySelectorAll('*').length};
 });
 assert.ok(timing.ms<1500,'2,000-game stats open within 1.5 seconds: '+timing.ms);
 assert.ok(timing.nodes<1500,'Hidden game lists must not inflate the initial DOM: '+timing.nodes);
 const dialog=page.locator('#finishedStatsDialog');
 const finished=dialog.locator('.finished-stats-kpi.is-finished').first();
 assert.equal(await finished.locator(':scope > strong').textContent(),'2000');
 assert.equal(await finished.locator('.finished-stats-game-row').count(),0,'Details are deferred initially');
 await finished.hover();
 assert.equal(await dialog.locator('.finished-stats-hover-float .finished-stats-game-row').count(),2000,'Desktop drill-down contains every game');
 assert.equal(await finished.locator('[data-stats-deferred-detail]').count(),0,'Details materialize once');
 await page.locator('#finishedStatsYearSelect').selectOption('all',{force:true});
 assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),'all');
 await page.locator('#finishedStatsYearSelect').selectOption(current,{force:true});
 await page.setViewportSize({width:390,height:900});
 await dialog.locator('.finished-stats-kpi.is-finished').first().click();
 assert.equal(await dialog.locator('.finished-stats-mini-list .finished-stats-game-row').count(),2000,'Mobile drill-down contains every game');
 await dialog.locator('[data-stats-mini-close]').click();
 const january=dialog.locator('.finished-stats-month[data-stats-overlay-title="January"]');
 await january.click();
 assert.equal(await dialog.locator('.finished-stats-mini-list .finished-stats-game-row').count(),167,'Monthly drill-down retains correct records');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({games:games.length,openMs:Math.round(timing.ms),initialNodes:timing.nodes,desktopDetails:2000,mobileDetails:2000,januaryDetails:167}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}