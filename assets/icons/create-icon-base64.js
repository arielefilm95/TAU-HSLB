// Generar el icono 144x144 como base64
function generateIcon144() {
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
    
    // Convertir a base64
    const dataURL = canvas.toDataURL('image/png');
    console.log('Base64 del icono 144x144:');
    console.log(dataURL);
    
    // Crear elemento para mostrar y descargar
    const img = document.createElement('img');
    img.src = dataURL;
    img.style.width = '144px';
    img.style.height = '144px';
    img.style.border = '2px solid #ddd';
    img.style.margin = '10px';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Descargar icon-144x144.png';
    downloadBtn.onclick = function() {
        const link = document.createElement('a');
        link.download = 'icon-144x144.png';
        link.href = dataURL;
        link.click();
    };
    
    document.body.innerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h1>Icono 144x144 Generado</h1>
            <p>El icono ha sido generado. Haz clic en el botón para descargarlo.</p>
        </div>
    `;
    document.body.appendChild(img);
    document.body.appendChild(downloadBtn);
    
    return dataURL;
}

// Ejecutar la función
generateIcon144();