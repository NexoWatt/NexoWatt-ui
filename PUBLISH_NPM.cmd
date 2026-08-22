@echo off
echo NexoWatt EOS 0.8.196 RC71 Publish-Fix wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo FEHLER: Publish wurde abgebrochen. Bitte die Ausgabe oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.196 wurde erfolgreich veroeffentlicht.
pause
