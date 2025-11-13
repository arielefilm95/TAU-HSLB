// Script Node.js para generar iconos profesionales para TAU PWA
const fs = require('fs');
const path = require('path');

// Simulación de generación de iconos (en un entorno real usaríamos canvas o sharp)
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

// Función para crear un placeholder del icono con el diseño profesional
function createIconPlaceholder(size) {
    const svgContent = `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="medicalGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3498db;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="earGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ecf0f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo circular -->
  <circle cx="256" cy="256" r="250" fill="url(#medicalGradient${size})" stroke="#1a252f" stroke-width="4"/>
  
  <!-- Oído estilizado -->
  <path d="M 180 200 
           C 180 180, 200 160, 220 160
           C 240 160, 250 180, 250 200
           L 250 240
           C 250 260, 240 280, 220 280
           C 200 280, 180 260, 180 240
           Z" 
        fill="url(#earGradient${size})" 
        stroke="#2c3e50" 
        stroke-width="3"/>
  
  <!-- Detalles internos del oído -->
  <circle cx="210" cy="220" r="8" fill="#e74c3c"/>
  <circle cx="225" cy="235" r="5" fill="#e74c3c"/>
  <circle cx="195" cy="230" r="4" fill="#e74c3c"/>
  
  <!-- Ondas sonoras -->
  <path d="M 270 200 Q 290 190, 300 200" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.9"/>
  <path d="M 275 220 Q 300 210, 310 220" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.8"/>
  <path d="M 280 240 Q 310 230, 320 240" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.7"/>
  
  <!-- Texto TAU -->
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">
    TAU
  </text>
  
  <!-- Subtítulo -->
  <text x="256" y="370" font-family="Arial, sans-serif" font-size="16" fill="#ecf0f1" text-anchor="middle">
    Tamizaje Auditivo
  </text>
  
  <!-- Cruz médica decorativa -->
  <rect x="320" y="180" width="8" height="30" fill="#e74c3c"/>
  <rect x="311" y="189" width="26" height="8" fill="#e74c3c"/>
</svg>`;

    return svgContent;
}

// Función principal para generar todos los iconos
function generateAllIcons() {
    console.log('🎯 Generando iconos profesionales para TAU PWA...');
    
    // Crear directorio si no existe
    const iconsDir = path.join(__dirname);
    
    iconSizes.forEach(icon => {
        const svgContent = createIconPlaceholder(icon.size);
        const svgPath = path.join(iconsDir, icon.name.replace('.png', '.svg'));
        
        // Guardar como SVG primero
        fs.writeFileSync(svgPath, svgContent);
        console.log(`✅ SVG generado: ${icon.name.replace('.png', '.svg')}`);
        
        // Nota: En un entorno real con Node.js y sharp/canvas, 
        // convertiríamos el SVG a PNG aquí
        console.log(`📝 Nota: Use un convertidor de SVG a PNG para generar ${icon.name}`);
    });
    
    console.log('\n📋 Instrucciones para completar la generación:');
    console.log('1. Abra generate-professional-icons.html en un navegador');
    console.log('2. Haga clic en "Generar Todos los Iconos"');
    console.log('3. Los archivos PNG se descargarán automáticamente');
    console.log('4. Copie los archivos descargados a la carpeta assets/icons/');
    
    console.log('\n🎨 Iconos SVG base generados exitosamente');
}

// Ejecutar la generación
if (require.main === module) {
    generateAllIcons();
}

module.exports = { generateAllIcons, createIconPlaceholder };