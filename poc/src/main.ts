import { initTools, listManifests, runTool } from "geolibre-wasm/tools";
import type { ToolManifest, ToolParam } from "geolibre-wasm/tools";

const $ = (id: string) => document.getElementById(id)!;
const log = (s: string) => { $("log").textContent += s + "\n"; };
let manifests: ToolManifest[] = [];
const files: Record<string, Uint8Array> = {};

function renderList(filter = "") {
  const f = filter.toLowerCase();
  const items = manifests.filter((m) => !f || m.id.includes(f) || m.display_name.toLowerCase().includes(f)).slice(0, 300);
  $("list").replaceChildren(...items.map((m) => {
    const d = document.createElement("div");
    d.textContent = `${m.display_name}  · ${m.category ?? ""}`;
    d.dataset.id = m.id;
    d.onclick = () => openTool(m);
    return d;
  }));
}

function field(m: ToolManifest, p: ToolParam): HTMLElement {
  const wrap = document.createElement("div");
  const schema = (p.schema ?? {}) as any;
  const label = document.createElement("label");
  label.textContent = p.name + (p.required ? " *" : "");
  wrap.append(label);
  let input: HTMLInputElement | HTMLSelectElement;
  if (p.io_role === "input" || schema.kind === "input") {
    input = document.createElement("input"); input.type = "file";
    input.onchange = async () => {
      const f = (input as HTMLInputElement).files?.[0]; if (!f) return;
      files[f.name] = new Uint8Array(await f.arrayBuffer()); input.dataset.fname = f.name;
    };
  } else if (schema.kind === "enum") {
    input = document.createElement("select");
    for (const o of schema.options) input.append(new Option(o.label ?? o.value, o.value));
  } else {
    input = document.createElement("input");
    input.type = schema.kind === "scalar" ? "number" : "text";
    if (input.type === "number") input.step = "any";
    const dv = (m.defaults as any)?.[p.name]; if (dv !== undefined) input.value = String(dv);
  }
  input.dataset.param = p.name; input.dataset.role = String(p.io_role ?? ""); input.dataset.kind = String(p.data_kind ?? "");
  wrap.append(input);
  if (p.description) { const s = document.createElement("small"); s.textContent = String(p.description); wrap.append(s); }
  return wrap;
}

function openTool(m: ToolManifest) {
  $("title").textContent = `${m.display_name} (${m.id})`;
  $("out").replaceChildren(); $("log").textContent = "";
  const form = $("form"); form.replaceChildren();
  // 输出路径参数由运行器自动分配,不在表单里展示
  for (const p of m.params) if (p.io_role !== "output" && p.data_kind !== "file") form.append(field(m, p));
  const btn = document.createElement("button"); btn.id = "run"; btn.textContent = "运行 Run";
  btn.onclick = () => run(m); form.append(btn);
}

async function run(m: ToolManifest) {
  const args: string[] = []; const input: Record<string, Uint8Array> = {};
  for (const el of $("form").querySelectorAll<HTMLInputElement>("[data-param]")) {
    const name = el.dataset.param!;
    if (el.dataset.role === "input" || el.type === "file") {
      const fname = el.dataset.fname; if (!fname) continue;
      input[fname] = files[fname]; args.push(`--${name}=/work/${fname}`);
    } else if (el.value !== "") args.push(`--${name}=${el.value}`);
  }
  const outParam = m.params.find((p) => p.io_role === "output" || p.data_kind === "file");
  if (outParam) args.push(`--${outParam.name}=/work/out_${m.id}.tif`);
  log("args: " + args.join(" ")); const t0 = performance.now();
  try {
    const r = await runTool(m.id, { args, input });
    log(`exit=${r.exitCode} ${(performance.now() - t0).toFixed(0)}ms`); r.stdout.slice(-5).forEach(log);
    $("out").replaceChildren(...Object.entries(r.files).map(([name, bytes]) => {
      const a = document.createElement("a"); a.textContent = `下载 ${name} (${bytes.length} B)`; a.className = "dl";
      a.href = URL.createObjectURL(new Blob([bytes as BlobPart])); a.download = name.split("/").pop()!; a.style.display = "block"; return a;
    }));
  } catch (e) { log("ERROR " + e); }
}

(async () => {
  $("status").textContent = "加载 wasm + 工具清单…";
  const t0 = performance.now();
  await initTools(); manifests = await listManifests();
  $("status").textContent = `${manifests.length} tools (${((performance.now() - t0) / 1000).toFixed(1)}s)`;
  renderList(); ($("q") as HTMLInputElement).oninput = (e) => renderList((e.target as HTMLInputElement).value);
  (window as any).__ready = true;
})();
