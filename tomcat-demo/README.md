# Tomcat 演示环境：Vue 2.6 嵌入 GeoLibre 工具箱

自带 Tomcat 9.0.100、已构建好的工具箱、一个 Vue 2.6.14 示例宿主页。拉代码后直接启动即可验证嵌入。

## 启动

先决条件：本机有 **JDK / JRE 8+**（**仓库里不含 JDK**：Windows 版 JDK 体积太大，单文件超过 GitHub 100 MB 上限，
且与平台相关。你们既然已在用 Tomcat，本机应已有 JDK）。

Windows：双击或在命令行运行

```bat
start.bat
```

Linux / macOS：`./start.sh`

脚本会优先用环境变量 `JAVA_HOME`，没有则从 PATH 里的 `java` 推断；找不到会给出提示。
窗口里会输出 Tomcat 日志，**按 Ctrl+C 停止**（也可用 `stop.bat` / `./stop.sh`）。

看到 `Server startup in [...] milliseconds` 后打开：

| 地址 | 内容 |
|---|---|
| http://localhost:8090/portal/ | **Vue 2.6.14 宿主页，用 iframe 嵌入工具箱（验证这个）** |
| http://localhost:8090/toolbox/ | 工具箱单独页面 |

端口用 **8090**（关闭端口 8095），避免和你本机已有的 Tomcat（8080）冲突；要改的话在 `tomcat/conf/server.xml` 里改。

## 验证步骤

1. 打开 `/portal/`：顶栏是 Vue 宿主（显示 Vue 2.6.14），下面是工具箱；
2. 约 6 秒后工具目录出现（显示“全部（1069）”）；
3. 搜索 `Slope`，选中；点 Input 右侧的文件夹按钮选一个 GeoTIFF DEM；点“运行”；
4. 结果 `slope_output.tif` 自动下载。顶栏的“关闭工具箱 / English”按钮用来验证 Vue 对 iframe 的控制。

没有 DEM 的话：`cd ../toolbox && npm i && node scripts/e2e-iframe.mjs http://localhost:8090/portal/`
会生成一个合成 DEM 到 `e2e-out/dem.tif`，并自动跑完整个流程。

## 目录

```
tomcat-demo/
  start.bat / start.sh / stop.bat / stop.sh   启动、停止
  deploy-toolbox.bat / .sh                    重新构建 ../toolbox 并拷进 Tomcat（无需重启）
  tomcat/                                     Tomcat 9.0.100（已裁掉 docs / examples / manager）
    conf/server.xml                           改了端口 8090，并开启 gzip（含 application/wasm）
    webapps/portal/                           Vue 2.6.14 示例宿主页（index.html + vue.min.js）
    webapps/toolbox/                          已构建的工具箱（= toolbox/ 执行 npm run build 后的 dist/）
    webapps/ROOT/                             跳转到 /portal/
```

## 改了工具箱代码之后

`webapps/toolbox/` 是构建产物。改了 `../toolbox` 的源码后：`deploy-toolbox.bat`（或 `.sh`），然后浏览器强制刷新
（资源有 1 年缓存，文件名带哈希，所以 index.html 一变就会取新文件，一般普通刷新即可）。

## 嵌入你自己的 Vue 页面

只需要一个 iframe，不需要别的：

```html
<iframe src="../toolbox/?lang=zh" style="width:100%;height:100%;border:0"></iframe>
```

把 `tomcat/webapps/toolbox/` 整个目录拷到你自己的 Tomcat 的 `webapps/` 下即可；**同时要在你的 Tomcat 的
`server.xml` 里按本目录的 `server.xml` 开启 gzip 并加上 `application/wasm`**，否则主 wasm 会以 23.8 MB 原样传输。

## 已验证 / 未验证

- 已验证（Linux，JDK 21，Chromium）：`start.sh` 启动 → `/portal/` 内 iframe 运行 Slope 成功并下载；端口 8090。
- **未验证：`start.bat` / `stop.bat` / `deploy-toolbox.bat` 没有在 Windows 上运行过**（我只有 Linux 环境）。
  脚本写成了纯 ASCII + CRLF，并加了 `.gitattributes` 防止 git 改换行；如果出错，把窗口输出发给我。
- 如果你本机 PATH 里的 `java` 来自 `C:\Program Files\Common Files\Oracle\Java\javapath`（一个跳转桩），
  脚本推断的 JAVA_HOME 会无效并报错；此时手动 `set JAVA_HOME=...` 指向 JDK 目录再运行。
- 用户 / 数据与平台的打通（`postMessage` 桥）还没有做，见 `../toolbox/README.md`。
