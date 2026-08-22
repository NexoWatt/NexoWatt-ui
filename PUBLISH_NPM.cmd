@echo off
echo NexoWatt EOS 0.8.197 RC72 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo FEHLER: Publish wurde abgebrochen. Bitte die Ausgabe oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.197 wurde erfolgreich veroeffentlicht.
pause
