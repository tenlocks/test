# GeoLibre 工具箱剥离（D2 方案）——可行性验证结论与后续计划

> 本文是**交接文档**：写给接手的 Agent / 同事，用来在我已做的验证基础上继续做调研结论、计划制定和向领导汇报。
> 先读第 0、1 节再决定读什么；不要重复做第 3 节里已经标 **[实测]** 的事。

## 证据等级（全文统一使用）

| 标记 | 含义 |
|---|---|
| **[实测]** | 我实际运行过，有命令输出为证，可用第 11 节的命令复现 |
| **[读码]** | 我读过上游源码得出，没有运行验证 |
| **[推断]** | 我的判断，没有验证。接手后应当当作假设而不是事实 |
| **[未验证]** | 完全没有碰过 |

---

## 0. 给接手者的说明

**你要做的事**：基于本文的验证结果，做三件事——① 补齐调研结论（尤其第 6、7 节的缺口）；② 制定详细计划；③ 整理给领导的汇报。

**关键背景**
- 产品：一个 **Vue 2.6** 的“计算中心”，部署在 **Tomcat**。目标是把 GeoLibre 里基于 WhiteboxTools 的**工具箱 UI**（算法 + 参数表单 + 结果下载）集成进去。
- D2 方案：从 GeoLibre monorepo 物理裁剪出工具箱，产出独立 Vite 构建产物，挂到 Tomcat 作为独立 webapp。
- 两个已有估值：**5~12 天**（基于“深度耦合 MapLibre”的假设）和 **2~3 天**（另一位同事快速扫 import 关系）。本次任务是独立验证这个数。
- 用户环境：Windows 10 Enterprise LTSC，Node v25.7.0，npm 11.10.1，Git Bash。
- **我的环境不同**：Linux 云容器，Node 22.22.0，Chromium（无头），JDK 21，Tomcat 9.0.100。所以**所有实测都没有在 Windows 上做过**。

**仓库**：`https://github.com/tenlocks/test`，分支 `claude/happy-knuth-krcnht`（未合并到默认分支，也没有开 PR）。

```
docs/                 本文
poc/                  阶段 1：最小 PoC（自写薄 UI，只用 geolibre-wasm）
toolbox/              阶段 2：从 GeoLibre 裁剪出的独立工程（React 19 + Vite）  ← 主要产物
tomcat-demo/          自带 Tomcat 9 + Vue 2.6 示例宿主页 + 已构建的工具箱，start.bat / start.sh 启动
```

**上游基线**：`opengeos/geolibre`，commit `839a24d`（2026-10-10），版本 3.3.0，3105 个文件，MIT 许可。

---

## 1. 结论速览（可直接用于汇报的部分）

1. **可行，且比担心的容易。** [实测] 工具箱已经被剥离成独立工程，1069 个工具全部加载，栅格/矢量工具在浏览器里本地跑通，并已在真实 Tomcat 9 + Vue 2.6.14 的 iframe 里验证。
2. **“深度耦合 MapLibre”不成立。** [实测+读码] 工具箱对地图只用了 1 个函数 + 1 个类型；真正的耦合在**图层 store**（`useAppStore`），而 store 所在的 `@geolibre/core` 不依赖 maplibre，可整包复制。
3. **改动极小。** [实测] 170 个上游文件原样复制（含 3198 行的 `ProcessingDialog.tsx`，一行未改），**上游代码只改 1 个文件、1 处补丁**，自己新写约 450 行（含测试脚本）。
4. **但“能显示、能用”≠“和平台打通”。** 目前没有用户/数据接口：输入靠用户选本地文件，输出靠浏览器下载。这是后续最大的工作量和不确定项。
5. **工作量（估计，不是测量）**：纯裁剪 1.5~2 人天（已完成）；到“可用的嵌入版”还需约 **3.5~6 人天**。详见第 8 节及其假设。
6. **需要领导/业务确认的核心问题**：只要 Whitebox 的 1069 个工具够不够？数据从哪里来、结果存到哪里？是否必须纯浏览器计算（数据规模）？见第 10 节。
7. **主要风险**：上游迭代快（同步成本）；浏览器端大数据能力未压测；首屏约 6 秒；Windows 目标环境未验证。见第 9 节。

---

## 2. 方案与架构（已实现的样子）

```
Vue 2.6 页面 (Tomcat: /portal/)
  └── <iframe src="../toolbox/?lang=zh">          同源静态页，React 19 + Tailwind，样式/脚本隔离
        ├── GeoLibre 原版 ProcessingDialog（Whitebox 工具箱 UI）
        ├── @geolibre/core / processing / ui      原样复制
        ├── 4 个 shim（替换 Tauri/DuckDB/地图相关模块）
        └── Web Worker ──► geolibre-wasm（WhiteboxTools 的 WASM 版，1069 个工具）
                           全部在用户浏览器里计算，无后端，数据不出浏览器
```

关键特征：
- **纯静态产物**：`dist/` 拷成 `webapps/toolbox/` 即可，`base: "./"` 相对路径，可改任意目录名。
- **无后端、无用户概念**：所有计算在浏览器，因此“用户/权限”不需要改工具箱，复用 Tomcat/平台现有鉴权保护 `/toolbox/` 路径即可 **[推断]**。
- 为什么用 iframe 而不是 Vue 组件：工具箱是 React 19 + Tailwind，Tailwind 的全局样式重置会污染 Vue 页面；iframe 天然隔离。**[推断]**——“在 Vue 里直接挂载 React”我没有试过。

---

## 3. 验证过程与证据

### 3.1 阶段 1：最小 PoC（`poc/`）

自写一个 ~80 行页面，只用 `geolibre-wasm`，验证链路可行。

| 项 | 结果 | 等级 |
|---|---|---|
| `git clone --depth 1` GeoLibre | 4 秒（用户环境曾测 ~3 分钟，网络差异） | [实测] |
| `npm install`（geolibre-wasm、geotiff、vite） | 25 包 / 6.6 秒 | [实测] |
| Node 无头 `listTools()` | 1065 个，33 ms，只返回名字 | [实测] |
| `listManifests()` | 1065 个，**4.2 秒**（Node），含完整参数 schema | [实测] |
| Node 无头 `runTool("slope")` | exit 0，64×64 DEM，64 ms | [实测] |
| `vite build` | 2.7 秒；JS 83 KB + 2 个 wasm（6.5 MB + 23.8 MB） | [实测] |
| Chromium 子路径部署 `/compute/toolbox/` | 加载、运行 116 ms、下载成功 | [实测] |

### 3.2 依赖图分析（回答“耦合到底多深”）

以 `apps/geolibre-desktop/src/components/processing/ProcessingDialog.tsx` 为入口，用我写的脚本做 import 闭包。

| 口径 | 文件数 | 说明 |
|---|---|---|
| 朴素闭包（含所有 workspace 包） | **660**（10.7 MB） | 含 `plugins` 278、`map` 140、`core` 83、`processing` 44、`ui` 18、app ~97 |
| 只看 app 层 | **97**（1.15 MB） | |
| 替换 4 个“咽喉模块”之后 | **约 26**（365 KB） | |

**4 个“咽喉模块”**——它们把 ~70 个无关文件拖进来，每个都用小 shim 替换：

| 原模块 | 拖进来的东西 | 替换为 |
|---|---|---|
| `lib/tauri-io.ts` | `file-io/` 下 ~69 个文件（Tauri、DuckDB、KML、项目文件…） | 浏览器分支的 6 个函数（`<input type=file>`） |
| `lib/sidecar.ts` | Tauri `invoke` 启动 Python sidecar | 抛“不可用”，对话框自动走 WASM |
| `hooks/useWhiteboxSemanticSearch.ts` | 需要托管的向量检索端点 | 返回“不可用”，保留普通搜索 |
| `lib/print-extent.ts` | 在 MapLibre 上画范围框 | no-op（无地图） |

另有 `@geolibre/map` 的替身（`getLayerBounds` 原样复制 + `MapEngine` 类型）。

对已知事实的核对：
- `@geolibre/core` 依赖只有 style-spec、uuid、zundo、zustand，**不依赖 maplibre** [实测]，所以整包复制成本低。
- `@geolibre/processing` 对 `core` 有真实依赖（`GeoLibreLayer`、`horizontalBbox` 等），**不能只拿 processing** [读码]。
- `ProcessingDialog` 对 `@geolibre/map` 只用 `getLayerBounds` + `MapEngine` 类型 [读码]。
- 朴素闭包里 `components/layout/add-data/constants.ts` 引入 `@geolibre/plugins`（278 文件），与工具箱无关 [读码]。

> **分析方法的坑**：我的第一版统计把 `import type`（编译后擦除）也算进去，高估了 `processing-params` 的子树（78 → 实际很小）。接手者复用我的数字时请以“替换后约 26 个文件”为准。

### 3.3 阶段 2：物理裁剪（`toolbox/`）

| 度量 | 数值 | 等级 |
|---|---|---|
| 原样复制的上游文件 | **170**（packages 145 + app 25，含 `ProcessingDialog.tsx` 3198 行） | [实测] |
| 被修改的上游文件 | **1**（`packages/processing/src/wasm-client.ts`，搜 `PATCH(toolbox)`） | [实测] |
| 新写代码 | ~450 行（`App.tsx` 90、4 个 shim 约 140、i18n/配置/测试脚本） | [实测] |
| 类型检查错误（首次） | **5 个**（2 个编译期全局变量 + 1 个漏拷的小文件），修完后 0 | [实测] |
| `npm install` | 235~243 包，6~35 秒 | [实测] |
| `vite build` | 3.5~4.3 秒 | [实测] |
| i18n | 从 518 KB 的 en.json 抽出 `common/processing/toolbar` 三个顶层 key（en+zh 各约 110 KB） | [实测] |

### 3.4 功能验证（Chromium，用 GeoLibre **原版对话框**，不是我重写的 UI）

| 用例 | 结果 | 等级 |
|---|---|---|
| 工具目录载入 | “全部（1069）”，分类树完整 | [实测] |
| Slope（栅格） | 输出 64×64 GeoTIFF，平均坡度 **1.589°**，理论 ≈1.6° | [实测] |
| Aspect（栅格） | 平均 268.8°；DEM 向东升高，坡面朝西 ≈270° | [实测] |
| Hillshade（栅格） | 平均 16911；我认为 Whitebox 的 hillshade 是 0~32767 缩放，**这一点我凭记忆，没核对** | [实测]+[推断] |
| Buffer Vector（矢量） | 3 个点 → 3 个 Polygon，GeoJSON 下载成功 | [实测] |
| 中文界面 | 对话框控件全中文；**工具名/描述保持英文**（来自上游目录） | [实测] |
| 在 Vite dev、build+preview、Tomcat 三种方式下 | 均通过 | [实测] |
| 全新克隆（无 .git 的纯目录副本）`npm install` + `npm start` | 通过 | [实测] |

### 3.5 部署验证：真实 Tomcat 9.0.100 + Vue 2.6.14 iframe

| 项 | 结果 | 等级 |
|---|---|---|
| `.wasm` 的 `Content-Type` | Tomcat 9.0.100 默认 `web.xml` **已带** `application/wasm` 映射 | [实测] |
| 默认是否压缩 | **不压缩**，主 wasm 原样 23.8 MB；也没有缓存头 | [实测] |
| 开 gzip（`compression="on"` + `compressibleMimeType` 加 `application/wasm`） | 主 wasm **23.8 → 7.9 MB** | [实测] |
| 全部资源 | 47.9 MB → 14.6 MB（gzip） | [实测] |
| 首屏实际下载 | CSS + 主 JS + 目录快照 + tools.js + 主 wasm ≈ **9 MB（gzip）**；14 MB 的 ONNX 运行时按需加载 | [实测] |
| 缓存头 | `WEB-INF/web.xml` 的 ExpiresFilter：资源 1 年，`index.html` 每次校验（`dist/` 自带） | [实测] |
| Vue 2.6.14 页面里 iframe 嵌入，同一 Tomcat | 加载、运行 Slope、下载均通过 | [实测] |
| 首屏耗时（localhost） | 目录出现冷缓存 **6.2 秒**，缓存预热后仍 **5.5 秒** | [实测] |

> 首屏 5.5 秒预热后几乎不降，说明**瓶颈是 wasm 编译 + 生成工具清单，不是下载**；带宽再好也省不掉。这个原因是我从“预热后仍慢”**推断**的，没有分段计时 [推断]。

---

## 4. 发现的问题和坑（只靠 import 分析发现不了的）

1. **运行时 `fetch` 的静态资源**：`public/whitebox-catalog-snapshot.json`（1 MB）不是 import，依赖图看不到。缺它会 404（页面仍可用，但元数据不完整）。 [实测]
2. **矢量结果写进图层 store**：对话框调用 `addGeoJsonLayer`，宿主没有图层列表就“成功了但拿不到结果”。我在宿主页顶栏加了“结果条”提供下载。 [实测]
3. **浮动对话框是 `position: fixed`**：会盖住宿主 UI（我的第一版结果面板被盖住，点不到）。 [实测]
4. **上游 `slope` 的输出 bug**：1065 个工具里**只有 `slope`** 的输出声明为裸 “Optional output path” 且输入为栅格；输出留空时回退到 `.dat`，WhiteboxTools 按扩展名选格式，`.dat` 会写成 **ENVI（`.hdr`/`.img`）**，名为 `slope_output.dat` 的文件根本不存在，对话框显示 Succeeded 却没有任何结果。我打了补丁（`wasm-client.ts`，该类输出默认 `.tif`）。 [实测]
   - 在 geolibre-wasm 1.5.9 与 1.6.0 上行为一致 [实测]；上游原版应有同样问题（该文件是原样复制）[读码]，**尚未向上游反馈**。
   - 排查中我先怀疑是缺 catalog snapshot 导致，实测证伪（补上后依旧）。
5. **版本漂移**：`geolibre-wasm` 声明为 `^1.5.9`，会解析到 1.6.0，而上游 lockfile 锁 1.5.9。已用根 `package.json` 的 `overrides` 固定为 1.5.9。我的 `playwright` 同样要固定到 1.56.1（`^` 会解析到 1.64.0，其所需浏览器构建在我的环境里不存在）。 [实测]
6. **工具数不一致**：UI 显示 1069，`listManifests()` 只返回 1065。我曾推测差的 4 个是 GeoLibre 自己的工具（由 snapshot 合并进来），**没有验证** [推断]。
7. **输出交付路径分散**：栅格走 `onAddRaster` 回调（可拦截）；LiDAR 走 `onAddLidar`（可拦截）；矢量走 store 的 `addGeoJsonLayer`（要订阅 store）；**其余 `file_out`（报告、CSV、HTML 等）走 `ProcessingDialog.tsx` 内部的模块私有函数 `downloadBytes`（约第 170 行、第 1389 行调用），无法通过 props 拦截** [读码]。这对第 7 节的数据回传设计有直接影响。
8. **大小写不一致的许可证标签**：`license_tier` 为 `open`（1062 个）和 `Open`（3 个：`extract_cog_subset`、`extract_wms_subset`、`extract_xyz_tile_subset`）。没有非开放分级。 [实测]

---

## 5. 当前能力边界

**能做**：在 Vue 页面里用 iframe 打开 Whitebox 工具箱；用户选本地文件 → 在浏览器本地计算（Web Worker，不冻结页面）→ 下载结果；中英文切换；同源部署在 Tomcat。

**不能做**：
- 输入不能由 Vue 页面/平台存储传入，只能用户手动选本地文件；
- 输出不会回传给 Vue 页面，只是浏览器下载（矢量在顶栏结果条）；
- 没有 `postMessage` 接口；没有用户身份、权限、审计；
- 只含 **Whitebox 工具箱这一个对话框**（见第 6 节范围缺口）。

---

## 6. 范围缺口：我没有移植的部分（接手者需要决策）

原任务描述工具箱 UI 在 `components/processing/` 下共 **32 个文件、440 KB**。**我只移植了其中 `ProcessingDialog`（Whitebox 工具箱）这一个对话框**，它覆盖 1069 个 Whitebox 工具。其余对话框**没有移植**，我只测了它们的依赖图耦合（用与上面相同的 4 个 stop 点，数字是**下界参考**，未真正裁剪）：

| 对话框 | 行数 | app 层闭包文件数 | 额外拖入的重依赖 |
|---|---|---|---|
| `NetworkToolsDialog` | 368 | 5 | 仅 `@geolibre/map` |
| `StatisticsToolsDialog` | 448 | 7 | 仅 `@geolibre/map` |
| `GeocodeDialog` | 407 | 5 | `@geolibre/map`、`plugins`（1 处） |
| `BatchToolsDialog` | 477 | 22 | DuckDB、sql.js、apache-arrow |
| `SegmentationDialog` | 451 | 22 | 同上 |
| `ObjectDetectionDialog` | 741 | 25 | 同上 |
| `VectorToolsDialog` | 673 | 26 | 同上 |
| `model-builder/ModelBuilderPanel` | 2601 | 31 | 同上 |
| `ConversionDialog` | 1849 | 40 | DuckDB、sql.js、maplibre-gl（导出） |
| `RasterToolsDialog` | 1074 | **115** | Tauri 多个插件、`plugins`、maplibre-gl、strands-agents… |
| `obia/ObiaWorkbenchPanel` | 71（+ 多文件） | **143** | 同上（耦合最深） |

- 多数对话框共用同一条 **DuckDB 矢量加载链**（`duckdb-vector-loader` 等），说明还有**至少 1 个未识别的“咽喉模块”**需要 shim [推断]。
- 最深耦合的是 `RasterToolsDialog` 和 OBIA 工作台，它们经 `lib/app-api.ts` 等触达地图。
- **决策点**：业务是否只需要 Whitebox 的 1069 个工具？如果还需要“矢量工具（Turf）/ 格式转换 / 批处理 / 模型构建器 / OBIA”，工作量要单独评估，不能套用本文的 1.5~2 天。

---

## 7. 后续工作包（建议顺序）

估算的口径见第 8 节。每个工作包给出：目标、做法、验收标准、风险。

### WP1：与平台打通——数据与用户（最大不确定项）

**目标**：输入由 Vue/平台提供，输出回传给 Vue/平台；知道“谁在用”。

**需要先回答的问题**（决定做法，见第 10 节）：数据放哪（对象存储/文件服务/数据库）？取数用什么鉴权（Cookie、Token、预签名 URL）？数据规模？

**设计选项**（我只做了分析，没有实现）：

| 选项 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A. 传 URL | Vue 通过 `postMessage` 或 URL 参数给出文件地址，工具箱/wasm 自己 fetch | 不经过 Vue 内存；`geolibre-wasm` 的 `runTool` 的 `input` 支持 http(s) URL 字符串 [读码] | **整文件下载，不支持 Range** [读码]；跨域要 CORS；**对话框能否直接接受 URL 作为输入参数我没有验证** [未验证] |
| B. 传字节 | Vue 取到数据后 `postMessage(ArrayBuffer, [transfer])`；工具箱把它登记为“已选文件”（对话框已有 `handlePickInputFile(s)` 路径，约第 1290 行）[读码] | 鉴权全在宿主；不要求 CORS | 大文件占两份内存 |
| C. 输出回传 | 工具箱把结果 `postMessage` 给 Vue，由 Vue 调平台 API 保存 | 与平台存储解耦 | 见下 |

**输出回传的实现约束**：第 4 节第 7 点——栅格/LiDAR 可通过 `onAddRaster`/`onAddLidar` 拦截，矢量需订阅 store，**其余 `file_out` 走模块私有的 `downloadBytes`，不能通过 props 拦截**。要么对 `ProcessingDialog.tsx` 做一个小补丁（增加一个可选的 `onOutputFile` 回调），要么在 iframe 内全局钩住 `URL.createObjectURL`/`<a download>` 点击（脆弱，不推荐）。**建议前者**，并按“补丁最小、集中在一处、写进 README”的方式管理（与现有的 1 处补丁一致）。[推断]

**消息协议建议**（草案，未实现）：`{ type: "init"|"input"|"result"|"error", id, name, mime, bytes|geojson }`；**必须校验 `event.origin`**，同源部署时可固定为本站 origin。

**用户**：工具箱本身不需要用户概念。鉴权用 Tomcat/平台现有机制保护 `/toolbox/`；若需要在结果里记录“谁运行的”，由 Vue 在收到结果时记录即可，或通过 `init` 消息把用户名传给工具箱显示。[推断]

**验收**：从平台选一个数据集 → 工具箱运行 → 结果出现在平台存储；用 Playwright 脚本（参考 `toolbox/scripts/e2e-iframe.mjs`）覆盖。

### WP2：目标环境验证（Windows / 真实 Tomcat / 内网）

- 用户的真实环境：Win10 LTSC、**Node 25.7.0**、**npm 11.10.1**。我只测了 Node 22.22.0（npm 10.9.x）；**Node 25 与 npm 11 下 `npm install`/`npm start`/`npm run build` 是否正常是 [未验证]**（Vite 8 对 Node 的最低版本要求我没有核对）。
- npm workspaces 在 Windows 上用目录联接（junction），**[未验证]**。`tomcat-demo/start.bat` 等**从未在 Windows 上运行过** [未验证]。
- 他们真实 Tomcat 的版本（8.5/9/10）、JDK、是否有反向代理/网关（要对 `application/wasm` 开 gzip 并保持 `Content-Type`）。
- 浏览器：只测了 Chromium。内网实际用什么浏览器和版本？（wasm、Worker、ONNX 的 SIMD/多线程要求）。ONNX 多线程需要跨源隔离头（COOP/COEP），不满足会降级单线程 [推断]，且只影响机器学习类工具。
- HTTPS、CSP、`X-Frame-Options`/`frame-ancestors` 对 iframe 的影响。

### WP3：首屏优化（可选）

现状：目录出现约 6 秒，与带宽无关。思路 [推断，均未验证]：构建期预生成工具清单（Node 里 `listManifests` 就要 4.2 秒）；清单缓存到 IndexedDB；流式编译；先渲染 UI 再异步加载目录；Service Worker 缓存 wasm。

### WP4：大数据与重型工具压测

- 浏览器端 WASM 受内存限制（上游注释写“约 4 GiB”）[读码]。**业务典型数据规模是多少？**（DEM 100 MB？LiDAR 数 GB？）若超限，需要评估**服务端执行**：上游有 Python sidecar（`backend/geolibre_server`），对话框有“Run locally (WASM)”开关可切换 [读码]。服务端路线需要部署 Python 服务，**我没有评估**。
- 重型工具（LiDAR、OBIA）、进度显示、取消、Worker 崩溃恢复都没有测。

### WP5：范围扩展（视第 6 节决策）

按对话框逐个评估并移植；先识别 DuckDB 矢量加载链的咽喉模块。

### WP6：产品化与维护策略

- **上游同步策略**：目前是“一次性拷贝快照”。上游迭代很快，每次同步要核对约 26 个文件 + shim 接口。选项：(a) 现状（快照 + 文档化的“原样/补丁/新增”清单）；(b) 写同步脚本，自动重新拷贝“原样文件”并报告漂移；(c) 研究能否直接依赖上游已发布的 npm 包——`@geolibre/core` 的 `package.json` 有 `publishConfig`，但 `processing`/`ui` 是 `private` [读码]，**是否可行未验证**。
- 反馈上游：`slope` 输出 bug；考虑给 `ProcessingDialog` 提一个 `onOutputFile` 回调的 PR（减少我们的补丁量）。
- 安全：iframe `sandbox` 属性、CSP、`postMessage` 的 origin 校验。
- i18n：工具名/描述目前只有英文（上游目录），中文只覆盖界面控件。
- 许可证审计（WP7）。

### WP7：许可证与合规审计

GeoLibre 本体 MIT；`geolibre-wasm` 声明 MIT 且是 `whitebox_next_gen` 的 WASM 构建 [读码]；工具 `license_tier` 全为 open [实测]。**但传递依赖的许可证（如 onnxruntime-web、dggal、s2js 等）和 `whitebox_next_gen` 本身的许可证我没有审计** [未验证]。建议跑一次许可证扫描并让法务/合规确认。

### WP8：测试与 CI

现有 4 个 Playwright 脚本（见第 11 节）可直接改成 CI 用例。建议补：shim 的单元测试、输出交付的回归测试（尤其 `slope` 补丁）、Windows 构建检查。

---

## 8. 工作量估算（人天，**估计不是测量**）

| 阶段 | 估算 | 状态 | 依据与置信度 |
|---|---|---|---|
| 依赖分析 + 纯裁剪 + 验证（达到本仓库当前状态） | 1.5~2 | **已完成** | 我在一个会话里做完，但含大量并行读码，**不能等同人天**；按“熟悉代码库的开发者”折算。置信度中 |
| iframe 嵌入 Vue 2.6 + Tomcat 部署（含 gzip/缓存） | ~0.5 | **已完成** | 实测 |
| WP1 数据与用户打通（postMessage 桥 + 小补丁 + 测试） | 1~2 | 未做 | 取决于第 10 节答案；**置信度低** |
| WP2 目标环境验证（Windows/Node 25/真实 Tomcat/内网浏览器） | 0.5~1 | 未做 | 置信度中；可能暴露意外 |
| WP4 大数据与重型工具压测 | ~1 | 未做 | 若发现需要服务端路线，**会显著增加** |
| WP6+WP7 产品化、同步策略、合规 | 1~1.5 | 未做 | 置信度低 |
| WP3 首屏优化 | 0.5~1 | 可选 | |
| **合计到“可用的嵌入版”**（不含 WP3、WP5） | **约 3.5~6** | | 在“只需要 Whitebox 工具箱、数据能在浏览器处理”的**假设**下 |

**假设**（任何一条不成立，数字都要重估）：
1. 只需要 Whitebox 的 1069 个工具（不含第 6 节的其他对话框）；
2. 业务数据能在浏览器内存里处理（无需服务端执行）；
3. 同源部署，数据接口能被前端以 Token/Cookie 访问；
4. 目标环境没有意外限制（Windows、浏览器版本、网关）。

**与两个旧估值的关系**：「2~3 天」对**纯裁剪**基本成立（我的实测 1.5~2）；「5~12 天」对纯裁剪偏高（它依据的“深度耦合 MapLibre”不成立），但作为“含集成与加固的总工期”并不离谱。**持续成本**（上游同步）不在上表里。

---

## 9. 风险登记

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| 业务数据超出浏览器 WASM 内存 | 中 | **高**（可能需改走服务端） | WP4 尽早压测；问清数据规模；评估 sidecar 路线 |
| 上游快速迭代，同步成本累积 | 高 | 中 | WP6 同步脚本 + 固定版本；考虑向上游贡献减少补丁 |
| 目标环境（Windows/Node 25/浏览器）有意外 | 中 | 中 | WP2 尽早在真实机器上跑一遍 |
| `postMessage` 打通方案受平台鉴权/跨域限制 | 中 | 中 | 先问清取数鉴权；优先同源 + 字节传递 |
| 首屏 ~6 秒影响体验 | 高（已确认） | 低~中 | WP3 |
| 依赖/许可证未审计 | 未知 | 中~高（合规） | WP7 |
| 隐藏耦合再次出现（运行时 fetch、store、布局） | 中 | 低 | 每个新增范围都做真实浏览器端到端，不能只靠静态分析 |
| 上游 bug（如 `slope`）影响用户 | 中 | 低 | 补丁 + 反馈上游 + 回归测试 |

---

## 10. 需要向业务/领导确认的开放问题

给接手者：这些问题的答案决定第 7、8 节的做法和数字，**请优先问清**。

1. **范围**：只需要 Whitebox 的 1069 个工具吗？还是还要矢量工具（Turf）、格式转换、批处理、模型构建器、OBIA？
2. **数据**：输入数据来自哪里（平台文件服务/对象存储/数据库）？典型大小？格式？
3. **结果**：结果存到哪里？是否需要在平台里再预览/可视化（工具箱本身**没有地图**）？
4. **用户与权限**：是否需要审计“谁运行了什么工具”？是否有按工具授权的需求？
5. **执行位置**：必须纯浏览器计算（数据不出终端），还是允许服务端执行？
6. **环境**：真实 Tomcat/JDK 版本？浏览器和版本？是否内网、是否有反向代理/网关？Windows 上的 Node/npm 版本策略？
7. **合规**：是否需要许可证审计 / 开源合规流程？
8. **维护**：谁负责长期维护和跟进上游？可接受的同步频率？
9. **与其他候选方案的比较标准**：我**只评估了 D2**，不了解其他候选（A/B/C/D1 等）。需要有人给出评判维度（维护成本、升级路径、体验一致性、性能、离线要求等）。

---

## 11. 附录：复现与关键位置

### 11.1 运行

```bash
# 开发 / 构建（Node 20+，我在 22.22.0 验证）
cd toolbox && npm install && npm start        # http://127.0.0.1:5173
npm run build                                  # 产物 dist/，自带 WEB-INF/web.xml

# 带 Tomcat 的嵌入演示（需本机 JDK 8+，仓库不含 JDK）
cd tomcat-demo && start.bat                    # Linux/macOS: ./start.sh
# http://localhost:8090/portal/  Vue 2.6.14 宿主页 + iframe
# http://localhost:8090/toolbox/ 工具箱单独页
```

### 11.2 端到端测试脚本（`toolbox/scripts/`，Playwright 1.56.1）

| 脚本 | 内容 |
|---|---|
| `e2e.mjs <url>` | 合成 DEM → 选工具（`TOOL=Hillshade` 可换）→ 对话框文件选择器上传 → 运行 → 校验下载的 GeoTIFF |
| `e2e-vector.mjs <url>` | GeoJSON 上传 → Buffer Vector → 从结果条下载 → 校验 3 个 Polygon |
| `e2e-iframe.mjs <url>` | 打开 Vue 宿主页，在 iframe 里跑 Slope，校验输出 |
| `poc/scripts/*` | 阶段 1：Node 无头烟测、manifest 查看、浏览器 E2E |

首次需 `npx playwright install chromium`。

### 11.3 关键文件

| 路径 | 说明 |
|---|---|
| `toolbox/packages/processing/src/wasm-client.ts`（搜 `PATCH(toolbox)`） | **唯一**被修改的上游文件 |
| `toolbox/src/shims/map.ts`、`src/lib/{tauri-io,sidecar,print-extent}.ts`、`src/hooks/useWhiteboxSemanticSearch.ts` | 4 个 shim + map 替身 |
| `toolbox/src/App.tsx` | 宿主：打开对话框、栅格/LiDAR 输出转下载、矢量结果条 |
| `toolbox/src/components/processing/ProcessingDialog.tsx` | 上游原样，3198 行；props 在约第 148 行；`downloadBytes` 约第 170 行；输出处理约第 1330~1400 行；文件选择约第 3105~3185 行 |
| `toolbox/public/whitebox-catalog-snapshot.json` | 运行时 fetch 的元数据快照（1 MB） |
| `toolbox/public/WEB-INF/web.xml` | 缓存策略，构建时进入 `dist/` |
| `tomcat-demo/tomcat/conf/server.xml` | 端口 8090/8095，gzip 含 `application/wasm` |
| `toolbox/README.md`、`tomcat-demo/README.md` | 运行与部署说明 |

### 11.4 版本

Node 22.22.0（用户 25.7.0）、npm 10.9.x（用户 11.10.1）、Vite 8.3.4、React 19.3、TypeScript 5.9、Tailwind 4.3、`geolibre-wasm` **1.5.9**（`overrides` 固定）、Tomcat 9.0.100、JDK 21（仅我的环境）、Vue 2.6.14、Playwright 1.56.1。

### 11.5 提交记录（分支 `claude/happy-knuth-krcnht`）

`4f88d73` 阶段 1 PoC → `7ccbb10` 阶段 2 裁剪 → `06c1bb6` 工作量结论 → `92abf14` Tomcat 配置 + Vue 示例 → `7856f44` `npm start` → `8fcdc31` tomcat-demo。

---

## 12. 诚实声明（请带到汇报里）

- 所有测试都在 **Linux 云容器 + 无头 Chromium + localhost** 下完成，**没有任何一项在 Windows、真实内网或其他浏览器上跑过**。
- 工作量数字是**估计**。其中“已完成”的部分是我在 AI 辅助、并行读码的条件下做的，不能直接当作“一个开发者的人天”；“未做”的部分置信度低，主要由第 10 节的答案决定。
- 测试数据是 64×64 的合成 DEM / 3 个点，**不代表真实业务数据的性能和内存表现**。
- 我只评估了 D2，没有和其他候选方案比较。
- 第 4 节第 6 点、第 3.5 节“瓶颈是 wasm 编译”、第 7 节若干设计判断均为**推断**，已逐条标注。
