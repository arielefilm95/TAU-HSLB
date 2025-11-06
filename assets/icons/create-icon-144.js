// Función para crear y descargar el icono de 144x144px
function createIcon144() {
    const canvas = document.createElement('canvas');
    canvas.width = 144;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    
    // Fondo azul oscuro
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 144, 144);
    
    // Texto "TAU" en blanco
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 43px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAU', 72, 72);
    
    // Convertir a blob y descargar
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'icon-144x144.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Icono icon-144x144.png creado y descargado');
    }, 'image/png');
}

// Ejecutar la función
createIcon144();