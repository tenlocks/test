#!/usr/bin/env bash
# Rebuild ../toolbox and copy dist/ into tomcat/webapps/toolbox (Tomcat picks the change up; no restart needed).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
( cd "$HERE/../toolbox" && npm install && npm run build )
rm -rf "$HERE/tomcat/webapps/toolbox" && cp -r "$HERE/../toolbox/dist" "$HERE/tomcat/webapps/toolbox"
echo "已部署到 tomcat/webapps/toolbox"
