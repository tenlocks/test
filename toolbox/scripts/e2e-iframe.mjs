// E2E: open the Vue 2.6 host page, run Slope inside the toolbox <iframe>, check the downloaded GeoTIFF.
// Usage: node scripts/e2e-iframe.mjs http://localhost:8090/portal/ [out-dir]
import { chromium } from "playwright";
import { writeArrayBuffer, fromArrayBuffer } from "geotiff";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const url = process.argv[2]; const out = process.argv[3] || "./e2e-out"; mkdirSync(out, { recursive: true });
const W = 64, H = 64, d = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = 100 + x * 2 + Math.sin(y / 6) * 5;
writeFileSync(`${out}/dem.tif`, Buffer.from(await writeArrayBuffer(d, { width: W, height: H, GTRasterTypeGeoKey: 1, GTModelTypeGeoKey: 2, GeographicTypeGeoKey: 4326, ModelPixelScale: [0.001, 0.001, 0], ModelTiepoint: [0, 0, 0, 10, 50, 0] })));

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
p.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));
p.on("response", (r) => r.status() >= 400 && console.log("[http", r.status() + "]", r.url()));
await p.goto(url);
console.log("host:", (await p.textContent("#ver")).trim());
const f = p.frameLocator("#tb");
await f.locator("select option[value=All]").first().waitFor({ state: "attached", timeout: 60000 });
await p.waitForFunction(() => /（[1-9]\d{2,}）|\([1-9]\d{2,}\)/.test(document.querySelector("#tb").contentDocument.body.innerText), null, { timeout: 60000 });
console.log("iframe catalog:", (await f.locator("select option[value=All]").first().textContent()).trim());
await f.getByPlaceholder(/search tools|搜索工具/).fill("Slope"); await p.waitForTimeout(400);
await f.getByText("Slope", { exact: true }).first().locator("xpath=ancestor::button[1]").click();
const [ch] = await Promise.all([p.waitForEvent("filechooser"), f.locator('button[title*="输入"], button[title*="input" i]').first().click()]);
await ch.setFiles(`${out}/dem.tif`); await p.waitForTimeout(500);
const dl = []; p.on("download", async (x) => { const path = `${out}/${x.suggestedFilename()}`; await x.saveAs(path); dl.push(path); });
await f.getByRole("button", { name: /^运行$|^Run$/ }).first().click();
await f.getByText(/成功|Succeeded/).first().waitFor({ timeout: 90000 }); await p.waitForTimeout(1500);
const tif = dl.find((x) => x.endsWith(".tif")); if (!tif) throw new Error("no .tif downloaded from the iframe");
const buf = readFileSync(tif); const img = await (await fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))).getImage();
const r = (await img.readRasters())[0]; let sum = 0; for (const v of r) sum += v; const mean = sum / r.length;
console.log("downloaded", tif, "mean slope", mean.toFixed(3), "deg (expected ~1.6)");
if (Math.abs(mean - 1.6) > 0.2) throw new Error("slope values out of range");
console.log("IFRAME E2E PASS"); await b.close();
