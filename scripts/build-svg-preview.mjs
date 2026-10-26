import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function svgFiles(folder) {
  const entries = await readdir(path.join(root, "assets", folder), { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? svgFiles(`${folder}/${entry.name}`)
    : entry.name.endsWith(".svg") ? [`${folder}/${entry.name}`] : []));
  return groups.flat();
}

const names = (await Promise.all([svgFiles("icons"), svgFiles("charts")])).flat().sort();
const cards = await Promise.all(names.map(async name => {
  const source = (await readFile(path.join(root, "assets", name), "utf8")).trim();
  const viewBox = name.startsWith("charts/finished-stats-pie-") ? "0 0 100 100"
    : name.startsWith("charts/goty-export-platform-slice") ? "0 0 220 220"
      : name.startsWith("charts/price-graph") || name === "charts/price-history-point.svg" ? "0 0 600 150"
        : source.match(/\bviewBox=(?:"([^"]+)"|'([^']+)')/)?.slice(1).find(Boolean) || "0 0 24 24";
  const dimensions = viewBox.split(/[ ,]+/).map(Number);
  const aspect = dimensions[3] ? (dimensions[2] / dimensions[3]).toFixed(4) : "1";
  const fragment = /\bdata-svg-fragment=(?:"true"|'true')/.test(source);
  const title = name.replace(/\.svg$/, "");
  return `<article class="svg-card" data-name="${escapeHtml(title)}" data-viewbox="${escapeHtml(viewBox)}" data-fragment="${fragment}" style="--preview-aspect:${aspect}">
    <header><h3>${escapeHtml(title)}</h3><span>${fragment ? "SVG fragment" : "SVG"} · ${escapeHtml(viewBox)}</span></header>
    <div class="preview-canvas" aria-label="Preview of ${escapeHtml(title)}"></div>
    <details><summary>Edit source SVG</summary><textarea class="source-editor" spellcheck="false" aria-label="${escapeHtml(title)} SVG source">${escapeHtml(source)}</textarea></details>
    <footer><button class="download-source" type="button">Download SVG</button><span class="preview-status" aria-live="polite"></span></footer>
  </article>`;
}));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gamelist SVG Preview</title>
  <link rel="stylesheet" href="../../styles.css">
  <style>
    :root { color-scheme: dark; --accent: #fff; --preview-line: #fff; }
    html, body { min-height: 100%; background: #0b0d12 !important; color: #f6f7fb !important; }
    body { display: block !important; margin: 0 !important; padding: 24px !important; }
    .preview-page { width: min(1600px, 100%); margin: 0 auto; }
    .preview-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin: 0 0 18px; }
    .preview-heading h1 { margin: 0; font-size: clamp(26px, 4vw, 40px); }
    .preview-heading p { margin: 7px 0 0; color: #aab3c2; }
    .preview-controls { position: sticky; top: 8px; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0 0 24px; padding: 12px; background: #171b23; border: 1px solid #303744; border-radius: 10px; box-shadow: 0 12px 28px #0008; }
    .preview-controls label { display: inline-flex; align-items: center; gap: 8px; margin: 0; color: #fff; }
    .preview-controls input[type=color] { width: 40px; height: 30px; padding: 2px; }
    .preview-controls output { margin-left: auto; color: #bbc4d1; }
    .preview-section { margin: 26px 0; }
    .preview-section h2 { margin: 0 0 12px; font-size: 22px; }
    .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: 12px; }
    .svg-card { display: grid; grid-template-rows: auto minmax(110px, auto) auto auto; min-width: 0; gap: 10px; padding: 12px; background: #141820; border: 1px solid #2b3340; border-radius: 9px; }
    .svg-card header h3 { margin: 0; color: #f4f6fa; font-size: 13px; overflow-wrap: anywhere; }
    .svg-card header span { display: block; margin-top: 4px; color: #9aa5b4; font-size: 10px; }
    .preview-canvas { display: grid; place-items: center; width: 100%; aspect-ratio: var(--preview-aspect, 1); min-height: 110px; max-height: 210px; overflow: hidden; background-color: #080a0e; background-image: linear-gradient(45deg,#151922 25%,transparent 25%),linear-gradient(-45deg,#151922 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#151922 75%),linear-gradient(-45deg,transparent 75%,#151922 75%); background-size: 16px 16px; background-position: 0 0,0 8px,8px -8px,-8px 0; border: 1px solid #262d38; border-radius: 6px; }
    .preview-canvas svg { display: block; width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; color: var(--preview-line); overflow: visible; }
    .preview-grid.force-white .preview-canvas svg,
    .preview-grid.force-white .preview-canvas svg * { fill: none !important; stroke: var(--preview-line) !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important; }
    .preview-grid.force-white .preview-canvas svg text { fill: var(--preview-line) !important; stroke: none !important; }
    .svg-card details { min-width: 0; }
    .svg-card summary { color: #dce2eb; font-size: 12px; cursor: pointer; }
    .source-editor { box-sizing: border-box; display: block; width: 100%; min-height: 135px; margin-top: 8px; padding: 8px; resize: vertical; color: #e5eaf2; background: #090b10; border: 1px solid #303744; border-radius: 6px; font: 11px/1.45 Consolas, monospace; tab-size: 2; }
    .svg-card footer { display: flex; align-items: center; gap: 8px; }
    .svg-card footer button { min-height: 32px; padding: 6px 10px; color: #fff; background: #232a36; border: 1px solid #3b4554; border-radius: 6px; cursor: pointer; }
    .preview-status { color: #aab3c2; font-size: 10px; overflow-wrap: anywhere; }
    .preview-status.error { color: #ff8290; }
    @media (max-width: 600px) { body { padding: 12px !important; } .preview-heading { display: block; } .preview-controls output { width: 100%; margin: 0; } }
  </style>
</head>
<body>
  <main class="preview-page">
    <header class="preview-heading"><div><h1>Gamelist SVG Preview</h1><p>Edit a source, see the rendered result, then download that SVG to replace its source file.</p></div></header>
    <section class="preview-controls" aria-label="Preview controls">
      <label><input id="white-lines" type="checkbox" checked> White line preview</label>
      <label>Line color <input id="line-color" type="color" value="#ffffff"></label>
      <output id="asset-count"></output>
    </section>
    <section class="preview-section"><h2>Icons</h2><div class="preview-grid force-white" id="icon-grid">${cards.filter((_, index) => names[index].startsWith("icons/")).join("\n")}</div></section>
    <section class="preview-section"><h2>Charts and chart fragments</h2><div class="preview-grid force-white" id="chart-grid">${cards.filter((_, index) => names[index].startsWith("charts/")).join("\n")}</div></section>
  </main>
  <script>
    const samples = {
      "icons/brands/stream-play": ['<path class="twitch-filter-logo-path" d="M6 0 1.7 4.3v15.4h5.1V24l4.3-4.3h3.4l7.8-7.7V0H6Z"/>'],
      "icons/brands/stream-play-off": ['<path class="twitch-filter-logo-path" d="M6 0 1.7 4.3v15.4h5.1V24l4.3-4.3h3.4l7.8-7.7V0H6Z"/>'],
      "icons/navigation/sort-arrow": ['M12 5v14m-7-7 7 7 7-7'],
      "icons/settings/settings-visibility": ['is-visible', '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'],
      "icons/status/rounded-star-svg": ['rounded-star-icon'],
      "charts/finished-stats-bell-area-2": ['M8 88 C18 78 27 26 50 18 C73 26 82 78 92 88 Z', 'M8 88 C18 78 27 26 50 18 C73 26 82 78 92 88'],
      "charts/finished-stats-pie-segment": ['1', '0.9', '<path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z"/>'],
      "charts/finished-stats-pie-segment-2": ['1', 'Preview slice', '0.9', '<path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z"/>'],
      "charts/finished-stats-pie-shape": ['#fff'],
      "charts/finished-stats-pie-shape-2": ['50', '4', '0', '4', '50', '#fff'],
      "charts/goty-export-platform-pie": ['<circle cx="110" cy="110" r="96"/><path d="M110 110V14A96 96 0 0 1 206 110Z"/>'],
      "charts/goty-export-platform-slice": ['#fff'],
      "charts/goty-export-platform-slice-2": ['110', '14', '0', '206', '110', '#fff'],
      "charts/price-graph": ['TODAY'],
      "charts/price-graph-2": ['OCT 2026'],
      "charts/price-graph-3": ['24,118 110,86 210,99 310,46 425,66 576,24'],
      "charts/price-history-point": ['300', '55', '300', '55', '350', '10', '17 OCT', '$62.50'],
      "charts/shelf-stats-pie-markup": ['Collection breakdown', '<circle cx="50" cy="50" r="46"/><path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z"/>'],
      "charts/stats-pie-markup-2": ['<circle cx="50" cy="50" r="46"/><path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z"/>'],
    };
    const previewGrids = [...document.querySelectorAll(".preview-grid")];
    const colorInput = document.querySelector("#line-color");
    function sampleSvg(name, source) {
      const values = samples[name] || [];
      return source.replace(/\\{\\{(\\d+)\\}\\}/g, (token, index) => values[Number(index)] ?? "0");
    }
    function render(card) {
      const status = card.querySelector(".preview-status");
      const canvas = card.querySelector(".preview-canvas");
      try {
        const source = sampleSvg(card.dataset.name, card.querySelector(".source-editor").value);
        const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
        if (parsed.querySelector("parsererror")) throw new Error("Could not parse SVG markup");
        parsed.querySelectorAll("script, foreignObject").forEach(node => node.remove());
        parsed.querySelectorAll("*").forEach(node => [...node.attributes].forEach(attr => { if (/^on/i.test(attr.name)) node.removeAttribute(attr.name); }));
        const root = parsed.documentElement;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("viewBox", card.dataset.fragment === "true" ? card.dataset.viewbox : root.getAttribute("viewBox") || card.dataset.viewbox);
        if (card.dataset.fragment === "true") [...root.childNodes].forEach(node => svg.append(document.importNode(node, true)));
        else svg.innerHTML = root.innerHTML;
        canvas.replaceChildren(svg);
        status.textContent = "Preview updated";
        status.classList.remove("error");
      } catch (error) {
        canvas.replaceChildren();
        status.textContent = error.message;
        status.classList.add("error");
      }
    }
    document.querySelectorAll(".svg-card").forEach(card => {
      const editor = card.querySelector(".source-editor");
      editor.addEventListener("input", () => render(card));
      card.querySelector(".download-source").addEventListener("click", () => {
        const blob = new Blob([editor.value], { type: "image/svg+xml;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = card.dataset.name.split("/").at(-1) + ".svg";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      });
      render(card);
    });
    document.querySelector("#white-lines").addEventListener("change", event => previewGrids.forEach(grid => grid.classList.toggle("force-white", event.target.checked)));
    colorInput.addEventListener("input", event => document.documentElement.style.setProperty("--preview-line", event.target.value));
    document.querySelector("#asset-count").textContent = document.querySelectorAll(".svg-card").length + " assets";
  </script>
</body>
</html>
`;

await mkdir(path.join(root, "assets/svg"), { recursive: true });
await writeFile(path.join(root, "assets/svg/preview.html"), html);
console.log(`Built SVG preview (${names.length} assets).`);

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
