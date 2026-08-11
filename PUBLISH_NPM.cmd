@echo off
echo NexoWatt EOS 0.8.176 RC52 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo Veroeffentlichung fehlgeschlagen. Bitte Fehlermeldung pruefen.
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.176 wurde erfolgreich veroeffentlicht.
