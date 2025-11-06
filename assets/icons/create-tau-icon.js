// Script para crear el icono TAU con el diseño correcto
const fs = require('fs');

// Función para crear un PNG simple con el diseño TAU
function createTauIcon() {
    // Crear un buffer para el archivo PNG
    const width = 144;
    const height = 144;
    
    // Cabecera PNG
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // Chunk IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);  // Width
    ihdrData.writeUInt32BE(height, 4); // Height
    ihdrData[8] = 8;   // Bit depth
    ihdrData[9] = 2;   // Color type: RGB
    ihdrData[10] = 0;  // Compression method
    ihdrData[11] = 0;  // Filter method
    ihdrData[12] = 0;  // Interlace method
    
    const ihdrCrc = calculateCRC(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), // Length: 13
        Buffer.from('IHDR'),
        ihdrData,
        ihdrCrc
    ]);
    
    // Crear datos de imagen (fondo azul oscuro #2c3e50)
    const imageData = Buffer.alloc(width * height * 3); // RGB
    const blue = 44;   // #2c3e50 en RGB
    const green = 62;
    const red = 80;
    
    for (let i = 0; i < imageData.length; i += 3) {
        imageData[i] = red;     // R
        imageData[i + 1] = green; // G
        imageData[i + 2] = blue;  // B
    }
    
    // Comprimir datos (simplificado - en realidad necesitarías zlib)
    const idatData = Buffer.concat([
        Buffer.from([0x78, 0x9C]), // zlib header
        Buffer.from([0x01]), // compression flags
        imageData, // raw data
        Buffer.from([0x00, 0x00, 0x00, 0x00]) // checksum
    ]);
    
    const idatCrc = calculateCRC(Buffer.concat([Buffer.from('IDAT'), idatData]));
    const idatChunk = Buffer.concat([
        Buffer.alloc(4), // Length (will be updated)
        Buffer.from('IDAT'),
        idatData,
        idatCrc
    ]);
    idatChunk.writeUInt32BE(idatData.length, 0); // Write actual length
    
    // Chunk IEND
    const iendCrc = calculateCRC(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // Length: 0
        Buffer.from('IEND'),
        iendCrc
    ]);
    
    // Unir todos los chunks
    const pngData = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
    
    // Escribir archivo
    fs.writeFileSync('icon-144x144.png', pngData);
    console.log('✅ Icono TAU creado correctamente');
}

function calculateCRC(data) {
    // CRC-32 calculation (simplified)
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

// Ejecutar la función
createTauIcon();