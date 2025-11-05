# Guía de Despliegue - TAU Tamizaje Auditivo Universal

Este documento contiene las instrucciones para desplegar la aplicación TAU en diferentes plataformas.

## Opciones de Despliegue

### 1. GitHub Pages (Gratis y recomendado para empezar)

#### Pasos:

1. **Subir a GitHub**
   ```bash
   git remote add origin https://github.com/arielefilm95/TAU-HSLB.git
   git push -u origin master
   ```

2. **Configurar GitHub Pages**
   - Ve a tu repositorio: https://github.com/arielefilm95/TAU-HSLB
   - Ve a Settings > Pages
   - En "Source", selecciona "Deploy from a branch"
   - Selecciona la rama `master` y la carpeta `/root`
   - Haz clic en "Save"

3. **URL esperada de GitHub Pages**
   - Tu aplicación estaría en: `https://arielefilm95.github.io/TAU-HSLB`
   - Si no funciona, usa Vercel (recomendado)

4. **Actualizar URLs en Supabase**
   - Ve a tu proyecto Supabase > Authentication > Settings
   - Actualiza "Site URL" a: `https://arielefilm95.github.io/TAU-HSLB`
   - Añade esta URL a "Redirect URLs"

5. **Actualizar Service Worker**
   - Modifica `sw.js` para que las URLs sean relativas al dominio correcto

#### Ventajas:
- Gratis
- Fácil configuración
- Integración con Git
- HTTPS automático

#### Desventajas:
- Solo para sitios estáticos
- Limitaciones de bandwidth

### 2. Vercel (Recomendado para producción)

#### Pasos:

1. **Ve a [Vercel](https://vercel.com)**
   - Haz clic en "Sign up" o "Login with GitHub"
   - Conecta tu cuenta de GitHub

2. **Importa tu repositorio**
   - Haz clic en "Add New..." → "Project"
   - Busca y selecciona `TAU-HSLB`
   - Haz clic en "Import"

3. **Configura el despliegue**
   - Framework Preset: "Other"
   - Root Directory: "."
   - Build Command: (dejar vacío)
   - Output Directory: "."
   - Haz clic en "Deploy"

4. **URL obtenida**
   - Tu aplicación estará en: `https://tau-hslb.vercel.app`
   - Vercel asigna automáticamente este dominio

5. **Configurar variables de entorno** (opcional)
   - Ve al dashboard de Vercel
   - Configura `SUPABASE_URL` y `SUPABASE_ANON_KEY`

#### Ventajas:
- Gratis para uso personal
- Despliegue automático con Git
- CDN global
- Dominios personalizados gratuitos

### 3. Netlify

#### Pasos:

1. **Crear cuenta en [Netlify](https://netlify.com)**

2. **Conectar repositorio GitHub**

3. **Configurar build settings**
   - Build command: `echo "No build needed"`
   - Publish directory: `.`

4. **Configurar variables de entorno**
   - Ve a Site settings > Environment variables
   - Añade `SUPABASE_URL` y `SUPABASE_ANON_KEY`

#### Ventajas:
- Gratis para uso personal
- Formularios gratuitos
- Funciones serverless
- Despliegue automático

### 4. Hosting Tradicional (cPanel, Plesk, etc.)

#### Pasos:

1. **Subir archivos**
   - Sube todos los archivos al servidor vía FTP o File Manager
   - Asegúrate de mantener la estructura de directorios

2. **Configurar Supabase**
   - Actualiza las URLs en `js/auth.js`
   - Configura los dominios permitidos en Supabase

3. **Configurar HTTPS**
   - Instala certificado SSL (Let's Encrypt es gratuito)

## Configuración de Producción

### 1. Actualizar URLs de Supabase

```javascript
// En js/auth.js
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-production-key';
```

### 2. Configurar URLs en Supabase Authentication

**Si usas GitHub Pages:**
- Site URL: `https://arielefilm95.github.io/TAU-HSLB`
- Redirect URLs: `https://arielefilm95.github.io/TAU-HSLB`

**Si usas Vercel (recomendado):**
- Site URL: `https://tau-hslb.vercel.app`
- Redirect URLs: `https://tau-hslb.vercel.app`

### 2. Configurar PWA para producción

```json
// En manifest.json
{
  "start_url": "/",
  "scope": "/",
  "display": "standalone"
}
```

### 3. Optimizar Service Worker

```javascript
// En sw.js - actualizar cache para producción
const CACHE_NAME = 'tau-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  // ... otros archivos
];
```

## Seguridad en Producción

### 1. Configurar CORS en Supabase

```sql
-- En SQL Editor de Supabase
ALTER POLICY "Usuarios autenticados pueden ver madres" ON madres
  FOR SELECT USING (auth.role() = 'authenticated' AND 
    (current_setting('request.headers')::jsonb->>'origin') = 'https://tudominio.com');
```

### 2. Configurar Headers de Seguridad

```html
<!-- En index.html y otras páginas -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

### 3. Configurar HTTPS

- Asegúrate de que todo el sitio use HTTPS
- Redirige HTTP a HTTPS
- Configura HSTS headers

## Monitoreo y Mantenimiento

### 1. Configurar Analytics

Opciones:
- Google Analytics (gratis)
- Plausible (privado)
- Supabase Analytics

### 2. Configurar Error Tracking

```javascript
// En utils.js
function reportError(error) {
  console.error('Error reportado:', error);
  // Enviar a servicio de error tracking
  if (window.gtag) {
    gtag('event', 'exception', {
      description: error.message,
      fatal: false
    });
  }
}
```

### 3. Configurar Backups

- Backups automáticos de Supabase
- Backups regulares de archivos estáticos
- Documentación de recuperación

## Checklist de Despliegue

- [ ] Configurar dominio y HTTPS
- [ ] Actualizar URLs en Supabase
- [ ] Configurar variables de entorno
- [ ] Probar funcionalidad completa
- [ ] Verificar PWA installation
- [ ] Probar offline functionality
- [ ] Configurar analytics
- [ ] Configurar error tracking
- [ ] Documentar acceso administrativo
- [ ] Configurar backups
- [ ] Probar en diferentes dispositivos
- [ ] Verificar velocidad de carga
- [ ] Configurar monitoreo

## Solución de Problemas Comunes

### 1. Problemas con Service Worker

```javascript
// Para limpiar cache antiguo
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### 2. Problemas con CORS

```javascript
// En auth.js - configurar headers
const { data, error } = await supabase
  .from('madres')
  .select('*')
  .headers({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  });
```

### 3. Problemas con PWA

```javascript
// Verificar instalación de PWA
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA puede ser instalada');
  // Mostrar botón de instalación
});
```

## Soporte

Si tienes problemas durante el despliegue:

1. Revisa la consola del navegador
2. Verifica los logs de Supabase
3. Consulta la documentación de la plataforma de hosting
4. Revisa las políticas de seguridad de Supabase
5. Verifica la configuración de CORS