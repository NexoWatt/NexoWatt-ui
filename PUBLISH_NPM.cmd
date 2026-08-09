@echo off
setlocal
cd /d "%~dp0"
echo NexoWatt UI 0.8.165 wird geprueft und auf npm veroeffentlicht ...
npm publish
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo Publish fehlgeschlagen. Es wurde nichts erfolgreich veroeffentlicht.
) else (
  echo Publish erfolgreich abgeschlossen.
)
pause
exit /b %EXITCODE%
