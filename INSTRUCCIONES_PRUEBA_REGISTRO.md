# Instrucciones para Probar el Registro de Usuarios

## Problemas Identificados y Solucionados

1. **Problema de inicialización de Supabase**: El script `auth.js` se cargaba antes de que la librería de Supabase estuviera disponible.
2. **Bucle de redirección**: El usuario ya autenticado era redirigido continuamente al dashboard.
3. **Manejo de errores**: El proceso de registro no informaba correctamente sobre los errores.
4. **Creación de perfiles**: No se verificaba correctamente si el perfil se creaba en la tabla `perfiles`.

## Pasos para Probar el Sistema

### 1. Probar con la Página de Prueba Simple

1. Abre el archivo `test-registro-simple.html` en tu navegador
2. Verifica que aparezca el mensaje "✅ Sistema listo para pruebas"
3. Haz clic en "Registrar Usuario"
4. Observa los mensajes en la página y en la consola del navegador

### 2. Probar con la Página de Registro Original

1. Abre `https://arielefilm95.github.io/TAU-HSLB/signup.html`
2. Limpia el caché del navegador (Ctrl+F5 o Cmd+Shift+R)
3. Intenta registrar un nuevo usuario con:
   - Nombre: Usuario Test
   - Email: usa un email único (ej: test+tuinicial@example.com)
   - Contraseña: 123456

### 3. Verificar en Supabase

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto: `oywepfjbzvnzvcnqtlnv`
3. En **Authentication > Users**, verifica que el nuevo usuario aparezca
4. En **Table Editor > perfiles**, verifica que el perfil del usuario se haya creado

## Si el Registro No Funciona

### Verificación de Configuración en Supabase

Ejecuta el script `diagnosticar-supabase.sql` en el SQL Editor de Supabase para verificar:

1. Que la tabla `perfiles` exista
2. Que las políticas RLS estén configuradas
3. Que el trigger `on_auth_user_created` esté activo
4. Que no haya inconsistencias entre usuarios y perfiles

### Configuración de URLs

Asegúrate de que las siguientes URLs estén configuradas en **Authentication > Settings**:

- Site URL: `https://arielefilm95.github.io/TAU-HSLB/`
- Redirect URLs:
  - `https://arielefilm95.github.io/TAU-HSLB/`
  - `https://arielefilm95.github.io/TAU-HSLB/signup.html`
  - `https://arielefilm95.github.io/TAU-HSLB/index.html`
  - `https://arielefilm95.github.io/TAU-HSLB/dashboard.html`

### Problemas Comunes y Soluciones

1. **"Usuario ya existe"**: Usa un email diferente cada vez que pruebes
2. **"Error de conexión"**: Verifica que las credenciales de Supabase sean correctas
3. **"No se redirige"**: Limpia el caché del navegador y vuelve a intentar
4. **"El perfil no se crea"**: Ejecuta el script `reparar-trigger.sql`

## Logs Importantes

Observa estos mensajes en la consola del navegador:

- `🚀 Iniciando carga de signup.html`
- `📦 Supabase disponible: true`
- `📜 Auth.js cargado correctamente`
- `🔧 Inicializando Supabase...`
- `📝 Formulario de registro encontrado, agregando event listener`
- `🚀 Formulario de registro enviado`
- `✅ Todas las validaciones pasaron, iniciando registro...`

## Si Todo Funciona Correctamente

1. El usuario debería aparecer en Authentication > Users
2. El perfil debería aparecer en Table Editor > perfiles
3. Después del registro, deberías ser redirigido a dashboard.html
4. En el dashboard, deberías ver tu nombre en la esquina superior derecha

## Contacto

Si después de seguir estos pasos el registro aún no funciona, revisa:

1. La consola del navegador para errores específicos
2. La pestaña Network del navegador para ver las peticiones a Supabase
3. Los logs de tu proyecto en Supabase Dashboard