// Headless smoke test: synthetic DEM -> listTools -> runTool("slope")
import { readFileSync } from "node:fs";
import { writeArrayBuffer } from "geotiff";
import { listTools, runTool, initTools } from "geolibre-wasm/tools";

const W = 64, H = 64;
const data = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = 100 + x * 2 + Math.sin(y / 6) * 5;
const tiff = await writeArrayBuffer(data, {
  width: W, height: H, GTRasterTypeGeoKey: 1, GTModelTypeGeoKey: 2, GeographicTypeGeoKey: 4326,
  ModelPixelScale: [0.001, 0.001, 0], ModelTiepoint: [0, 0, 0, 10, 50, 0], GDAL_NODATA: "-9999",
});
const dem = new Uint8Array(tiff);
console.log("dem bytes", dem.length);

await initTools(readFileSync(new URL("../node_modules/geolibre-wasm/geolibre-cli.wasm", import.meta.url)));
let t = performance.now();
const tools = await listTools();
console.log("tools:", tools.length, "in", Math.round(performance.now() - t), "ms; sample:", JSON.stringify(tools[0]).slice(0, 300));
t = performance.now();
const res = await runTool("slope", { args: ["--input=/work/dem.tif", "--output=/work/slope.tif", "--units=degrees"], input: { "dem.tif": dem } });
console.log("exit", res.exitCode, "files", Object.keys(res.files), Object.values(res.files).map((f) => f.length), Math.round(performance.now() - t), "ms");
console.log(res.stdout.slice(-5));
