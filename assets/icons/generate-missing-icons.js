// Script para generar todos los iconos faltantes para la PWA
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Definir los iconos necesarios según el manifest.json
const iconSizes = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' }
];

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fondo azul oscuro
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, size, size);
    
    // Texto "TAU" en blanco
    ctx.fillStyle = '#ffffff';
    const fontSize = Math.max(8, size * 0.3);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAU', size / 2, size / 2);
    
    return canvas;
}

function generateAllIcons() {
    const iconsDir = __dirname;
    
    iconSizes.forEach(icon => {
        const canvas = createIcon(icon.size);
        const buffer = canvas.toBuffer('image/png');
        const filePath = path.join(iconsDir, icon.name);
        
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Generado: ${icon.name}`);
    });
    
    console.log('🎉 Todos los iconos han sido generados correctamente');
}

// Ejecutar la generación
generateAllIcons();