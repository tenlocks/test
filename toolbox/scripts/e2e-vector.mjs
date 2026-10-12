// E2E (vector): upload a GeoJSON through the dialog, run a vector tool, download the result from the Results panel.
// Usage: TOOL="Buffer Vector" node scripts/e2e-vector.mjs <url> [out-dir]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const url = process.argv[2]; const out = process.argv[3] || "./e2e-out"; mkdirSync(out, { recursive: true });
const TOOL = process.env.TOOL || "Buffer Vector";
const pts = { type: "FeatureCollection", features: [[10.01, 50.01], [10.03, 50.02], [10.05, 50.04]].map((c, i) => ({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: c } })) };
writeFileSync(`${out}/points.geojson`, JSON.stringify(pts));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
p.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
await p.goto(url);
await p.waitForFunction(() => /All \(\d{3,}\)/.test(document.body.innerText), null, { timeout: 60000 });
await p.getByPlaceholder(/search tools/i).fill(TOOL); await p.waitForTimeout(400);
await p.getByText(TOOL, { exact: true }).first().locator("xpath=ancestor::button[1]").click();
const [ch] = await Promise.all([p.waitForEvent("filechooser"), p.locator('button[title*="input" i]').first().click()]);
await ch.setFiles(`${out}/points.geojson`); await p.waitForTimeout(500);
// distance field: set a small buffer if one is shown
// Vector layers are read as WGS84, so the buffer distance is in degrees: 0.01 deg ~ 1 km.
await p.locator('xpath=//*[starts-with(normalize-space(text()),"Distance:")]/following::input[1]').fill("0.01");
await p.screenshot({ path: `${out}/before.png` });
await p.getByRole("button", { name: /^Run$/ }).first().click();
await p.waitForFunction(() => /Succeeded|Failed/.test(document.body.innerText), null, { timeout: 90000 });
await p.waitForTimeout(1000);
console.log("results bar:", (await p.getByTestId("results").innerText()).replace(/\n+/g, " | "));
await p.screenshot({ path: `${out}/after.png` });
const [dl] = await Promise.all([p.waitForEvent("download"), p.getByTestId("download-geojson").first().click()]);
const f = `${out}/${dl.suggestedFilename()}`; await dl.saveAs(f);
const fc = JSON.parse(readFileSync(f, "utf8"));
console.log("downloaded", dl.suggestedFilename(), "features:", fc.features.length, "geom:", [...new Set(fc.features.map((x) => x.geometry.type))]);
if (!fc.features.length) throw new Error("empty result");
console.log("E2E VECTOR PASS"); await b.close();
