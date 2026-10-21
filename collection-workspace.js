import { syncMediaFormatToggle } from "./media-format-toggle.js";
/** Mount the existing Shelf UI in scoped surfaces, using its original markup,
 * styles, renderers and event handlers. The legacy Shelf page remains intact. */
let workspacePromise;
export function mountCollectionWorkspace(options) {
  return workspacePromise ||= mount(options).catch(error => { workspacePromise = null; throw error; });
}

async function mount({ slots, changed, openGame, mediaChanged, viewChanged }) {
  const [markup, ...styles] = await Promise.all([
    fetch('shelf.html').then(read),
    ...['styles.css', 'shelf.css', 'game-editor-layout.css'].map(path => fetch(path).then(read)),
  ]);
  const source = new DOMParser().parseFromString(markup, 'text/html');
  source.querySelectorAll('script').forEach(node => node.remove());
  const surfaces = [];
  const css = styles.join('\n').replace(/\bhtml(?=[\s.#:[>])/g, '.shelf-page').replace(/\bbody(?=[\s.#:[>])/g, '.shelf-page');
  const surface = (host, name) => {
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css + `\n:host{display:block;min-width:0} :host([hidden]){display:none!important}
      .shelf-page{background:transparent;min-height:0;margin:0;padding:0;overflow:visible;color:inherit}
      .shelf-page>.topbar,.shelf-page>.backdrop,.shelf-page>.site-footer,.shelf-page>.mobile-action-dock,
      .shelf-page>.floating-edit-actions,.shelf-page>.floating-search-button,.shelf-page>.scroll-top-button{display:none!important}
      .shelf-tabs{display:none!important}.shelf-toolbar{margin:0}.shelf-library{margin:0}
      .shelf-favorites-section{margin:0 0 24px}.highlights-section{margin:0}
      .shell.shelf-shell{display:none!important}.shelf-page.dialog-open{overflow:visible}
      .shelf-library>.column-head{justify-content:flex-end} [hidden]{display:none!important}
      .collection-view-controls{display:flex;align-items:flex-end;gap:6px;justify-self:end}
      .collection-view-controls .view-toggle{flex:0 0 42px}
      .shelf-toolbar{grid-template-columns:2fr repeat(4,minmax(80px,1fr)) minmax(120px,1fr) auto}
      @media(min-width:901px) and (max-width:1300px){
        .shelf-toolbar{grid-template-columns:repeat(4,minmax(0,1fr))}
        .shelf-toolbar>label{grid-column:auto!important}.shelf-toolbar>.search{grid-column:1/-1!important}
        .shelf-toolbar .order-label{grid-column:1/span 2!important}.collection-view-controls{grid-column:3/-1}
      }
      @media(max-width:900px){
        .shelf-toolbar{grid-template-columns:minmax(0,1fr) auto}
        .shelf-toolbar>label{grid-column:1/-1!important}.shelf-toolbar>.order-label{grid-column:1!important}
        .collection-view-controls{grid-column:2}
      }
    `;
    const body = document.createElement('div');
    body.className = 'shelf-page';
    body.dataset.surface = name;
    shadow.append(style, body);
    surfaces.push({ shadow, body });
    // Keep keyboard shortcuts in the parent from firing while editing here.
    shadow.addEventListener('keydown', event => event.stopPropagation());
    return body;
  };
  const runtimeHost = document.createElement('div');
  runtimeHost.className = 'collection-runtime';
  document.body.append(runtimeHost);
  const runtime = surface(runtimeHost, 'runtime');
  runtime.append(...source.body.childNodes);
  const move = (name, selector) => {
    const body = surface(slots[name], name);
    body.append(runtime.querySelector(selector));
    return body;
  };
  move('showcase', '[data-module="favorites"]');
  move('kpis', '[data-module="kpis"]');
  const toolbar = move('toolbar', '[data-module="filters"]');
  move('library', '[data-module="library"]');
  const stats = surface(slots.stats, 'stats');
  stats.append(runtime.querySelector('#shelfStatsBody'));
  const roots = () => surfaces.map(item => item.shadow);
  const queryAll = selector => roots().flatMap(root => [...root.querySelectorAll(selector)]);
  const scopeDocument = new Proxy(document, {
    get(target, name) {
      if (name === 'body' || name === 'documentElement') return runtime;
      if (name === 'querySelector') return selector => queryAll(selector)[0] || null;
      if (name === 'querySelectorAll') return queryAll;
      if (name === 'getElementById') return id => queryAll('#' + CSS.escape(id))[0] || null;
      if (name === 'addEventListener' || name === 'removeEventListener') return (...args) => roots().forEach(root => root[name](...args));
      if (name === 'activeElement') return roots().map(root => root.activeElement).find(Boolean) || document.activeElement;
      if (name === 'title') return document.title;
      const value = Reflect.get(target, name, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, name, value) { if (name !== 'title') Reflect.set(target, name, value, target); return true; },
  });
  let api;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let media = 'all';
  const mediaControl = document.createElement('div');
  mediaControl.className = 'unified-media-toggle';
  mediaControl.setAttribute('aria-label', 'Collection format');
  const viewControls = document.createElement('div');
  viewControls.className = 'collection-view-controls';
  viewControls.append(toolbar.querySelector('#viewToggleButton'), mediaControl);
  toolbar.querySelector('.shelf-toolbar').append(viewControls);
  const renderMedia = () => syncMediaFormatToggle(mediaControl, {
    value: media,
    icon: mode => api?.mediaIcon(mode) || "",
    translate: (key, values) => api?.translate(key, values) || key,
    onChange: setMedia,
  });
  const setMedia = value => {
    media = value;
    renderMedia();
    mediaChanged?.(media);
  };
  renderMedia();
  window.__unifiedShelfScope = { document: scopeDocument, changed, openGame, viewChanged, ready(value) { api = value; resolveReady(); } };
  await import('./shelf.js');
  await ready;
  setMedia(media);
  const syncTheme = () => {
    const classes = [...document.body.classList, ...document.documentElement.classList].filter(name => name.startsWith('theme-') || ['can-edit', 'mobile-app-mode'].includes(name));
    surfaces.forEach(({ body }) => { body.lang = document.documentElement.lang; body.className = ['shelf-page', ...classes, ...(body.classList.contains('dialog-open') ? ['dialog-open'] : [])].join(' '); });
  };
  new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'lang'] });
  const syncDialogLock = () => document.body.classList.toggle('dialog-open', queryAll('dialog[open]').length > 0 || document.querySelector('dialog[open]') !== null);
  roots().forEach(root => {
    root.addEventListener('close', syncDialogLock, true);
    root.addEventListener('click', () => requestAnimationFrame(syncDialogLock));
  });
  new MutationObserver(syncDialogLock).observe(runtime, { subtree: true, attributes: true, attributeFilter: ['open'] });
  syncTheme();
  return { ...api, setMedia, syncMedia(value) { media = value; renderMedia(); }, pendingRoot: slots.library.shadowRoot, syncTheme };
}
async function read(response) { if (!response.ok) throw new Error('Could not load collection UI.'); return response.text(); }
