@echo off
echo NexoWatt EOS 0.8.199 RC74 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo Publish fehlgeschlagen. Bitte die Fehlermeldung oben pruefen.
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.199 wurde erfolgreich veroeffentlicht.
