@echo off
echo NexoWatt EOS 0.8.186 RC61 wird geprueft und auf npm veroeffentlicht ...
call npm publish
if errorlevel 1 (
  echo.
  echo Publish fehlgeschlagen. Bitte die Fehlermeldung oben pruefen.
  pause
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.186 wurde erfolgreich veroeffentlicht.
pause
