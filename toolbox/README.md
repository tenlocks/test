# GeoLibre Toolbox (standalone cut)

GeoLibre 的 **WhiteboxTools 工具箱 UI**，从 [opengeos/geolibre](https://github.com/opengeos/geolibre)
monorepo 里物理裁剪出来的独立 Vite 工程：1069 个工具、参数表单、浏览器内 WASM 运行、结果下载。
**没有**地图 / SQL / Cesium / Tauri / Python sidecar。

> 这是 D2 方案的验证产物（PoC），用来回答「剥离到底要多少工作量」。结论见文末。

## 本地运行（SVN 检出后）

需要 Node 20+（在 Node 22 上验证）。整个 `toolbox/` 目录是自包含的，不依赖 git，也没有符号链接，
可以原样放进 SVN 工作副本：

```bash
svn checkout <你的仓库>/toolbox   # 或把本目录拷进已有工作副本后 svn add / svn commit
cd toolbox
npm install
npm start                          # http://127.0.0.1:5173 ，首次打开要加载 ~30 MB wasm，等几秒
```

提交进 SVN 时请忽略生成目录（否则 `node_modules` 会有上万个文件）：

```bash
svn propset svn:ignore "node_modules
dist
e2e-out" .
```

其他命令：`npm run build`（产物在 `dist/`，相对路径，可挂到任意子目录）、`npm run preview`、`npm run typecheck`。
页面右上角可切换 中文 / English（也支持 `?lang=zh`）。

> 已在“无 .git 的纯目录副本”里验证过 `npm install` → `npm start` → 端到端测试。
> **未在 Windows 上验证**：npm workspaces 在 Windows 上会建目录联接（junction），通常可用，
> 若 `npm install` 报权限错误，请用管理员终端或开启“开发人员模式”。

### 试一下

1. 搜索框输入 `Slope`，选中 **Slope**；
2. 点 Input 右侧的文件夹按钮，选一个 GeoTIFF DEM；
3. 点 **Run**——在浏览器里用 WASM 运行，完成后 `slope_output.tif` 自动下载。

矢量工具（如 **Buffer Vector**）的结果会出现在页面顶部的结果条里，点 `.geojson` 下载。
栅格 / LiDAR / 报告类输出直接触发浏览器下载。

没有 DEM？用 `node scripts/e2e.mjs`（见下）会生成一个合成 DEM 到 `e2e-out/dem.tif`。

## 端到端测试

用真实 Chromium 驱动原版对话框（选文件 → 运行 → 下载 → 校验数值）：

```bash
npm i                                  # 已含 playwright 与 geotiff
npx playwright install chromium        # 首次需要（约 150 MB）
npm run build && npx vite preview --port 4173 &
node scripts/e2e.mjs http://localhost:4173/                 # Slope，校验平均坡度 ≈ 1.6°
TOOL=Hillshade node scripts/e2e.mjs http://localhost:4173/  # 其他栅格工具
node scripts/e2e-vector.mjs http://localhost:4173/          # Buffer Vector：3 点 → 3 多边形
```

## 目录结构：哪些是原样复制，哪些是我写的

```
packages/core        原样复制自 geolibre/packages/core        （store、类型；依赖 zustand 等，不依赖 maplibre）
packages/processing  原样复制自 geolibre/packages/processing  （1 个文件打了补丁，见下）
packages/ui          原样复制自 geolibre/packages/ui          （Radix/shadcn 封装）
src/components/processing/   ProcessingDialog.tsx 等 3 个文件，原样复制，一行未改
src/lib/                     22 个文件原样复制；4 个被 shim 替换
src/shims/map.ts             @geolibre/map 的替身（getLayerBounds 原样 + MapEngine 类型）
src/App.tsx                  宿主：打开对话框、把栅格/LiDAR 输出变成下载、矢量结果条
src/i18n/                    只保留 common / processing / toolbar 三个顶层 key（en + zh，约 220 KB）
public/whitebox-catalog-snapshot.json   运行时 fetch 的工具元数据快照（1 MB，原样复制）
```

### 被 shim 替换的 4 个模块（它们是把 ~70 个文件拖进来的“咽喉”）

| 原模块 | 原因 | shim |
|---|---|---|
| `lib/tauri-io.ts` | 重导出 file-io/ 下 ~69 个文件（Tauri、DuckDB、KML、项目文件…） | 浏览器分支的 6 个函数（`<input type=file>`） |
| `lib/sidecar.ts` | 通过 Tauri `invoke` 启动 Python sidecar | 抛“不可用”，对话框自动走 WASM |
| `hooks/useWhiteboxSemanticSearch.ts` | 需要托管的向量检索端点 | 返回“不可用”，保留普通搜索 |
| `lib/print-extent.ts` | 在 MapLibre 地图上画范围框 | no-op（无地图） |

### 对上游代码的唯一改动

`packages/processing/src/wasm-client.ts`（搜索 `PATCH(toolbox)`）：

`slope` 是 1065 个工具里**唯一**输出声明为裸 “Optional output path” 且输入为栅格的。留空输出时上游
回退到 `.dat`，而 whitebox 按扩展名决定格式，`.dat` 会写成 ENVI（`.hdr`/`.img`），名为
`slope_output.dat` 的文件根本不存在，对话框显示 Succeeded 却没有任何结果。补丁：此类输出默认 `.tif`。
上游原版应该也有这个问题（该文件是原样复制的），建议向 opengeos/geolibre 反馈。

## 已验证 / 未验证

已验证（Linux 云容器，Chromium，子路径部署 `/compute/toolbox/`）：
- 类型检查通过；`vite build` 约 4 秒；`npm install` 约 35 秒
- Slope（平均坡度 1.589°，理论 ≈1.6°）、Hillshade、Aspect（平均 268.8°，DEM 向东升高所以坡向西）
- Buffer Vector：矢量上传 → 运行 → 下载
- 1069 个工具全部载入

**未验证**：Windows、Tomcat 实机、大文件（内存/耗时）、LiDAR/OBIA/模型构建器等重型工具、
浏览器兼容性（只测了 Chromium）。

## 部署注意

- `.wasm` 必须以 `application/wasm` 提供（`WebAssembly.compileStreaming` 要求）。Tomcat 默认是否带该映射
  **未验证**，不带则在 `web.xml` 加：
  ```xml
  <mime-mapping><extension>wasm</extension><mime-type>application/wasm</mime-type></mime-mapping>
  ```
- 首屏下载约 30 MB 未压缩 wasm（gzip 后约 14 MB，含 ONNX 运行时 14 MB / 3.7 MB gz）。需开启 gzip + 长缓存。
- 工具在 Web Worker 里跑，不会冻结页面。
- 依赖 `geolibre-wasm`：`packages/processing/package.json` 写的是 `^1.5.9`，会解析到 1.6.0；
  上游 lockfile 锁 1.5.9。两者在本次测试中行为一致，生产建议固定版本。

## D2 工作量结论（证据 + 估算）

**证据（本次实际发生的事）**
- 以 `ProcessingDialog` 为入口的朴素 import 闭包是 660 个文件，但真实耦合很小：只需替换 **4 个“咽喉”模块**
  （tauri-io / sidecar / 语义搜索 hook / print-extent）+ 1 个 map 替身，闭包就从 97 个 app 文件缩到 **26 个**。
- 最终：**170 个上游文件原样复制**（含 3198 行的 `ProcessingDialog.tsx`），**上游代码只改 1 个文件**（一个补丁），
  新写 ≈ 10 个小文件（4 个 shim、宿主 App、i18n 初始化、配置）。
- 类型检查错误只出现过 5 个（2 个编译期全局变量 + 1 个漏拷的小文件），没有任何“深度耦合 MapLibre”的迹象。
- 但**只靠 import 分析会漏掉的东西**确实存在，都是靠真实运行发现的：
  1. 运行时 `fetch` 的静态资源 `whitebox-catalog-snapshot.json`（1 MB，不是 import）；
  2. 对话框把矢量结果写进图层 store，宿主不提供图层列表就“成功了但拿不到结果”，要自己做结果条；
  3. 浮动对话框 `position: fixed` 会盖住宿主 UI；
  4. 上游 `slope` 的输出 bug（见上）。

**估算（人天，是估计不是测量）**

| 阶段 | 估算 | 说明 |
|---|---|---|
| 纯裁剪（达到本仓库当前状态） | **1.5 ~ 2 天** | 熟悉代码库的开发者；我在云容器里一个会话完成，但含大量并行读代码，不能直接等同于人天 |
| 嵌入 Vue 2.6 计算中心（iframe + postMessage / URL 参数，输入输出对接平台存储而不是本地选文件） | 1 ~ 2 天 | **未做**。这是最大的不确定项 |
| Tomcat 部署实测（wasm MIME、gzip、缓存、内网首屏 ~14 MB gz） | 0.5 ~ 1 天 | **未做** |
| 大文件 / 重型工具（LiDAR、OBIA）的内存与耗时验证 | ~1 天 | **未做** |
| 合计到“可用的嵌入版” | **约 4 ~ 7 天** | |

对比两个原估值：「2~3 天」对**纯裁剪**基本成立；「5~12 天」对纯裁剪偏高（它依据的“深度耦合 MapLibre”不成立），
但作为“含集成与加固的总工期”并不离谱。持续成本：GeoLibre 迭代很快（3.3.0，3100+ 文件），每次同步需要
重新核对这 ~26 个文件 + shim 接口。
