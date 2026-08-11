@echo off
setlocal
echo NexoWatt EOS 0.8.175 RC51 wird geprueft und auf npm veroeffentlicht ...
npm publish
if errorlevel 1 (
  echo.
  echo VERÖFFENTLICHUNG FEHLGESCHLAGEN.
  exit /b 1
)
echo.
echo NexoWatt EOS 0.8.175 wurde erfolgreich veroeffentlicht.
endlocal
