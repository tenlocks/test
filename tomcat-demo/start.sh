#!/usr/bin/env bash
# Start the bundled Tomcat in the foreground (Ctrl+C stops it). Needs a JDK/JRE (Java 8+) on this machine.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
export CATALINA_HOME="$HERE/tomcat" CATALINA_BASE="$HERE/tomcat"
if [ -z "$JAVA_HOME" ] && [ -z "$JRE_HOME" ]; then
  if command -v java >/dev/null 2>&1; then
    export JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  else
    echo "找不到 Java。请安装 JDK 8+，或设置 JAVA_HOME 后重试。" >&2; exit 1
  fi
fi
chmod +x "$CATALINA_HOME"/bin/*.sh 2>/dev/null || true
echo "JAVA_HOME=$JAVA_HOME"
echo "打开 http://localhost:8090/portal/  （Vue 2.6 嵌入示例）"
echo "     http://localhost:8090/toolbox/ （工具箱单独页面）"
exec "$CATALINA_HOME/bin/catalina.sh" run
