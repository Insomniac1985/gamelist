// SVG definitions live in assets/icons and assets/charts. The generated catalog
// loads them in one request, while preserving per-path CSS and chart interaction.
const templates = new Map();
let pending;

export function loadSvgAssets(read = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load SVG assets");
  return response.text();
}) {
  return pending ||= read(new URL("./assets/svg/catalog.svg", import.meta.url)).then(source => {
    for (const match of source.matchAll(/<!-- asset:([\w/-]+):(full|fragment) -->\s*([\s\S]*?)\s*<!-- \/asset -->/g)) {
      const markup = match[2] === "fragment"
        ? match[3].replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>$/, "")
        : match[3];
      templates.set(match[1], markup);
    }
    if (!templates.size) throw new Error("SVG catalog is empty");
  }).catch(error => { pending = null; throw error; });
}

// Values are trusted markup or already escaped by the calling view, just as
// their original template literals were. User text must be escaped before use.
export function svgAsset(name, values = []) {
  const template = templates.get(name);
  if (template == null) throw new Error(`SVG asset not loaded: ${name}`);
  return template.replace(/\{\{(\d+)\}\}/g, (_, index) => String(values[Number(index)] ?? ""));
}

export function hydrateSvgAssets(root) {
  root.querySelectorAll("[data-svg-asset]").forEach(placeholder => {
    placeholder.outerHTML = svgAsset(placeholder.dataset.svgAsset);
  });
}
