# Solución de Errores - TAU App

## Problemas Identificados

### 1. Error de Supabase: `Cannot read properties of undefined (reading 'createClient')`

**Causa:** La librería de Supabase no estaba siendo cargada en los archivos HTML.

**Solución Aplicada:**
- Se agregó la librería de Supabase CDN en todos los archivos HTML:
  - `index.html`
  - `signup.html`
  - `dashboard.html`

```html
<!-- Agregado antes de los scripts personalizados -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 2. Error de Iconos PWA: `GET https://arielefilm95.github.io/TAU-HSLB/assets/icons/icon-144x144.png 404 (Not Found)`

**Causa:** Los iconos para la PWA no existen en la carpeta `assets/icons/`.

**Solución Proporcionada:**

#### Opción A: Usar el generador automático (Recomendado)
1. Abre el archivo `assets/icons/create-icon-144.html` en tu navegador
2. Haz clic en "Descargar Icono" para obtener el `icon-144x144.png`
3. Para todos los iconos, haz clic en "Crear Todos los Iconos"

#### Opción B: Usar el generador completo
1. Abre `assets/icons/generate-all-icons.html` en tu navegador
2. Haz clic en "Generar Iconos"
3. Descarga cada icono individualmente o usa "Descargar Todos (ZIP)"

#### Opción C: Crear iconos manualmente
1. Abre `assets/icons/create-basic-icon.js` en la consola del navegador
2. Ejecuta `createAllIcons()` para generar todos los iconos

## Configuración de Supabase

**IMPORTANTE:** Debes configurar tus credenciales reales de Supabase en `js/auth.js`:

```javascript
const SUPABASE_URL = 'https://tu-proyecto-real.supabase.co'; // Reemplazar con tu URL
const SUPABASE_ANON_KEY = 'tu-anon-key-real'; // Reemplazar con tu clave anónima
```

### Pasos para configurar Supabase:

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto o usa uno existente
3. Copia la URL del proyecto y la clave `anon` desde Settings > API
4. Actualiza las constantes en `js/auth.js`
5. Configura las tablas siguiendo las instrucciones en `supabase-setup.md`

## Verificación

Después de aplicar las soluciones:

1. **Para el error de Supabase:**
   - Abre la consola del navegador en cualquier página
   - Ya no debería aparecer el error `Cannot read properties of undefined (reading 'createClient')`

2. **Para los iconos:**
   - Abre `assets/icons/create-icon-144.html`
   - Descarga los iconos faltantes
   - Colócalos en la carpeta `assets/icons/`
   - Los errores 404 deberían desaparecer

## Archivos Creados para Solución

- `assets/icons/create-icon-144.html` - Generador simple para el icono 144x144
- `assets/icons/generate-all-icons.html` - Generador completo para todos los iconos
- `assets/icons/create-basic-icon.js` - Script para crear iconos desde consola
- `assets/icons/icon-144x144.svg` - Versión SVG del icono principal
- `SOLUCION_ERRORES.md` - Este archivo con las instrucciones

## Notas Adicionales

- Los iconos generados tienen un diseño simple con el texto "TAU" sobre un fondo azul oscuro (#2c3e50)
- Puedes personalizar los iconos editando los scripts de generación
- Asegúrate de que todos los iconos estén en la carpeta correcta antes de desplegar la aplicación