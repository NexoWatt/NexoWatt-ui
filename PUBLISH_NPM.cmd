@echo off
echo NexoWatt EOS 0.8.203 RC78 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo FEHLER: Publish wurde abgebrochen. Bitte die Ausgabe oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.203 wurde erfolgreich veroeffentlicht.
pause
