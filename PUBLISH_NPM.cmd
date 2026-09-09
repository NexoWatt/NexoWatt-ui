@echo off
echo NexoWatt EOS 1.0.2 Stable wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo FEHLER: Publish wurde abgebrochen. Bitte die Ausgabe oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 1.0.2 Stable wurde erfolgreich veroeffentlicht.
pause
