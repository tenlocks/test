#!/usr/bin/env bash
HERE="$(cd "$(dirname "$0")" && pwd)"
export CATALINA_HOME="$HERE/tomcat" CATALINA_BASE="$HERE/tomcat"
if [ -z "$JAVA_HOME" ] && [ -z "$JRE_HOME" ]; then export JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"; fi
exec "$CATALINA_HOME/bin/catalina.sh" stop
