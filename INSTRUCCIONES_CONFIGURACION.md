# Instrucciones para Configurar la Aplicación TAU en GitHub Pages

## Problemas Actuales

1. **Iconos faltantes**: ✅ SOLUCIONADO
   - Se han creado los iconos necesarios para GitHub Pages

2. **Credenciales de Supabase**: ❌ PENDIENTE
   - Las credenciales en `js/auth.js` son placeholders
   - Necesitas configurar tus credenciales reales

3. **Login no funciona**: ❌ PENDIENTE
   - Debido a que las credenciales de Supabase no están configuradas

## Pasos para Solucionar

### 1. Configurar Supabase

Si aún no tienes un proyecto en Supabase:

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto llamado "tau-tamizaje-auditivo"
4. Espera a que el proyecto esté listo

### 2. Obtener Credenciales

Una vez creado el proyecto:

1. Ve a Settings > API en tu proyecto Supabase
2. Copia la URL del proyecto y la clave `anon` (pública)
3. Actualiza estas líneas en `js/auth.js`:

```javascript
const SUPABASE_URL = 'https://tu-proyecto-real.supabase.co'; // Reemplazar con tu URL
const SUPABASE_ANON_KEY = 'tu-anon-key-real'; // Reemplazar con tu clave anónima
```

### 3. Configurar Autenticación en Supabase

1. Ve a Authentication > Settings
2. En "Site URL", configura: `https://arielefilm95.github.io/TAU-HSLB`
3. En "Redirect URLs", añade:
   - `https://arielefilm95.github.io/TAU-HSLB`
   - `https://arielefilm95.github.io/TAU-HSLB/dashboard.html`

### 4. Crear Tablas en Supabase

Ve al SQL Editor y ejecuta el script del archivo `supabase-tablas-completas.sql`

### 5. Actualizar GitHub Pages

1. Haz commit de los cambios:
   ```bash
   git add .
   git commit -m "Configurar credenciales de Supabase"
   git push
   ```

2. Espera a que GitHub Pages se actualice (puede tardar unos minutos)

### 6. Probar la Aplicación

1. Ve a: https://arielefilm95.github.io/TAU-HSLB
2. Intenta registrar un nuevo usuario
3. Verifica que puedas iniciar sesión

## Si ya tienes un proyecto Supabase

Si ya tienes un proyecto Supabase:

1. Ve a tu proyecto > Settings > API
2. Copia la URL y la clave anónima
3. Actualiza `js/auth.js` con esas credenciales
4. Asegúrate de que las URLs de redirección incluyan tu dominio de GitHub Pages

## Verificación

Después de configurar:

1. Abre la consola del navegador en tu aplicación
2. Deberías ver "Supabase inicializado correctamente"
3. El formulario de registro debería funcionar
4. El login debería redirigir al dashboard

## Ayuda Adicional

- Revisa el archivo `supabase-setup.md` para más detalles
- Consulta la documentación de Supabase si tienes problemas
- Verifica los logs de tu proyecto Supabase para errores