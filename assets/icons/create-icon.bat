@echo off
echo Creando icono 144x144...

:: Crear un archivo HTML temporal que genere el icono
echo ^<!DOCTYPE html^> > temp_icon.html
echo ^<html^> >> temp_icon.html
echo ^<head^> >> temp_icon.html
echo ^<script^> >> temp_icon.html
echo function createIcon() { >> temp_icon.html
echo   const canvas = document.createElement('canvas'); >> temp_icon.html
echo   canvas.width = 144; >> temp_icon.html
echo   canvas.height = 144; >> temp_icon.html
echo   const ctx = canvas.getContext('2d'); >> temp_icon.html
echo   ctx.fillStyle = '#2c3e50'; >> temp_icon.html
echo   ctx.fillRect(0, 0, 144, 144); >> temp_icon.html
echo   ctx.fillStyle = '#ffffff'; >> temp_icon.html
echo   ctx.font = 'bold 43px Arial'; >> temp_icon.html
echo   ctx.textAlign = 'center'; >> temp_icon.html
echo   ctx.textBaseline = 'middle'; >> temp_icon.html
echo   ctx.fillText('TAU', 72, 72); >> temp_icon.html
echo   const dataURL = canvas.toDataURL('image/png'); >> temp_icon.html
echo   const base64 = dataURL.replace(/^data:image\/png;base64,/, ''); >> temp_icon.html
echo   const fs = require('fs'); >> temp_icon.html
echo   fs.writeFileSync('icon-144x144.png', base64, 'base64'); >> temp_icon.html
echo   console.log('Icono creado'); >> temp_icon.html
echo } >> temp_icon.html
echo createIcon(); >> temp_icon.html
echo ^</script^> >> temp_icon.html
echo ^</head^> >> temp_icon.html
echo ^</html^> >> temp_icon.html

echo Abriendo navegador para generar el icono...
start temp_icon.html

echo.
echo Instrucciones:
echo 1. Se abrirá una página en tu navegador
echo 2. El icono se generará automáticamente
echo 3. Descarga el archivo icon-144x144.png
echo 4. Colócalo en esta carpeta (assets/icons/)
echo.
pause
del temp_icon.html