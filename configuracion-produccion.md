# Configuración para Producción - TAU PWA

## Cambios necesarios antes del despliegue

### 1. Actualizar URLs en Supabase

Ve a tu proyecto Supabase > Authentication > Settings y actualiza:

**Si usas Vercel (recomendado):**
- Site URL: `https://tau-hslb.vercel.app`
- Redirect URLs: 
  - `https://tau-hslb.vercel.app`
  - `https://tau-hslb.vercel.app/dashboard.html`

**Si usas GitHub Pages:**
- Site URL: `https://arielefilm95.github.io/TAU-HSLB`
- Redirect URLs:
  - `https://arielefilm95.github.io/TAU-HSLB`
  - `https://arielefilm95.github.io/TAU-HSLB/dashboard.html`

### 2. Archivos que necesitan actualización

#### config/supabase-config.js
Actualizar las URLs de redirección en la línea 12-17:

```javascript
REDIRECT_URLS: [
    'http://localhost:3000',
    'http://localhost:3000/dashboard.html',
    'https://tau-hslb.vercel.app',        // Cambiar esta línea
    'https://tau-hslb.vercel.app/dashboard.html'  // Cambiar esta línea
],
```

#### js/auth.js
Actualizar la URL de redirección en las líneas 49-51:

```javascript
redirectTo: window.supabaseConfig.isProduction()
    ? 'https://tau-hslb.vercel.app/dashboard.html'  // Cambiar esta línea
    : 'http://localhost:3000/dashboard.html'
```

### 3. Verificación del Service Worker

El service worker (`sw.js`) ya está configurado con URLs relativas, por lo que debería funcionar sin cambios en cualquier dominio.

### 4. Manifest.json

El archivo manifest.json ya está configurado correctamente con `start_url: "./index.html"` y `scope: "./"`, por lo que funcionará en cualquier dominio.

## Pasos para despliegue en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu cuenta de GitHub
3. Importa el repositorio `TAU-HSLB`
4. Configura:
   - Framework Preset: "Other"
   - Root Directory: "."
   - Build Command: (dejar vacío)
   - Output Directory: "."
5. Haz clic en "Deploy"

## Pasos para despliegue en GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings > Pages
3. Source: "Deploy from a branch"
4. Branch: `master` y carpeta `/root`
5. Save

## Verificación post-despliegue

Una vez desplegado, verifica:

1. **Instalación de PWA**: Abre la app en Chrome móvil y busca el ícono "Añadir a pantalla de inicio"
2. **Funcionalidad offline**: Desconéctate de internet y navega por la app
3. **Notificaciones push**: Prueba el sistema de notificaciones
4. **Sincronización**: Verifica que los datos se guarden correctamente en Supabase
5. **Responsive**: Prueba en diferentes tamaños de pantalla

## Testing final

- [ ] Probar en móvil Android (Chrome)
- [ ] Probar en móvil iOS (Safari)
- [ ] Probar en tablet
- [ ] Probar en escritorio (Chrome, Firefox, Safari)
- [ ] Verificar instalación como PWA
- [ ] Probar funcionalidad completa offline
- [ ] Verificar sincronización cuando vuelve la conexión