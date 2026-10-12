@echo off
rem Start the bundled Tomcat in the foreground (Ctrl+C stops it). Needs a JDK or JRE (Java 8+).
setlocal
set "HERE=%~dp0"
set "CATALINA_HOME=%HERE%tomcat"
set "CATALINA_BASE=%CATALINA_HOME%"

if not defined JAVA_HOME if not defined JRE_HOME (
  where java >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Java not found. Install a JDK 8+ or set JAVA_HOME first, for example:
    echo         set JAVA_HOME=C:\Program Files\Java\jdk-17
    exit /b 1
  )
  for /f "delims=" %%i in ('where java') do if not defined JAVA_EXE set "JAVA_EXE=%%i"
)
if not defined JAVA_HOME if not defined JRE_HOME (
  for %%j in ("%JAVA_EXE%\..\..") do set "JAVA_HOME=%%~fj"
)
if not exist "%JAVA_HOME%\bin\java.exe" if not defined JRE_HOME (
  echo [ERROR] JAVA_HOME inferred from PATH is not valid: %JAVA_HOME%
  echo         Set JAVA_HOME to your JDK folder and run this script again.
  exit /b 1
)

echo JAVA_HOME=%JAVA_HOME%
echo Open http://localhost:8090/portal/   (Vue 2.6 embedding demo)
echo      http://localhost:8090/toolbox/  (toolbox on its own)
call "%CATALINA_HOME%\bin\catalina.bat" run
