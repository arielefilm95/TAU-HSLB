# Instrucciones para Probar el Funcionamiento del Dashboard

## Problemas Identificados y Solucionados

1. **Botón de cerrar sesión no funcionaba**: El event listener se establecía antes de que el botón existiera en el DOM.
2. **Botón de agregar madre no funcionaba**: Los scripts se cargaban de forma asíncrona sin un orden específico.
3. **Error en eoa.js**: Variable `r` no definida en la línea 637.
4. **Inicialización incorrecta del dashboard**: La función `initDashboard()` se llamaba antes de que todos los scripts estuvieran cargados.

## Cambios Realizados

### 1. auth.js
- Se eliminó el event listener del botón de cerrar sesión para evitar conflictos de timing.

### 2. dashboard.js
- Se agregó el event listener para el botón de cerrar sesión en la función `setupEventListeners()`.
- Se eliminó la llamada automática a `initDashboard()` desde `DOMContentLoaded`.

### 3. eoa.js
- Se corrigió el error en la línea 637 donde se usaba una variable `r` no definida.

### 4. dashboard.html
- Se mejoró la carga secuencial de scripts para asegurar que se carguen en el orden correcto.
- Se agregaron logs para depurar el proceso de carga.
- Se inicializa Supabase y el dashboard explícitamente después de cargar los scripts.

## Pasos para Probar

### 1. Limpiar Caché
Antes de probar, limpia completamente el caché del navegador:
- **Chrome/Ctrl+Shift+R** o **Cmd+Shift+R** (Mac)
- O abre la consola de desarrolladores, haz clic derecho en el botón de recargar y selecciona "Vaciar la caché y recargar de forma forzada"

### 2. Probar el Registro de Usuarios
1. Ve a `https://arielefilm95.github.io/TAU-HSLB/signup.html`
2. Registra un nuevo usuario con datos únicos
3. Verifica que seas redirigido al dashboard correctamente

### 3. Probar el Dashboard
1. Una vez en el dashboard, verifica:
   - Que tu nombre de usuario aparezca en la esquina superior derecha
   - Que los botones "Registrar Madre" y "Ver Madres" funcionen
   - Que el botón "Cerrar Sesión" funcione correctamente

### 4. Probar el Registro de Madres
1. Haz clic en "Registrar Madre"
2. Completa el formulario con datos de prueba:
   - RUT: 12.345.678-9
   - Número de Ficha: 12345
   - Sala: A101
   - Cama: 15
3. Haz clic en "Guardar"
4. Verifica que aparezca el mensaje de éxito y que la madre se agregue a la lista de registros recientes

### 5. Probar la Lista de Madres
1. Haz clic en "Ver Madres"
2. Verifica que se cargue la lista de madres registradas
3. Prueba la función de búsqueda
4. Haz clic en "Realizar EOA" para una madre y verifica que se abra el modal de examen

### 6. Probar el Cierre de Sesión
1. Haz clic en "Cerrar Sesión"
2. Verifica que seas redirigido a la página de login
3. Intenta acceder directamente al dashboard sin iniciar sesión para verificar que te redirija al login

## Logs Importantes en la Consola

Observa estos mensajes en la consola del navegador:

```
🚀 Iniciando carga de scripts del dashboard...
✅ Script cargado: js/auth.js
🔧 Inicializando Supabase desde dashboard...
✅ Script cargado: js/dashboard.js
🔧 Inicializando dashboard...
✅ Script cargado: js/madres.js
✅ Script cargado: js/eoa.js
✅ Todos los scripts cargados
```

## Si Algo No Funciona

### Botón de Cerrar Sesión No Funciona
- Verifica que aparezca el mensaje "✅ Script cargado: js/dashboard.js" en la consola
- Asegúrate de que el botón tenga el id="logoutBtn"

### Botón de Agregar Madre No Funciona
- Verifica que aparezca el mensaje "🔧 Inicializando dashboard..." en la consola
- Asegúrate de que el botón tenga el id="registrarMadreBtn"

### Errores en la Consola
- Si ves errores de "Cannot read property of undefined", limpia el caché y recarga
- Si ves errores de red, verifica tu conexión a internet

### Los Modales No Se Abren
- Verifica que los elementos modales existan en el HTML
- Revisa que no haya errores de JavaScript en la consola

## Contacto

Si después de seguir estos pasos aún tienes problemas, revisa:

1. La consola del navegador para errores específicos
2. La pestaña Network para verificar que los scripts se carguen correctamente
3. Que estés usando la versión más reciente de los archivos