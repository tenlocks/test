# GeoLibre 工具箱剥离（D2 方案）验证仓库

验证把 [opengeos/geolibre](https://github.com/opengeos/geolibre) 的 WhiteboxTools 工具箱 UI 剥离出来，
嵌入 Vue 2.6 + Tomcat 的“计算中心”是否可行、工作量多少。

**先读：[`docs/D2-feasibility-and-next-steps.md`](docs/D2-feasibility-and-next-steps.md)**——验证结论、证据、风险、后续计划、待确认问题。

| 目录 | 内容 |
|---|---|
| `docs/` | 可行性验证结论与后续计划（交接文档） |
| `toolbox/` | 从 GeoLibre 裁剪出的独立工程（React 19 + Vite）。`npm install && npm start` |
| `tomcat-demo/` | 自带 Tomcat 9 + Vue 2.6 示例宿主页 + 已构建的工具箱。`start.bat`（需本机 JDK 8+） |
| `poc/` | 阶段 1 最小 PoC（只用 geolibre-wasm） |

分支：`claude/happy-knuth-krcnht`。所有验证均在 Linux 容器 + 无头 Chromium 下完成，**未在 Windows 上验证**，详见文档第 12 节。
