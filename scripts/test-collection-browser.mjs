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
const metrics = [];
try {
  for (const count of [500, 2000, 5000]) {
    const games = Array.from({length:count}, (_,i) => ({id:`s-${i}`, title:`Shelf Game ${String(i).padStart(5,'0')}`, platform:i%2?'PS5':'Switch', genre:'Adventure', game:true, manual:i%3===0, box:i%3!==0, sealed:false, other:false, notes:'', owners:['Tester'], description:'Description. '.repeat(80), createdAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z', cover:origin+'/assets/platforms/playstation.png'}));
    games[0].notes = 'Gold/Shiny Day One Edition';
    values.set('shelf-data', JSON.stringify({games,sourceGames:[],overrides:{},layout:null,favoriteGameIds:[]}));
    const mainGames = games.map((game, index) => ({...game,id:`g-${index}`,title:`Backlog Game ${String(index).padStart(5,'0')}`,section:'backlog',order:index,digital:true,playing:index===0,genres:['Adventure'],storeLinks:{},releaseDate:'2020-01-01',igdbUrl:'https://www.igdb.com/games/test',developer:'Test studio',publisher:'Test publisher'}));
    values.set('gamelist-data', JSON.stringify({games:mainGames, settings:{defaultOwner:'Tester', defaultList:'shelf', disableLoginAnimation:true, shelfDigitalGames:true, language:'en', shelfShowcaseFavoriteGameIds:[]}}));
    const context = await browser.newContext({viewport:{width:1440,height:1000}, serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    const start = Date.now();
    await page.goto(`${origin}/?list=shelf`, {waitUntil:'domcontentloaded'});
    const cards = page.locator('#collectionLibrary .game-card');
    await cards.nth(99).waitFor({timeout:45000});
    await page.waitForFunction(() => !document.documentElement.classList.contains('theme-booting'));
    const loadMs = Date.now()-start;
    await page.waitForTimeout(400);
    assert.equal(await cards.count(),100);
    if (count === 500) {
      await cards.first().locator('.cover-button').click();
      const details = page.locator('#detailDialog[open]');
      await details.waitFor({state:'visible'});
      for (const width of [1024, 768, 390]) {
        await page.setViewportSize({width,height:900});
        const layout = await details.evaluate(dialog => {
          const title = dialog.querySelector('#detailTitle');
          title.innerHTML = '<span>The Legend of Zelda: Ocarina of Time</span>';
          const range = document.createRange();
          range.selectNodeContents(title);
          const buttons = [...dialog.querySelectorAll('.detail-edit,.detail-close')].map(button => button.getBoundingClientRect());
          const overlap = [...range.getClientRects()].some(text => buttons.some(button => text.left < button.right && text.right > button.left && text.top < button.bottom && text.bottom > button.top));
          const note = dialog.querySelector('#detailNote');
          const description = dialog.querySelector('#detailDescription');
          const condition = dialog.querySelector('.detail-condition');
          const trophies = dialog.querySelector('.detail-trophies');
          trophies.hidden = true;
          const noTrophyBorder = getComputedStyle(condition).borderBottomWidth;
          trophies.hidden = false;
          const trophyBorder = getComputedStyle(trophies).borderTopWidth;
          trophies.hidden = true;
          return {overlap, gap:description.getBoundingClientRect().top - note.getBoundingClientRect().bottom, noteLeft:getComputedStyle(note).borderTopLeftRadius, noTrophyBorder, trophyBorder};
        });
        assert.equal(layout.overlap, false, `Title clears both buttons at ${width}px`);
        assert.ok(layout.gap >= 12, `Note leaves space before description at ${width}px`);
        assert.equal(layout.noteLeft, '0px');
        assert.equal(layout.noTrophyBorder, '0px');
        assert.equal(layout.trophyBorder, '1px');
        if (width === 1024) await page.screenshot({path:path.join(process.env.TEMP || root,'gamelist-detail-spacing.png')});
      }
      await details.locator('#detailClose').click();
      await page.setViewportSize({width:1440,height:1000});
    }
    await cards.first().evaluate(node => { window.__firstScrolledCard = node; });
    await page.locator('#collectionLibrary .list-load-more').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-card').length >= 200);
    assert.equal(await cards.first().evaluate(node => node === window.__firstScrolledCard),true,'Continuous scrolling retains earlier cards');
    assert.equal(await page.locator('.list-pagination').count(),0,'There must be no page controls');
    // Search must reach a record far beyond the currently rendered batch.
    const filterStart = Date.now();
    await page.locator('#searchInput').first().fill(`Shelf Game ${String(count-1).padStart(5,'0')}`);
    await cards.first().waitFor();
    await page.waitForFunction(id => {
      const cards = document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-card');
      return cards.length === 1 && cards[0].dataset.id === id;
    }, `s-${count-1}`);
    const filterMs = Date.now()-filterStart;
    await page.locator('#searchInput').first().fill('');
    await cards.nth(99).waitFor();
    await page.waitForTimeout(250);
    const loadedBeforeEdit = await cards.count();
    const id = await cards.first().getAttribute('data-id');
    await cards.nth(1).evaluate(node => { window.__unchangedCard = node; });
    await cards.first().hover();
    await cards.first().locator('.edit-action').click();
    const dialog = page.locator('dialog#addDialog');
    await dialog.waitFor({state:'visible'});
    await dialog.locator('#notesInput').fill('Browser performance edit');
    const beforeWrites = writes.length;
    const saveStart = Date.now();
    await dialog.locator('.modal-head-save').click();
    await dialog.waitFor({state:'hidden',timeout:30000});
    const saveMs = Date.now()-saveStart;
    const shelf = JSON.parse(values.get('shelf-data'));
    assert.equal(shelf.games.find(game => game.id === id).notes, 'Browser performance edit');
    const save = writes.slice(beforeWrites).find(write => write.path === '/api/shelf');
    assert.ok(save?.body.patch, 'Browser edits must use the delta API');
    assert.ok(save.bytes < 15000, 'Saving must not upload the whole collection');
    assert.equal(await cards.count(),loadedBeforeEdit,'Saving preserves the already loaded continuous list');
    assert.equal(await cards.nth(1).evaluate(node => node === window.__unchangedCard),true,'Saving must preserve unchanged cards');
    const shelfRendered = await cards.count();
    // Failed saves leave the editor open and preserve entered text.
    if (count === 5000) {
      await cards.first().hover();
      await cards.first().locator('.edit-action').click();
      await dialog.waitFor({state:'visible'});
      await dialog.locator('#notesInput').fill('Unsaved retry');
      rejectSave = true;
      await dialog.locator('.modal-head-save').click();
      await page.waitForTimeout(500);
      assert.equal(await dialog.isVisible(),true);
      assert.equal(await dialog.locator('#notesInput').inputValue(),'Unsaved retry');
      rejectSave = false;
      await dialog.locator('.modal-head-save').click();
      await dialog.waitFor({state:'hidden'});
      assert.equal(JSON.parse(values.get('shelf-data')).games.find(game => game.id === id).notes,'Unsaved retry');
      await page.setViewportSize({width:390,height:844});
      const layers = await page.evaluate(() => ({
        playing: Number(getComputedStyle(document.querySelector('#playingSection .playing-current')).zIndex),
        section: getComputedStyle(document.querySelector('#playingSection')).zIndex,
        title: Number(getComputedStyle(document.querySelector('body > .topbar')).zIndex),
        gradient: Number(getComputedStyle(document.body, '::after').zIndex),
        dock: Number(getComputedStyle(document.querySelector('.mobile-action-dock')).zIndex),
      }));
      assert.ok(layers.playing > layers.gradient, 'Currently Playing must stay above the mobile branding gradient');
      assert.equal(layers.section, 'auto', 'The Playing section must let the gradient cover Last Finished cards independently');
      assert.ok(layers.title > layers.playing, 'Mobile branding must stay above Currently Playing');
      assert.ok(layers.dock >= layers.playing, 'Mobile controls must remain above Currently Playing');
      await page.locator('#collectionConditionFilter').selectOption('loose-plus',{force:true});
      await page.waitForFunction(() => {
        const root = document.querySelector('#collectionLibrary').shadowRoot;
        return root.querySelectorAll('.game-card').length === 100 && root.querySelectorAll('.condition-loose-plus').length === 100;
      });
      await page.locator('#viewToggleButton').first().click();
      await page.locator('#collectionLibrary .game-row').nth(99).waitFor();
      await page.locator('#collectionLibrary .list-load-more').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-row').length >= 200);
      await page.screenshot({path:path.join(process.env.TEMP || root,'gamelist-continuous-mobile.png')});
      await page.locator('#collectionConditionFilter').selectOption('sealed',{force:true});
      await page.waitForFunction(() => document.querySelector('#collectionLibrary').shadowRoot.querySelectorAll('.game-card,.game-row').length === 0);
      await page.locator('#collectionConditionFilter').selectOption('all',{force:true});
      await page.setViewportSize({width:1440,height:1000});
      // Revalidation survives a page reload; main lists use the same continuous renderer.
      await page.goto(`${origin}/?list=backlog`,{waitUntil:'domcontentloaded'});
      // Start in grid mode even if the preceding mobile test saved list mode.
      await page.locator('#backlog .game-row, #backlog .game-card').nth(99).waitFor();
      if (await page.locator('#backlog .game-row').count()) await page.locator('#viewToggleButton').first().click();
      const backlog = page.locator('#backlog .game-card');
      await backlog.nth(99).waitFor();
      assert.equal(await backlog.count(),100);
      await page.locator('#searchInput').first().fill('Backlog Game 04999');
      await page.waitForFunction(() => document.querySelectorAll('#backlog .game-card').length === 1 && document.querySelector('#backlog .game-card').dataset.id === 'g-4999');
      await backlog.first().hover();
      await backlog.first().locator('.edit-action').click();
      const mainDialog = page.locator('#gameDialog');
      await mainDialog.waitFor({state:'visible'});
      await mainDialog.locator('#titleInput').fill('Backlog Game 04999 edited');
      const writeStart = writes.length;
      await mainDialog.locator('#gameDialogSaveButton').click();
      await mainDialog.waitFor({state:'hidden'});
      const mainSave = writes.slice(writeStart).find(write => write.path === '/api/sync');
      assert.ok(mainSave?.body.patch);
      assert.equal(mainSave.body.patch.records.length,1,'Normalizing legacy records must not upload every game');
      assert.ok(mainSave.bytes < 15000);
      assert.equal(JSON.parse(values.get('gamelist-data')).games.find(game => game.id === 'g-4999').title,'Backlog Game 04999 edited');
      await page.evaluate(async () => {
        const cache = await import('/collection-cache.js');
        await cache.fetchCollectionJson('/api/shelf');
        await cache.fetchCollectionJson('/api/shelf');
      });
      assert.ok(notModified > 0,'Repeat loads must use ETag revalidation');
      await page.waitForFunction(() => localStorage.getItem('gamelist:v1:backend') === 'idb');
      assert.equal(await page.evaluate(() => localStorage.getItem('gamelist:v1')),null,'Large local backups must stay out of localStorage');
      console.log(`Chrome: Main 5,000-game save used ${mainSave.bytes} bytes; cache revalidation passed.`);
    }
    assert.deepEqual(errors,[], 'No uncaught browser errors');
    metrics.push({games:count, loadMs, filterMs, saveMs, saveBytes:save.bytes, renderedCards:shelfRendered});
    console.log(`Chrome: ${count} games passed.`);
    await context.close();
  }
  console.table(metrics);
  console.log('Chrome integration tests passed: 500/2,000/5,000 games, continuous scrolling, full-library search, editing, DOM reuse, failed-save retry.');
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
