const fs = require('fs');

// Función para crear un PNG simple con el diseño TAU
function createPngIcon(size, filename) {
    // Crear un buffer para el archivo PNG
    const width = size;
    const height = size;
    
    // Datos de imagen (fondo azul oscuro #2c3e50)
    const imageData = Buffer.alloc(width * height * 3); // RGB
    const blue = 44;   // #2c3e50 en RGB
    const green = 62;
    const red = 80;
    
    for (let i = 0; i < imageData.length; i += 3) {
        imageData[i] = red;     // R
        imageData[i + 1] = green; // G
        imageData[i + 2] = blue;  // B
    }
    
    // Crear un archivo BMP simple (más fácil que PNG)
    const bmpHeader = Buffer.alloc(54);
    bmpHeader.write('BM', 0); // Signature
    bmpHeader.writeUInt32LE(54 + imageData.length, 2); // File size
    bmpHeader.writeUInt32LE(54, 10); // Offset to pixel data
    bmpHeader.writeUInt32LE(40, 14); // Header size
    bmpHeader.writeInt32LE(width, 18); // Width
    bmpHeader.writeInt32LE(height, 22); // Height
    bmpHeader.writeUInt16LE(1, 26); // Planes
    bmpHeader.writeUInt16LE(24, 28); // Bits per pixel
    bmpHeader.writeUInt32LE(imageData.length, 34); // Image size
    
    // Unir header y datos
    const bmpData = Buffer.concat([bmpHeader, imageData]);
    
    // Escribir archivo BMP (luego podemos convertirlo)
    fs.writeFileSync(filename.replace('.png', '.bmp'), bmpData);
    console.log(`✅ Archivo ${filename.replace('.png', '.bmp')} creado`);
    
    return filename.replace('.png', '.bmp');
}

// Generar todos los iconos necesarios
const icons = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' }
];

console.log('Generando iconos...');
icons.forEach(icon => {
    createPngIcon(icon.size, icon.name);
});

console.log('\n⚠️ Nota: Se han creado archivos BMP. Debes convertirlos a PNG usando:');
console.log('1. Un editor de imágenes (Paint, GIMP, etc.)');
console.log('2. Una herramienta en línea de conversión');
console.log('3. O abre el archivo final-solution.html en tu navegador para descargar los PNG directamente');