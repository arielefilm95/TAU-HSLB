// Script para crear todos los iconos PNG faltantes
const fs = require('fs');

// Función para crear un archivo PNG simple
function createSimplePng(size, filename) {
    // Crear un archivo PNG mínimo con el color azul #2c3e50
    const width = size;
    const height = size;
    
    // Cabecera PNG
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // Chunk IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;   // Bit depth
    ihdrData[9] = 2;   // Color type: RGB
    ihdrData[10] = 0;  // Compression method
    ihdrData[11] = 0;  // Filter method
    ihdrData[12] = 0;  // Interlace method
    
    const ihdrCrc = calculateCRC(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]),
        Buffer.from('IHDR'),
        ihdrData,
        ihdrCrc
    ]);
    
    // Datos de imagen (fondo azul #2c3e50)
    const pixelData = Buffer.alloc(width * height * 3);
    for (let i = 0; i < pixelData.length; i += 3) {
        pixelData[i] = 80;      // R
        pixelData[i + 1] = 62;   // G
        pixelData[i + 2] = 44;   // B
    }
    
    // Datos de fila (con filtro 0)
    const rowData = Buffer.alloc((height * (width * 3 + 1)));
    for (let y = 0; y < height; y++) {
        rowData[y * (width * 3 + 1)] = 0; // Filtro
        pixelData.copy(rowData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
    }
    
    // Comprimir datos (sin compresión real para simplificar)
    const idatData = Buffer.concat([
        Buffer.from([0x78, 0x01]), // zlib header (no compression)
        rowData,
        Buffer.from([0x00, 0x00, 0x00, 0x00]) // Adler-32 checksum (simplificado)
    ]);
    
    const idatCrc = calculateCRC(Buffer.concat([Buffer.from('IDAT'), idatData]));
    const idatChunk = Buffer.concat([
        Buffer.alloc(4),
        Buffer.from('IDAT'),
        idatData,
        idatCrc
    ]);
    idatChunk.writeUInt32BE(idatData.length, 0);
    
    // Chunk IEND
    const iendCrc = calculateCRC(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('IEND'),
        iendCrc
    ]);
    
    // Unir todo
    const pngData = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
    fs.writeFileSync(filename, pngData);
    console.log(`✅ ${filename} creado`);
}

function calculateCRC(data) {
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
        }
        crcTable[i] = crc;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    const result = Buffer.alloc(4);
    result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
    return result;
}

// Generar todos los iconos necesarios
const icons = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' }
];

console.log('Generando iconos PNG...');
icons.forEach(icon => {
    createSimplePng(icon.size, icon.name);
});

console.log('\n✅ Todos los iconos han sido creados');
console.log('Nota: Estos son iconos básicos con fondo azul. Para iconos con texto "TAU", usa final-solution.html');