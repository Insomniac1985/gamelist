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
 const current=String(new Date().getFullYear()); const previous=String(Number(current)-1); const older=String(Number(current)-2);
 const game=year=>({id:'finished-'+year,title:'Finished '+year,platform:'Switch',section:'backlog',completedAt:year+'-06-01',releaseDate:'2020-01-01',owners:['Tester'],genres:[],statuses:[],ratings:{},storeLinks:{}});
 const seed=games=>values.set('gamelist-data',JSON.stringify({games,settings:{defaultOwner:'Tester',language:'en',disableLoginAnimation:true}}));
 values.set('shelf-data',JSON.stringify({games:[],sourceGames:[],overrides:{},favoriteGameIds:[]}));
 seed([game(previous)]);
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',timezoneId:'Europe/Madrid'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const load=async query=>{await page.goto(origin+'/?'+query,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-booting'));};
 const open=async()=>{await page.locator('#completedStatsButton').evaluate(button=>button.click());await page.locator('#finishedStatsDialog').waitFor({state:'visible'});};
 const close=async()=>page.locator('#finishedStatsDialog').evaluate(dialog=>dialog.close());
 await load('list=backlog');
 assert.equal(await page.locator('#completedYearControl').isVisible(),false,'No outside selector for a single finished year');
 await open();
 assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),current,'Default to current year even with only older finishes');
 assert.match(await page.locator('#finishedStatsTitle').textContent(),new RegExp(current));
 await page.locator('#finishedStatsYearSelect').selectOption(previous,{force:true});
 assert.match(await page.locator('#finishedStatsTitle').textContent(),new RegExp(previous));
 await page.locator('#finishedStatsYearSelect').selectOption('all',{force:true});
 assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),'all');
 await close();
 seed([game(previous),game(older)]);
 await load('list=backlog');
 await page.locator('#completedYearFilter').selectOption(previous,{force:true});
 await open();assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),previous,'Honor the selected outside year');await close();
 await page.locator('#completedYearFilter').selectOption('all',{force:true});
 await open();assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),'all','Honor explicitly selected All');await close();
 await load('stats=all');
 await page.locator('#finishedStatsDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#finishedStatsYearSelect').inputValue(),'all','Preserve explicit all-year links');
 assert.deepEqual(errors,[]);
 console.log('Finished defaults to current year; explicit years, All and links remain available.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}