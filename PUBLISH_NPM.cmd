@echo off
echo NexoWatt EOS 0.8.190 RC65 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo Veroeffentlichung fehlgeschlagen. Bitte die Meldung oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.190 wurde erfolgreich veroeffentlicht.
pause
