import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { isEditorRequest } from '../functions/api/editor-auth.js';
const source = readFileSync(new URL('../functions/api/shelf-metadata.js', import.meta.url), 'utf8');
const values = new Map();
const queries = [];
let writes = 0;
let physicalAvailable = false;
const env = { EDIT_PASSWORD:'test', GAMELIST:{ async get(key) { return structuredClone(values.get(key) || null); }, async put(key, value) { writes++; values.set(key,JSON.parse(value)); } } };
const context = vm.createContext({ Request,Response,URL,URLSearchParams,Date,JSON,Number,String,Array,Object,Set,Math,Promise,isEditorRequest,
 runnerThemeSettings:async()=>({}), runnerStyle:()=>'',
 searchMetadata:async({request})=>{
  const q=new URL(request.url).searchParams.get('q'); queries.push(q);
  if(q==='Failure') return Response.json({error:'IGDB quota exceeded'},{status:503});
  if(q==='No match') return Response.json({results:[]});
  if(q==='https://www.igdb.com/games/exact-game') return Response.json({results:[{title:'Different official title',igdbUrl:q,description:'Official description',lengthHours:12}]});
  return Response.json({results:[{title:q,description:'Found description',lengthHours:24,cover:'new-cover',publisher:'New publisher'}]});
 },
 collectionPrice:async()=>physicalAvailable
  ? Response.json({prices:{loose:12,complete:20},mainValue:12,currency:'EUR',productId:'123',productUrl:'https://www.pricecharting.com/game/pal-nintendo-switch/source-game'})
  : Response.json({error:'PriceCharting unavailable'},{status:502}),
});
vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''),context);
values.set('gamelist-data',{settings:{language:'en'}});
values.set('shelf-data',{sourceGames:[{id:'source',title:'Source Game',cover:'custom-cover',lengthHours:0}],games:[{id:'linked',title:'Edition name',igdbUrl:'https://www.igdb.com/games/exact-game',lengthHours:null,digital:true},{id:'failure',title:'Failure'},{id:'none',title:'No match'},{id:'deleted',title:'Deleted',deletedAt:'2026-01-01'}],overrides:{source:{notes:'Keep notes',owners:['Judy'],description:'   '}},favoriteGameIds:['source'],customSetting:'keep'});
const run=async options=>{
 const response=await context.onRequestPost({env,request:new Request('https://local/api/shelf-metadata',{method:'POST',headers:{'Content-Type':'application/json','x-edit-password':'test'},body:JSON.stringify({all:true,igdb:true,pricecharting:false,...options})})});
 assert.equal(response.status,200); return response.json();
};
const result=await run();
assert.equal(result.processed,4); assert.equal(result.updated,2); assert.equal(result.errors.length,1);
assert.equal(result.results.find(r=>r.id==='failure').status,'error');
assert.equal(result.results.find(r=>r.id==='none').status,'no_match');
const shelf=values.get('shelf-data');
assert.equal(shelf.overrides.source.lengthHours,24); assert.equal(shelf.overrides.source.cover,'custom-cover');
assert.equal(shelf.overrides.source.description,'Found description'); assert.equal(shelf.overrides.source.notes,'Keep notes');
assert.deepEqual(shelf.overrides.source.owners,['Judy']); assert.deepEqual(shelf.favoriteGameIds,['source']);
assert.equal(shelf.games[0].lengthHours,12); assert.equal(shelf.games[0].description,'Official description');
assert.equal(shelf.customSetting,'keep'); assert.ok(queries.includes('https://www.igdb.com/games/exact-game'));
const beforeWrites=writes;
const again=await run(); assert.equal(again.updated,0); assert.equal(writes,beforeWrites,'No write when metadata is unchanged or unavailable');
const physical=await run({ids:['source'],all:false,igdb:false,pricecharting:true});
assert.equal(physical.errors.length,1); assert.match(physical.errors[0].error,/PriceCharting unavailable/);
const digital=await run({ids:['linked'],all:false,igdb:false,pricecharting:true});
assert.equal(digital.errors.length,0); assert.equal(digital.updated,0,'Digital games skip physical lookups');
physicalAvailable = true;
const recovered=await run({ids:['source'],all:false,igdb:false,pricecharting:true});
assert.equal(recovered.updated,1);
assert.equal(values.get('shelf-data').overrides.source.price,12);
assert.equal(values.get('shelf-data').overrides.source.priceCurrency,'EUR');
assert.equal(values.get('shelf-data').overrides.source.collectionPrices.complete,20);
assert.equal(values.get('shelf-data').overrides.source.cover,'custom-cover');
const html=await (await context.onRequestGet({env})).text();
const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(inline);
const playwright=process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE.startsWith('file:')?process.env.PLAYWRIGHT_MODULE:'file:///'+process.env.PLAYWRIGHT_MODULE.replaceAll('\\','/')) : await import('playwright');
const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage(); const errors=[]; const batches=[];
 page.on('pageerror',e=>errors.push(e.message));
 const complete={cover:'cover',description:'description',publisher:'publisher',developer:'developer',genre:'Adventure',igdbUrl:'https://www.igdb.com/games/game',releaseDate:'2020-01-01',lengthHours:10,digital:true};
 const runnerShelf={sourceGames:[{...complete,id:'already-filled',title:'Already Filled',description:'',lengthHours:0}],overrides:{'already-filled':{description:'Saved override',lengthHours:10}},games:[{...complete,id:'playtime',title:'Missing Playtime',lengthHours:0},{...complete,id:'description',title:'Missing Description',description:''}]};
 await page.route('https://metadata.test/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/shelf') return route.fulfill({json:runnerShelf});
  if(route.request().method()==='POST') {
   const body=route.request().postDataJSON();batches.push(body);
   return route.fulfill({json:{processed:body.ids.length,updated:0,errors:[],results:body.ids.map(id=>({id,title:id,status:'no_match',fields:[],providers:[{source:'IGDB',status:'no_match'}]}))}});
  }
  return route.fulfill({contentType:'text/html',body:html});
 });
 await page.goto('https://metadata.test/api/shelf-metadata');
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#log').textContent.includes('Done.'));
 assert.deepEqual(batches.flatMap(b=>b.ids),['playtime','description'],'Queue missing data despite covers and respect saved overrides');
 const log=await page.locator('#log').textContent();assert.match(log,/no matching metadata found/);assert.ok(log.includes('\n'));assert.deepEqual(errors,[]);
} finally {await browser.close();}
console.log('Shelf metadata endpoint persistence, provider outcomes, missing-data queue and runner checks passed.');
