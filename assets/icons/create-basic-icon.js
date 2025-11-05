// Script para crear un icono básico usando Canvas API
// Este script se puede ejecutar directamente en la consola del navegador

function createBasicIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 144;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    
    // Fondo azul oscuro
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 144, 144);
    
    // Texto "TAU" en blanco
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAU', 72, 72);
    
    // Convertir a data URL y descargar
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'icon-144x144.png';
    link.href = dataURL;
    link.click();
    
    return dataURL;
}

// Función para crear todos los iconos necesarios
function createAllIcons() {
    const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
    const names = ['favicon-16x16.png', 'favicon-32x32.png', 'icon-72x72.png', 
                   'icon-96x96.png', 'icon-128x128.png', 'icon-144x144.png', 
                   'icon-152x152.png', 'icon-192x192.png', 'icon-384x384.png', 
                   'icon-512x512.png'];
    
    sizes.forEach((size, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
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
        
        // Descargar automáticamente
        setTimeout(() => {
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = names[index];
            link.href = dataURL;
            link.click();
        }, index * 200); // Pequeño retraso entre descargas
    });
}

// Ejecutar automáticamente
console.log('Para crear el icono básico, ejecuta: createBasicIcon()');
console.log('Para crear todos los iconos, ejecuta: createAllIcons()');

// Crear el icono 144x144 automáticamente
createBasicIcon();