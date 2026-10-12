@echo off
setlocal
set "CATALINA_HOME=%~dp0tomcat"
set "CATALINA_BASE=%CATALINA_HOME%"
call "%CATALINA_HOME%\bin\catalina.bat" stop
