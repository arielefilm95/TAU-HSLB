// Script para generar iconos profesionales para TAU PWA
const fs = require('fs');
const path = require('path');

// Lista de tamaños necesarios para PWA
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

// Función para crear un canvas y generar el icono
function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Gradiente de fondo
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#3498db');
    
    // Fondo circular
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Oído estilizado
    const earX = size * 0.35;
    const earY = size * 0.4;
    const earWidth = size * 0.15;
    const earHeight = size * 0.25;
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    
    // Forma del oído
    ctx.beginPath();
    ctx.ellipse(earX, earY, earWidth/2, earHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Detalles del oído (círculos internos)
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(earX - 5, earY, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(earX + 5, earY + 5, size * 0.015, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(earX - 8, earY + 8, size * 0.012, 0, Math.PI * 2);
    ctx.fill();
    
    // Ondas sonoras
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Primera onda
    ctx.beginPath();
    ctx.globalAlpha = 0.9;
    ctx.moveTo(earX + earWidth, earY - 10);
    ctx.quadraticCurveTo(earX + earWidth + 20, earY - 20, earX + earWidth + 30, earY - 10);
    ctx.stroke();
    
    // Segunda onda
    ctx.beginPath();
    ctx.globalAlpha = 0.8;
    ctx.moveTo(earX + earWidth + 5, earY);
    ctx.quadraticCurveTo(earX + earWidth + 25, earY - 10, earX + earWidth + 40, earY);
    ctx.stroke();
    
    // Tercera onda
    ctx.beginPath();
    ctx.globalAlpha = 0.7;
    ctx.moveTo(earX + earWidth + 10, earY + 10);
    ctx.quadraticCurveTo(earX + earWidth + 30, earY, earX + earWidth + 50, earY + 10);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    
    // Texto TAU
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.12}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAU', size/2, size * 0.68);
    
    // Subtítulo
    ctx.font = `${size * 0.04}px Arial`;
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Tamizaje Auditivo', size/2, size * 0.75);
    
    // Cruz médica decorativa
    const crossX = size * 0.65;
    const crossY = size * 0.35;
    const crossSize = size * 0.03;
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(crossX - crossSize/2, crossY - crossSize, crossSize, crossSize * 2);
    ctx.fillRect(crossX - crossSize, crossY - crossSize/2, crossSize * 2, crossSize);
    
    return canvas;
}

// Función para descargar el icono
function downloadIcon(canvas, filename) {
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Generar todos los iconos
function generateAllIcons() {
    console.log('Generando iconos profesionales para TAU PWA...');
    
    iconSizes.forEach(icon => {
        const canvas = generateIcon(icon.size);
        downloadIcon(canvas, icon.name);
        console.log(`Icono ${icon.name} generado`);
    });
    
    console.log('Todos los iconos han sido generados exitosamente');
}

// Si estamos en un entorno de navegador
if (typeof window !== 'undefined') {
    window.generateProfessionalIcons = generateAllIcons;
    console.log('Ejecuta generateProfessionalIcons() para generar todos los iconos');
}

// Si estamos en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateIcon, generateAllIcons };
}