import { readFileSync } from "node:fs";
import { initTools, listManifests } from "geolibre-wasm/tools";
await initTools(readFileSync(new URL("../node_modules/geolibre-wasm/geolibre-cli.wasm", import.meta.url)));
const t = performance.now();
const m = await listManifests();
console.log("manifests", m.length, Math.round(performance.now() - t), "ms");
console.log(JSON.stringify(m.find((x) => x.id === "slope"), null, 1).slice(0, 1500));
const cats = {}; for (const x of m) cats[x.category] = (cats[x.category] || 0) + 1; console.log(cats);
