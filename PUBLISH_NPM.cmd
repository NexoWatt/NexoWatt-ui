@echo off
setlocal
cd /d "%~dp0"
echo NexoWatt EOS 0.8.171 RC47 wird geprueft und auf npm veroeffentlicht ...
call npm publish
if errorlevel 1 (
  echo.
  echo FEHLER: Der Publish-Vorgang wurde abgebrochen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.171 wurde erfolgreich veroeffentlicht.
pause
