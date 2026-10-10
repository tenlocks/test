# D2 PoC — 阶段 1 结论（Linux 云容器，2026-10-10）

## 范围（诚实声明）
阶段 1 只证明 **"geolibre-wasm + 自己写的薄 UI + Vite 子目录构建"这条链路能跑通**。
**还没有**把 GeoLibre 自带的 `ProcessingDialog.tsx` / `ParameterField.tsx` 移植过来 —— 那是阶段 2，
也是决定 D2 工作量的关键部分，尚未验证。

## 已验证（有命令输出为证）
| 项 | 结果 |
|---|---|
| `git clone --depth 1` | 4 秒（本环境网络快，Windows 上 ~3 分钟的数据不适用） |
| `npm install`（仅 geolibre-wasm、geotiff、vite、typescript） | 25 包 / 6.6 秒 |
| Node 无头 `listTools()` | 1065 个工具（非 1069），33 ms，仅返回名字 |
| `listManifests()` | 1065 个，**4.2 秒**（Node）；含完整参数 schema（enum / scalar / input / output） |
| Node 无头 `runTool("slope")` | exit 0，64×64 DEM，64 ms |
| `vite build` | 2.7 秒；JS 83 KB + 两个 wasm（6.5 MB + 23.8 MB，gzip 后 2.0 + 8.0 MB） |
| Chromium E2E（子路径 `/compute/toolbox/`，`base: "./"`） | 就绪 6.3 秒；上传 DEM → 表单 → 运行 116 ms → 下载 `out_slope.tif` |
| 输出数值 | 均值 1.589°，理论 ≈1.6°（50°N 下 2 m / 71.5 m）；地理参考保留 |

复现：`cd poc && npm i && npm run build`，再用任意静态服务器（需 `.wasm` → `application/wasm`）
托管 `dist/`，`node scripts/e2e.mjs <url>`。

## 依赖图发现（对 D2 估工的含义）
- 以 `ProcessingDialog.tsx` 为入口的朴素 import 闭包 = **660 个文件**（含 `packages/map` 140、`plugins` 278）。
  但这是 barrel（index.ts 转出）和无关 import 放大的结果，不是真实耦合：
  - `ProcessingDialog` 对 map 只用 `getLayerBounds` + `MapEngine` 类型。
  - `plugins` 来自 `components/layout/add-data/constants.ts`，与工具箱无关。
  - `maplibre-gl` 仅被 `lib/print-extent.ts`（在地图上画范围框）引用。
  - tauri / duckdb 引用集中在 `lib/file-io/*`、`lib/sidecar.ts`、`lib/duckdb-*`。
- `@geolibre/core` 依赖很轻（style-spec、uuid、zundo、zustand），**不拉 maplibre**，可整包复制。
- `@geolibre/processing` 对 core 有真实依赖（`GeoLibreLayer`、`horizontalBbox` 等），不能只拿 processing。
- **真正的耦合点是 `useAppStore`（图层 store）**：ProcessingDialog 从它读输入图层、把结果作为图层写回、
  控制开关。独立版需要替换成 "上传文件 / 结果下载" 的适配层 —— 这是阶段 2 的主要工作。

## 环境/部署风险（需在真实环境确认）
- `geolibre-wasm` 用 `WebAssembly.compileStreaming(fetch(...))`，**要求 `.wasm` 返回 `application/wasm`**。
  Tomcat 是否默认映射需实测，否则在 web.xml 加 mime-mapping。
- 24 MB 的 cli.wasm 首次加载是内网体验的关键，需开启压缩 / 缓存头。
- 本 PoC 在主线程跑 `runTool`；大数据需像 GeoLibre 一样放进 Worker。
- 未在 Windows、未在 Tomcat 上验证。

## 阶段 2 计划
复制 `packages/{core,processing,ui}` + `ParameterField` 等，用 store 适配层替换 `useAppStore`，
stub 掉 map / tauri / duckdb，统计真实需要改动的文件数与耗时，再给出人天估算。
