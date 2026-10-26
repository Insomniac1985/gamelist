import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function files(folder) {
  const entries = await readdir(path.join(root, "assets", folder), { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(folder + "/" + entry.name)
    : entry.name.endsWith(".svg") ? [folder + "/" + entry.name] : []));
  return groups.flat();
}
const names = (await Promise.all([files("icons"), files("charts")])).flat().sort();
const entries = await Promise.all(names.map(async name => {
  const source = (await readFile(path.join(root, "assets", name), "utf8")).trim();
  const kind = source.includes('data-svg-fragment="true"') ? "fragment" : "full";
  return `<!-- asset:${name.slice(0, -4)}:${kind} -->\n${source}\n<!-- /asset -->`;
}));
await mkdir(path.join(root, "assets/svg"), { recursive: true });
await writeFile(path.join(root, "assets/svg/catalog.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><defs>\n${entries.join("\n")}\n</defs></svg>\n`);
console.log(`Built SVG catalog (${names.length} assets).`);
