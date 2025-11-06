# Instrucciones para Despliegue y Prueba en GitHub Pages

## Problema Identificado
Estás probando localmente, pero tu PWA está configurada para funcionar con GitHub Pages y Supabase. Algunas funcionalidades no trabajan correctamente localmente debido a:

1. **Restricciones de CORS** en Supabase
2. **Service Workers** que requieren HTTPS
3. **Rutas relativas** que funcionan diferente en local vs producción

## Solución: Despliegue en GitHub Pages

### Paso 1: Subir los cambios a GitHub

```bash
# Agregar todos los cambios modificados
git add .

# Hacer commit con mensaje descriptivo
git commit -m "Corregir botón registrar y errores de sintaxis"

# Subir a GitHub
git push origin main
```

### Paso 2: Verificar el despliegue

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** > **Pages**
3. Verifica que esté activado el despliegue desde la rama `main`
4. Espera unos minutos a que GitHub Pages se actualice

### Paso 3: Probar en producción

Visita tu PWA en: https://arielefilm95.github.io/TAU-HSLB/dashboard.html

### Paso 4: Verificar en la consola

Abre la consola de desarrollador (F12) y busca estos mensajes:

```
✅ Supabase inicializado correctamente
🚀 Iniciando carga de scripts del dashboard...
✅ Script cargado: js/dashboard.js?v=...
✅ Script cargado: js/madres.js?v=...
✅ Script cargado: js/eoa.js?v=...
✅ Todos los scripts cargados
🔧 Verificando si dashboard está disponible...
window.dashboard: object
🔧 Dashboard encontrado, inicializando...
🔧 Inicializando dashboard...
✅ Dashboard inicializado correctamente
🔧 Verificando event listeners...
🔧 Configurando event listeners manualmente...
✅ Event listener para botón registrar madre configurado
```

### Paso 5: Probar el botón

1. Haz clic en el botón **"Registrar"**
2. Deberías ver en la consola: `🖱️ Botón registrar madre clickeado`
3. El modal debería abrirse mostrando el formulario

## Configuración de Supabase para GitHub Pages

Asegúrate de que en tu proyecto de Supabase tengas configurado:

1. **Authentication Settings** > **URL Configuration**:
   - Site URL: `https://arielefilm95.github.io/TAU-HSLB`
   - Redirect URLs: `https://arielefilm95.github.io/TAU-HSLB/**`

2. **Database Settings** > **RLS Policies**:
   - Asegúrate de que las políticas permitan acceso desde tu dominio de GitHub Pages

## Si aún no funciona en GitHub Pages

### Verificar errores de red
En la consola, busca errores como:
- `CORS policy` 
- `Failed to load resource`
- `Network error`

### Verificar configuración de Supabase
1. Ve a tu proyecto en Supabase
2. Revisa que las credenciales en `dashboard.html` sean correctas
3. Verifica que las tablas `madres` y `examenes_eoa` existan

### Probar con el archivo de test
1. Sube también el archivo `test-botones.html` a GitHub
2. Visita: https://arielefilm95.github.io/TAU-HSLB/test-botones.html
3. Este archivo te dará diagnóstico detallado

## Diferencias clave entre Local y Producción

| Característica | Local | GitHub Pages |
|---------------|---------|--------------|
| Supabase CORS | ❌ Bloqueado | ✅ Permitido |
| Service Worker | ❌ Requiere HTTPS | ✅ Funciona |
| Rutas de archivos | Relativas | Absolutas |
| Caché | ❌ No aplica | ✅ Activo |

## Recomendación

**No pruebes localmente funcionalidades que dependan de:**
- Supabase (base de datos)
- Service Workers (PWA)
- Autenticación

**Prueba localmente solo:**
- HTML y CSS básicos
- Lógica JavaScript pura
- Diseño responsive

Para probar funcionalidades completas, siempre usa el entorno de GitHub Pages.