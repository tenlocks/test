// E2E against a built/served toolbox: search "slope", upload a synthetic DEM through the
// dialog's own file picker, run in WASM, and assert a downloadable GeoTIFF came out.
// Usage: node scripts/e2e.mjs <url> [out-dir]
import { chromium } from "playwright";
import { writeArrayBuffer, fromArrayBuffer } from "geotiff";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const url = process.argv[2]; const out = process.argv[3] || "./e2e-out";
const TOOL = process.env.TOOL || "Slope"; // exact tool title shown in the list
const CHECK_SLOPE = TOOL === "Slope"; mkdirSync(out, { recursive: true });
const W = 64, H = 64, d = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = 100 + x * 2 + Math.sin(y / 6) * 5;
const dem = Buffer.from(await writeArrayBuffer(d, { width: W, height: H, GTRasterTypeGeoKey: 1, GTModelTypeGeoKey: 2, GeographicTypeGeoKey: 4326, ModelPixelScale: [0.001, 0.001, 0], ModelTiepoint: [0, 0, 0, 10, 50, 0] }));
writeFileSync(`${out}/dem.tif`, dem);

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
p.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
p.on("response", (r) => r.status() >= 400 && console.log("[http", r.status() + "]", r.url()));
await p.goto(url);
await p.getByPlaceholder(/search tools|搜索/i).waitFor({ timeout: 60000 });
await p.waitForFunction(() => /All \(\d{3,}\)/.test(document.body.innerText), null, { timeout: 60000 });
console.log("catalog:", (await p.innerText("body")).match(/All \(\d+\)/)[0]);
await p.getByPlaceholder(/search tools|搜索/i).fill(TOOL);
await p.waitForTimeout(500);
await p.getByText(TOOL, { exact: true }).first().locator("xpath=ancestor::button[1]").click();
const title = (await p.locator("h2, h3").filter({ hasText: new RegExp("^" + TOOL + "$") }).first().innerText()).trim();
console.log("selected:", title);
if (title !== TOOL) throw new Error("wrong tool selected: " + title);
// first FolderOpen button = DEM input
const [chooser] = await Promise.all([p.waitForEvent("filechooser"), p.locator('button[title*="input" i], button[title*="输入"]').first().click()]);
await chooser.setFiles(`${out}/dem.tif`);
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/before-run.png` });
const downloads = []; p.on("download", async (dl) => { const f = `${out}/${dl.suggestedFilename()}`; await dl.saveAs(f); downloads.push(f); });
await p.getByRole("button", { name: /^Run$|运行/ }).first().click();
await p.waitForFunction(() => /succeeded|completed|Download|下载|\.tif/i.test(document.body.innerText), null, { timeout: 90000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/after-run.png` });
console.log("page text after run:", (await p.innerText("body")).split("\n").filter((l) => /succe|complet|error|fail|tif|download|下载/i.test(l)).slice(0, 8).join(" | "));
console.log("downloads:", downloads);
const tif = downloads.find((f) => f.endsWith(".tif"));
if (!tif) throw new Error("no .tif download was produced");
const buf = readFileSync(tif); const img = await (await fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))).getImage();
const r = (await img.readRasters())[0]; let sum = 0; for (const v of r) sum += v;
console.log(`result ${img.getWidth()}x${img.getHeight()} mean = ${(sum / r.length).toFixed(3)}`);
if (CHECK_SLOPE && Math.abs(sum / r.length - 1.6) > 0.2) throw new Error("slope values out of range");
if (!(img.getWidth() === 64 && img.getHeight() === 64)) throw new Error("unexpected raster size");
console.log("E2E PASS");
await b.close();
