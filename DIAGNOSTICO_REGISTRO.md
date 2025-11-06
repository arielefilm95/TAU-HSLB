# Guía de Diagnóstico para Registro de Usuarios TAU

## Problema Actual
El formulario de registro no está creando usuarios en Supabase, solo muestra advertencias de autocomplete en la consola.

## Pasos para Diagnosticar y Solucionar

### Paso 1: Verificar Logs Detallados
1. Abre `signup.html` en tu navegador
2. Abre la consola de desarrollador (F12)
3. Limpia la consola (ícono de basura)
4. Intenta registrar un nuevo usuario con estos datos:
   - Nombre: Test Usuario
   - Email: test@ejemplo.com 
   - Contraseña: 123456
   - Confirmar: 123456

5. **COPIA Y PEGA** todos los mensajes que aparecen en la consola (incluyendo los emojis 🚀📝✅❌)

### Paso 2: Verificar Configuración de Supabase
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto `oywepfjbzvnzvcnqtlnv`
3. Ve a **SQL Editor**
4. Ejecuta esta consulta para verificar si la tabla existe:

```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'perfiles';
```

5. Si no devuelve resultados, ejecuta el script `verificar-tablas.sql`

### Paso 3: Probar con Página de Diagnóstico
1. Abre `test-registro.html` en tu navegador
2. Haz clic en "Probar Registro"
3. Revisa los logs que aparecen en la página
4. **COPIA Y PEGA** los resultados

### Paso 4: Verificar Configuración de Auth
En tu proyecto Supabase:
1. Ve a **Authentication** > **Settings**
2. Verifica que "Site URL" contenga: `http://localhost:3000`
3. En "Redirect URLs", asegúrate de tener:
   - `http://localhost:3000`
   - `http://localhost:3000/*`

### Paso 5: Verificar Usuarios Creados
1. En Supabase, ve a **Authentication** > **Users**
2. Revisa si hay algún usuario nuevo
3. Si hay usuarios, ve a **Table Editor** > **perfiles**
4. Revisa si hay perfiles correspondientes

## Problemas Comunes y Soluciones

### Problema 1: Tabla perfiles no existe
**Síntomas**: Error "relation 'perfiles' does not exist"
**Solución**: Ejecutar el script `verificar-tablas.sql`

### Problema 2: Políticas RLS bloqueando inserción
**Síntomas**: Error "permission denied for table perfiles"
**Solución**: El script `verificar-tablas.sql` también soluciona esto

### Problema 3: Configuración de CORS
**Síntomas**: Error de CORS en la consola
**Solución**: Configurar URLs en Authentication > Settings

### Problema 4: Credenciales incorrectas
**Síntomas**: Error 401 o 403
**Solución**: Verificar que las credenciales en `js/auth.js` sean correctas

## Qué Reportar
Cuando pidas ayuda, incluye:
1. Todos los logs de la consola (de signup.html)
2. Resultados de la consulta SQL sobre la tabla perfiles
3. Logs de la página test-registro.html
4. Capturas de pantalla de la configuración de Authentication en Supabase

## Herramientas Creadas
- `verificar-tablas.sql`: Script para crear/verificar tablas
- `test-registro.html`: Página de diagnóstico con logs detallados
- Logs mejorados en `signup.html` y `js/auth.js`

## Siguiente Paso
Después de seguir estos pasos, tendrás información detallada sobre dónde está el problema y podremos solucionarlo específicamente.