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
 values.set('shelf-data', JSON.stringify({games:[],sourceGames:[],overrides:{},layout:null,favoriteGameIds:[]}));
 values.set('gamelist-data', JSON.stringify({games:[],settings:{defaultOwner:'Tester',language:'en',shelfDigitalGames:true,disableLoginAnimation:true,twitchUser:process.env.TEST_TWITCH_USER ?? 'tester'}}));
 const context = await browser.newContext({viewport:{width:1024,height:1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{sessionStorage.setItem('gamelist-editor','true');sessionStorage.setItem('gamelist-editor:password','test');});
 const page=await context.newPage();
 page.setDefaultTimeout(10000); const errors=[]; page.on('pageerror', e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin+'/?list=backlog',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.classList.contains('can-edit') && !document.documentElement.classList.contains('theme-booting')); await page.locator('#addButton').first().click({force:true});
 const editor=page.frameLocator('.shared-add-game-host iframe'); const dialog=editor.locator('#addDialog');
 await dialog.waitFor({state:'visible'});
 await page.setViewportSize({width:390,height:1000});
 const heading=dialog.locator('.modal-head h2');
 const headingLineHeight=await heading.evaluate(node=>getComputedStyle(node).lineHeight);
 await editor.locator('#shelfOnlyBacklogInput').check();
 assert.equal(await heading.evaluate(node=>getComputedStyle(node).lineHeight),headingLineHeight,'Add to Backlog matches the combined heading line spacing');
 await editor.locator('#shelfAddCollectionInput').uncheck();
 assert.equal(await heading.evaluate(node=>getComputedStyle(node).lineHeight),headingLineHeight,'Add to Collection matches the combined heading line spacing');
 await page.setViewportSize({width:1024,height:1000});
 assert.equal(await editor.locator('.shelf-only-backlog-check').isVisible(),false,'Only Backlog is hidden without Add to backlog');
 assert.equal(await editor.locator('#shelfOnlyBacklogInput').isChecked(),false,'Clear Only Backlog when disabling Add to backlog');
 await editor.locator('#shelfAddCollectionInput').check();
 assert.equal(await editor.locator('.shelf-only-backlog-check').isVisible(),true,'Show Only Backlog when Add to backlog is checked');
  for (const width of [1024,1440,390]) {
  await page.setViewportSize({width,height:1000});
  const {add,only,playing,stream}=await editor.locator('#shelfGamelistPreorderStreamRow').evaluate(row=>Object.fromEntries([
   ['add','.shelf-add-collection-check'],['only','.shelf-only-backlog-check'],['playing','.shelf-gamelist-playing-field'],['stream','.shelf-gamelist-stream-field'],
  ].map(([key,selector])=>{const r=row.querySelector(selector).getBoundingClientRect();return [key,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
  assert.ok(Math.abs(add.y-only.y)<1,'Only Backlog stays next to Add to backlog at '+width);
  assert.ok(only.x>=add.x+add.width,'Backlog checkboxes do not overlap');
  if (width >= 690) {
   assert.ok(playing.y>=add.y+add.height,'Playing stays on the second desktop row');
   if(stream.width) assert.ok(Math.abs(playing.y-stream.y)<1,'Stream shares the second desktop row');
  }
  if(!stream.width) assert.ok(Math.abs(playing.width-(only.x+only.width-add.x))<1,'Playing fills the lower row without Stream at '+width);
 }
 await page.setViewportSize({width:1024,height:1000});
 await editor.locator('#shelfOnlyBacklogInput').check();
 for (const section of ['upcoming','wanted']) {
  await editor.locator(`[data-gamelist-section="${section}"]`).click();
  assert.equal(await editor.locator('#shelfOnlyBacklogInput').isChecked(),false,'Clear when switching lists');
  assert.equal(await editor.locator('.shelf-only-backlog-check').isVisible(),false,'Only offered for Backlog');
  await editor.locator('[data-gamelist-section="collection"]').click();
  await editor.locator('#shelfAddCollectionInput').check();
  await editor.locator('#shelfOnlyBacklogInput').check();
 }
 assert.equal(await editor.locator('#shelfAddCollectionInput').isChecked(),true);
 for(const selector of ['.shelf-region-field','.shelf-addition-field','.shelf-value-field','.shelf-condition-field','.shelf-condition-notes-field','.shelf-pricecharting-section']) assert.equal(await editor.locator(selector).first().isVisible(),false,selector+' hidden');
 assert.equal(await editor.locator('#countryInput').getAttribute('required'),null);
 await editor.locator('#titleInput').fill('Only Backlog browser test');
 await editor.locator('#platformInput').fill('Switch');
 await editor.locator('#releaseDateInput').fill('2026-01-01');
 await dialog.locator('.modal-head-save').click();
 await dialog.waitFor({state:'hidden'});
 const backlog=JSON.parse(values.get('gamelist-data')).games.find(g=>g.title==='Only Backlog browser test');
 assert.equal(backlog.section,'backlog'); assert.ok(!backlog.shelfId);
 assert.equal(JSON.parse(values.get('shelf-data')).games.length,0);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.classList.contains('can-edit') && !document.documentElement.classList.contains('theme-booting')); await page.locator('#addButton').first().click({force:true});
 await dialog.waitFor({state:'visible'}); assert.equal(await editor.locator('#shelfOnlyBacklogInput').isChecked(),false,'Reset on next open');
 await editor.locator('#shelfOnlyBacklogInput').check();
 await editor.locator('#shelfOnlyBacklogInput').uncheck();
 assert.equal(await editor.locator('#shelfAddCollectionInput').isChecked(),true);
 assert.equal(await editor.locator('.shelf-condition-field').isVisible(),true,'Collection fields restored');
 await editor.locator('#titleInput').fill('Collection and Backlog browser test');
 await editor.locator('#platformInput').fill('Switch');
 await editor.locator('#releaseDateInput').fill('2026-01-01');
 await editor.locator('#countryInput').selectOption({label:'Spain'},{force:true});
 await dialog.locator('.modal-head-save').click();
 await dialog.waitFor({state:'hidden'});
 const combined=JSON.parse(values.get('gamelist-data')).games.find(g=>g.title==='Collection and Backlog browser test');
 const shelf=JSON.parse(values.get('shelf-data')).games;
 assert.equal(combined.section,'backlog'); assert.ok(combined.shelfId);
 assert.equal(shelf.length,1); assert.equal(shelf[0].id,combined.shelfId); assert.equal(shelf[0].gamelistId,combined.id);
 assert.equal(shelf.some(g=>g.title==='Only Backlog browser test'),false);
 assert.deepEqual(errors,[]);
 console.log('Only Backlog and normal Collection + Backlog saves passed, including reload and linked records.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
