#!/bin/bash

echo "🚀 Iniciando despliegue a GitHub Pages..."

# Verificar si estamos en el directorio correcto
if [ ! -f "dashboard.html" ]; then
    echo "❌ Error: No se encuentra dashboard.html. Asegúrate de estar en el directorio del proyecto."
    exit 1
fi

# Agregar todos los cambios
echo "📝 Agregando cambios al git..."
git add .

# Mostrar cambios
echo "📋 Cambios a commitear:"
git status --short

# Pedir mensaje de commit
echo ""
echo "💬 Ingresa un mensaje para el commit (o presiona Enter para usar el predeterminado):"
read -p "> " commit_message

# Usar mensaje predeterminado si no se proporciona uno
if [ -z "$commit_message" ]; then
    commit_message="Corregir botón registrar y errores de sintaxis - $(date +%Y-%m-%d)"
fi

# Hacer commit
echo "💾 Haciendo commit..."
git commit -m "$commit_message"

# Subir a GitHub
echo "⬆️ Subiendo a GitHub..."
git push origin main

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🌐 Tu PWA estará disponible en:"
echo "https://arielefilm95.github.io/TAU-HSLB/dashboard.html"
echo ""
echo "⏳ Espera 1-2 minutos a que GitHub Pages se actualice..."
echo ""
echo "🔍 Para verificar, abre la URL y revisa la consola (F12)"
echo ""