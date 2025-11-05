// Script para crear iconos básicos para la PWA
// Este script debe ejecutarse en un entorno Node.js con Canvas instalado

const fs = require('fs');
const { createCanvas } = require('canvas');

// Función para crear un icono simple con el texto "TAU"
function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fondo azul oscuro
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, size, size);
    
    // Texto "TAU" en blanco
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAU', size / 2, size / 2);
    
    return canvas.toBuffer('image/png');
}

// Tamaños de iconos necesarios
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Crear directorio si no existe
if (!fs.existsSync('assets/icons')) {
    fs.mkdirSync('assets/icons', { recursive: true });
}

// Generar todos los iconos
iconSizes.forEach(size => {
    const iconBuffer = createIcon(size);
    const filename = size === 16 ? 'favicon-16x16.png' : 
                    size === 32 ? 'favicon-32x32.png' :
                    size === 180 ? 'apple-touch-icon.png' :
                    `icon-${size}x${size}.png`;
    
    fs.writeFileSync(`assets/icons/${filename}`, iconBuffer);
    console.log(`Creado: assets/icons/${filename}`);
});

console.log('¡Todos los iconos han sido creados!');