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
 const shelf=[{id:'lent',title:'Lent physical game',platform:'Switch',owners:['Judy'],lentTo:'Alex',game:true,box:true},{id:'owned',title:'Owned physical game',platform:'Switch',game:true,box:true}];
 values.set('shelf-data',JSON.stringify({games:shelf,sourceGames:[],overrides:{},favoriteGameIds:[]}));
 const games=[{id:'linked',title:'Lent Backlog',platform:'Switch',section:'backlog',shelfId:'lent',owners:['Judy']},{id:'other',title:'Other Backlog',platform:'Switch',section:'backlog'},{id:'radar',title:'Radar Game',platform:'PS5',section:'upcoming'},{id:'wish',title:'Wishlist Game',platform:'PS5',section:'wanted'}];
 values.set('gamelist-data',JSON.stringify({games,settings:{defaultOwner:'Tester',disableLoginAnimation:true,shelfDigitalGames:true,language:'en'}}));
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await page.goto(origin+'/?list=backlog',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-booting'));
 await page.locator('#collectionLibrary .game-card').first().waitFor({state:'attached'});
 const categoryWidths=new Map();
 const platformWidths=new Map();
 for(const section of ['backlog','upcoming','wanted','shelf']) {
  await page.locator(`button[data-mobile-section="${section}"]`).click();
  assert.equal(await page.locator('#lentFilter').isVisible(),true,'Lent available in '+section);
  for(const width of [690,768,1024,1300,1301,1440,1920]) {
   await page.setViewportSize({width,height:1000});
   const category=await page.locator('.toolbar').first().locator('label:has(#tagFilter)').boundingBox();
   if(section==='backlog') categoryWidths.set(width,category.width);
   const platform=await page.locator('.toolbar').first().locator('label:has(#platformFilter)').boundingBox();
   if(section==='backlog') platformWidths.set(width,platform.width);
   if(section==='shelf') {
    if(width>=1301) {
     assert.ok(Math.abs(platform.width-platformWidths.get(width))<1,'Shelf Platform matches Backlog in one row');
     const search=await page.locator('.toolbar').first().locator('.search').boundingBox();
     assert.ok(search.width>platform.width,'Shelf Search gets more width than Platform');
    }
    assert.ok(Math.abs(category.width-categoryWidths.get(width))<1,'Shelf Category matches Backlog at '+width+': '+category.width+' vs '+categoryWidths.get(width));
    if(width<=1300) {
     const search=await page.locator('.toolbar').first().locator('.search').boundingBox();
     assert.ok(category.y>=search.y+search.height,'Shelf Category is on the second row');
    }
   }
   if (['backlog','shelf'].includes(section) && [768,1440].includes(width)) await page.locator('.toolbar').first().screenshot({path:path.join(process.env.TEMP || root,'gamelist-toolbar-'+section+'-'+width+'.png')});
   const layout=await page.locator('.toolbar').first().evaluate(toolbar=>{
    const bounds=toolbar.getBoundingClientRect();
    const cells=[...toolbar.children].filter(el=>getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {name:el.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
    const status=toolbar.querySelector(".toolbar-status-filters"); const r=status.getBoundingClientRect(); for(const child of status.children) { if(getComputedStyle(child).display==="none") continue; const c=child.getBoundingClientRect(); if(c.right>r.right+1 || child.scrollWidth>child.clientWidth+1) throw new Error("Toggle contents overflow: "+child.textContent); } return {left:bounds.left,right:bounds.right,cells};
   });
   for(const cell of layout.cells) assert.ok(cell.left>=layout.left-1&&cell.right<=layout.right+1,JSON.stringify({section,width,overflow:cell,layout}));
   for(let a=0;a<layout.cells.length;a++) for(let b=a+1;b<layout.cells.length;b++) {const x=layout.cells[a],y=layout.cells[b];assert.ok(!(x.left<y.right-1&&x.right>y.left+1&&x.top<y.bottom-1&&x.bottom>y.top+1),JSON.stringify({section,width,overlap:[x,y]}));}
   const rows=new Set(layout.cells.map(c=>Math.round(c.bottom)));
   assert.equal(rows.size,width>=1301?1:2,JSON.stringify({section,width,rows:[...rows],layout}));
  }
  for (const width of [280,320,390,540,689]) {
   await page.setViewportSize({width,height:1000});
   const group=await page.locator('.toolbar-status-filters').boundingBox();
   const lent=await page.locator('#lentFilter').locator('..').boundingBox();
   const preorder=await page.locator('#preorderedFilter').locator('..').boundingBox();
   if(preorder && group.width>=272) {
    assert.ok(Math.abs(lent.width-preorder.width)<1,'Mobile toggles have equal halves');
    assert.ok(Math.abs(lent.y-preorder.y)<1,'Mobile toggles share a row when they fit');
    assert.ok(Math.abs(lent.width+preorder.width+8-group.width)<1,'Mobile halves fill the row');
   } else {
    assert.ok(Math.abs(lent.width-group.width)<1,'Mobile toggle fills the row');
    if(preorder) assert.ok(lent.y>=preorder.y+preorder.height,'Narrow screens stack full-width toggles');
   }
  }
 }
 await page.locator('#lentFilter').check();
 await page.waitForFunction(()=>document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-card').length===1);
 assert.match(await page.locator('#collectionLibrary .game-card h3').textContent(),/Lent physical/);
 await page.locator('#lentFilter').uncheck();
 await page.waitForFunction(()=>document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-card').length===2);
 await page.locator('button[data-mobile-section="backlog"]').click();
 await page.locator('#lentFilter').check();
 assert.equal(await page.locator('#backlog .game-card').count(),1);
 assert.match(await page.locator('#backlog .game-card h3').textContent(),/Lent Backlog/);
 assert.deepEqual(errors,[]);
 console.log('Lent filtering and one/two-row toolbar fit passed in all four views at 690–1920px.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
