import { syncMediaFormatToggle } from "./media-format-toggle.js";
/** Mount shared collection components inside the unified Gamelist shell. */
let workspacePromise;
export function mountCollectionWorkspace(options) {
  return workspacePromise ||= mount(options).catch(error => { workspacePromise = null; throw error; });
}

async function mount({ slots, changed, openGame, mediaChanged, viewChanged, clearFilters }) {
  const [markup, ...styles] = await Promise.all([
    fetch('collection-ui.html').then(read),
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
      .shelf-page[data-surface="showcase"],.shelf-page[data-surface="showcase"] .shelf-favorites-section{overflow:visible}
      .shell.shelf-shell{display:none!important}.shelf-page.dialog-open{overflow:visible}
      .shelf-page .highlights-section{margin:0!important}
      .shelf-library{min-width:0;background:transparent;border:0;box-shadow:none;padding:0}
      .shelf-library>.column-head{margin:0;padding:0 2px 12px;justify-content:space-between;box-sizing:border-box;min-height:var(--library-heading-min-height,68px)}
      :host([data-list="new"]) .shelf-library>.column-head{display:none}
      .shelf-page.theme-uppercase-titles .shelf-library>.column-head h2{text-transform:uppercase}
      .shelf-page.theme-gradient .shelf-library>.column-head h2{background:linear-gradient(135deg,var(--title-gradient-start,var(--accent)),var(--title-gradient-end,var(--accent)));background-clip:text;-webkit-background-clip:text}
      .shelf-grid{gap:12px;align-items:stretch;grid-template-columns:repeat(3,minmax(0,1fr))}
      .shelf-grid.list-view{grid-template-columns:minmax(0,1fr);gap:8px}
      @media(max-width:1120px){.shelf-grid:not(.list-view){grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.shelf-grid:not(.list-view){grid-template-columns:minmax(0,1fr)}.shelf-grid.list-view{gap:7px}}
      #shelfStats .stat[data-stat-action="completed"]{--stat-color:var(--accent);--stat-glow:color-mix(in srgb,var(--accent) 26%,transparent)}
      #shelfStats .stat-available{--stat-color:var(--accent-2);--stat-glow:color-mix(in srgb,var(--accent-2) 26%,transparent)}
      #detailDialog #detailDescription{font-family:"Cascadia Code",monospace;font-size:14px;font-weight:400;line-height:1.55;letter-spacing:normal;text-transform:none;white-space:pre-line}
      #showcaseDialog .modal-head-save{display:inline-flex!important}
      #showcaseDialog .showcase-toolbar{position:relative;z-index:30;overflow:visible}
      #showcaseDialog .showcase-toolbar .platform-logo-select.is-open{z-index:40}
      #showcaseDialog .showcase-picker-grid{position:relative;z-index:1}
      @media(max-width:760px){.shelf-page .stats .stat:nth-child(5):last-child{grid-column:1/-1;width:100%}}
      [hidden]{display:none!important}
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
    const ownerStyle = document.createElement('style');
    shadow.append(style, ownerStyle, body);
    surfaces.push({ shadow, body, ownerStyle });
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
  window.__unifiedShelfScope = { document: scopeDocument, changed, openGame, viewChanged, clearFilters, ready(value) { api = value; resolveReady(); } };
  await import('./collection-ui.js');
  await ready;
  setMedia(media);
  const syncTheme = () => {
    const classes = [...document.body.classList, ...document.documentElement.classList].filter(name => name.startsWith('theme-') || ['can-edit', 'mobile-app-mode'].includes(name));
    surfaces.forEach(({ body, ownerStyle }) => { const ownerCss = document.querySelector('#customOwnerColorStyles')?.textContent || ''; if (ownerStyle.textContent !== ownerCss) ownerStyle.textContent = ownerCss; body.lang = document.documentElement.lang; body.className = ['shelf-page', ...classes, ...(body.classList.contains('dialog-open') ? ['dialog-open'] : [])].join(' '); });
  };
  new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'lang'] });
  new MutationObserver(syncTheme).observe(document.head, { childList: true, subtree: true, characterData: true });
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
