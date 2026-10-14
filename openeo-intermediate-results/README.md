# OpenEO 中间结果提供与下载：STAC 调研与需求分析

> 说明：环境网络策略对 stac-extensions.github.io 与 ogc.org 返回 403，本文通过 WebSearch 的二手摘要加上通用背景知识整理。
> 标注「待核实」的字段与行为未在官方页面逐字确认，定稿前请对照官方规范。

## 1. STAC 核心概念

| 概念 | 作用 |
|---|---|
| Item | 最基本单元，本质是带扩展字段的 GeoJSON Feature，含时空范围、属性、assets、links |
| Asset | Item/Collection 指向的具体文件（如 GeoTIFF、NetCDF），带 href、type、roles |
| Catalog | 用 links 把 Item、Collection 组织成树的结构 |
| Collection | 带更多必填元数据（范围、许可、提供方）的 Catalog，描述一组相关 Item |
| STAC API | 建立在核心之上的独立规范，提供搜索与分页等接口 |

核心刻意保持精简，能力通过扩展补充。

## 2. 相关扩展

| 扩展 | 前缀 | 用途 | 与本需求的关系 |
|---|---|---|---|
| File Info | `file:` | asset 的 checksum、size、byte_order、数据类型等 | 下载校验、断点续传、预估大小 |
| Storage | `storage:` | platform、region、requester_pays、tier | 说明中间结果存放位置与访问成本 |
| Processing | `processing:` | 处理级别、软件版本、lineage 等（待核实具体字段） | 记录中间结果由哪一步、哪个版本产生 |
| Alternate Assets | `alternate` | 同一资产的多个访问地址（如 S3 签名 URL） | 多种下载方式 |
| Authentication | `auth:` | 描述访问所需认证方案（待核实） | 中间结果通常需要鉴权 |

## 3. OpenEO 如何用 STAC 暴露结果

- **batch job 结果**：`GET /jobs/{job_id}/results` 返回 STAC Item 或 Collection，assets 为输出文件。EODC 后端同时列出 `/results/items` 与 `/results/items/{feature_id}`（已从搜索结果确认存在）。
- **save_result**：决定输出格式（GeoTIFF、NetCDF、Zarr 等）。Zarr 在部分后端只能走 batch job。部分后端支持把结果写入用户 workspace，并同时写入 STAC item（EODC，已确认）。
- **load_result**：用 job id 在同一后端、同一账号下复用前一个 job 的输出。论坛有「batch job does not exist」的失败案例，多与 job id 或后端有关。
- **load_stac**：从静态 STAC 目录或 STAC API 读取，也可以指向某个 job 结果的 URL。曾有用户读取小 GeoTIFF 时报 OOM、维度名需为 `t` 而非 `time` 等问题。
- **签名 URL**：结果 asset 常是带时效的签名 URL，EODC 曾出现 401 Signed URL invalid。

**关键缺口**：OpenEO 的 job 是「整个 process graph 一次执行，只产出最终 save_result 节点的结果」。图中间节点的数据默认不落盘，也不暴露。

## 4. 对 PM 需求的推测

可能的含义，由浅到深：

1. **A. 多个 save_result**：一个 process graph 里在中间节点也保存结果，一并出现在 job results 里。
2. **B. 中间结果可复用**：把前序 job 结果登记为 STAC，供后续 job 用 `load_result`/`load_stac` 加载，避免重算。
3. **C. 调试与审计**：用户查看每个处理步骤的输出，并通过 processing 扩展记录 lineage。
4. **D. 大文件下载体验**：分块、断点续传、校验、签名 URL 过期、保留时长。

## 5. 要向 PM 确认的问题

1. 「中间结果」指什么：process graph 中的任意节点输出，还是用户标记的少数节点，还是多个 job 之间的产物？
2. 使用场景：调试、复用以省算力、合规审计，还是给下游系统消费？
3. 是否要求标准兼容：结果必须是合法 STAC（Item 还是 Collection），是否需要遵循 openEO API 现有的 `/jobs/{id}/results`，还是可新增端点？
4. 用户如何指定要保留的节点：是新增参数、沿用 `save_result`，还是新增专用 process？
5. 保留策略：中间结果保存多久，配额与计费如何，谁来清理？
6. 访问控制：仅所有者可见，还是可共享？签名 URL 有效期多长？
7. 格式要求：中间结果用何种格式，是否需要 COG、Zarr 等云优化格式？
8. 规模：典型数据量多大，是否要求断点续传、分块下载？
9. 元数据：是否要记录 lineage（来源节点、process 参数、软件版本）？是否使用 processing 扩展？
10. 是否要求可被再次加载（`load_result`/`load_stac`）及跨后端使用？
11. 使用的后端是哪一个，是自研还是 openEO platform、Copernicus、EODC 等？能力差异很大。
12. 优先级与期限。

## 6. 建议的下一步

1. 先与 PM 确认问题 1、2、4，这决定是 A、B 还是更重的方案。
2. 核对 openEO API 规范中 job results 的 STAC 结构及 `load_result`，并确认 processing、file、storage 扩展的官方字段。
3. 按答案出方案：最小方案是在现有 job results 中支持多个 save_result 并附带 file/processing 元数据。

## 参考来源

- [STAC Specification 概览](https://stacspec.org/en/about/stac-spec/)
- [Intro to STAC](https://stacspec.org/en/tutorials/intro-to-stac/)
- [stac-extensions/file](https://github.com/stac-extensions/file)
- [pystac storage 扩展](https://pystac.readthedocs.io/en/stable/api/extensions/storage.html)
- [Copernicus openEO Batch job 示例](https://documentation.dataspace.copernicus.eu/notebook-samples/openeo/Batch_job.html)
- [EODC 用户 workspace](https://docs.eodc.eu/tutorials/workspaces.html)
- [EODC 论坛：Caching openEO results](https://discuss.eodc.eu/t/caching-openeo-results/197?page=2)
- [EODC 论坛：Signed URL 401](https://discuss.eodc.eu/t/error-401-signed-url-is-not-valid/416)
- [EODC openEO 后端](https://openeo.eodc.eu/)
- [eo-college load_stac](https://eo-college.org/?p=383785)
