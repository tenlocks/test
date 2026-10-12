@echo off
rem Rebuild ..\toolbox and copy dist\ into tomcat\webapps\toolbox (no Tomcat restart needed).
setlocal
set "HERE=%~dp0"
pushd "%HERE%..\toolbox" || exit /b 1
call npm install || (popd & exit /b 1)
call npm run build || (popd & exit /b 1)
popd
if exist "%HERE%tomcat\webapps\toolbox" rmdir /s /q "%HERE%tomcat\webapps\toolbox"
xcopy /e /i /y /q "%HERE%..\toolbox\dist" "%HERE%tomcat\webapps\toolbox" >nul
echo Deployed to tomcat\webapps\toolbox
