# Guía de Conexión con Supabase - TAU

## 📋 Resumen

Este documento describe la configuración de Supabase para la aplicación TAU (Tamizaje Auditivo Universal) del Hospital San Luis de Buin.

## 🔑 Credenciales

Las credenciales de Supabase están configuradas en los siguientes archivos:

### 1. Archivo de Configuración Principal
- **Archivo**: `config/supabase-config.js`
- **URL**: `https://oywepfjbzvnzvcnqtlnv.supabase.co`
- **Clave Anónima**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95d2VwZmpienZuenZjbnF0bG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTg0NzgsImV4cCI6MjA3NzkzNDQ3OH0.nnJ3tbgoWdu1-qcnpZwDK6W_WQSDmVFU_Hf-5XCpDo4`

### 2. Archivo de Autenticación
- **Archivo**: `js/auth.js`
- Contiene la lógica de inicialización y funciones de autenticación

### 3. Dashboard
- **Archivo**: `dashboard.html`
- Inicializa Supabase directamente con las credenciales

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

1. **perfiles**
   - Almacena información de usuarios autenticados
   - Relacionada con `auth.users`

2. **madres**
   - Registros de madres y bebés
   - Campos principales: nombre, apellido, rut, numero_ficha, sala, cama, cantidad_hijos

3. **examenes_eoa**
   - Resultados de exámenes EOA (Emisiones Otoacústicas)
   - Relacionada con `madres`

4. **partos_importados**
   - Datos importados desde archivos Excel
   - Para cruzar con registros manuales

## 🔧 Configuración

### Archivos de Configuración

1. **`config/supabase-config.js`**
   ```javascript
   const SUPABASE_CONFIG = {
       URL: 'https://oywepfjbzvnzvcnqtlnv.supabase.co',
       ANON_KEY: '...',
       AUTH: {
           REDIRECT_URLS: [...],
           PROVIDER: 'email',
           SESSION: {...}
       },
       DATABASE: {
           TABLES: {...},
           QUERY_LIMITS: {...}
       }
   };
   ```

2. **`js/auth.js`**
   - Funciones de autenticación
   - Inicialización del cliente de Supabase
   - Manejo de sesiones

### URLs de Redirección

Para desarrollo:
- `http://localhost:3000`
- `http://localhost:3000/dashboard.html`

Para producción:
- `https://arielefilm95.github.io/TAU-HSLB`
- `https://arielefilm95.github.io/TAU-HSLB/dashboard.html`

## 🧪 Pruebas de Conexión

### Archivo de Prueba
- **Archivo**: `test-supabase-connection.html`
- Proporciona una interfaz para verificar:
  - Carga de scripts
  - Configuración de Supabase
  - Conexión con la base de datos
  - Acceso a tablas
  - Flujo completo de CRUD

### Pasos para Probar

1. Abrir `test-supabase-connection.html` en el navegador
2. Seguir las pruebas en orden:
   - Carga de Scripts
   - Configuración de Supabase
   - Conexión con Supabase
   - Acceso a Tablas
   - Flujo Completo

## 🔒 Seguridad

### Políticas RLS (Row Level Security)

Las tablas deben tener políticas RLS configuradas:

1. **perfiles**
   - Usuarios solo pueden ver/actualizar su propio perfil

2. **madres**
   - Usuarios autenticados pueden ver/insertar/actualizar/eliminar

3. **examenes_eoa**
   - Usuarios autenticados pueden ver/insertar/actualizar/eliminar

### Variables de Entorno

Para producción, considera usar variables de entorno:
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oywepfjbzvnzvcnqtlnv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '...';
```

## 🚀 Inicialización

### En el Dashboard

```javascript
// dashboard.html
const SUPABASE_URL = 'https://oywepfjbzvnzvcnqtlnv.supabase.co';
const SUPABASE_ANON_KEY = '...';

let supabase;
function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabase;
        return true;
    }
    return false;
}
```

### En el Módulo de Auth

```javascript
// js/auth.js
function initializeSupabase() {
    loadSupabaseConfig();
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
        window.supabaseClient = supabaseClient;
        return true;
    }
    return false;
}
```

## 📝 Uso

### Consultas Básicas

```javascript
// Obtener todas las madres
const { data, error } = await supabaseClient
    .from('madres')
    .select('*')
    .order('created_at', { ascending: false });

// Insertar una madre
const { data, error } = await supabaseClient
    .from('madres')
    .insert([madreData])
    .select();

// Insertar un examen EOA
const { data, error } = await supabaseClient
    .from('examenes_eoa')
    .insert([examenData])
    .select();
```

### Autenticación

```javascript
// Iniciar sesión
const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
});

// Cerrar sesión
const { error } = await supabaseClient.auth.signOut();

// Obtener usuario actual
const { data: { user }, error } = await supabaseClient.auth.getUser();
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de conexión**
   - Verificar que las credenciales sean correctas
   - Comprobar que la librería de Supabase esté cargada

2. **Error de permisos**
   - Verificar políticas RLS en Supabase
   - Asegurarse de que el usuario esté autenticado

3. **Error de CORS**
   - Configurar URLs de redirección en Supabase
   - Verificar configuración de CORS

### Logs y Depuración

```javascript
// Habilitar logs detallados
window.supabaseClient = supabaseClient;

// Verificar conexión
await testSupabaseConnection();

// Verificar estado de autenticación
const { data: { user } } = await supabaseClient.auth.getUser();
console.log('Usuario actual:', user);
```

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Next.js con Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Configuración de Autenticación](https://supabase.com/docs/guides/auth)

## 🔄 Actualizaciones

Para actualizar las credenciales:

1. Modificar `config/supabase-config.js`
2. Verificar que `js/auth.js` use la configuración actualizada
3. Probar con `test-supabase-connection.html`
4. Actualizar documentación si es necesario

## 🛠️ Scripts de Corrección

Se han creado dos scripts especiales para diagnosticar y reparar problemas:

### 1. `supabase-tablas-corregidas.sql`
- **Propósito**: Creación completa de tablas con todas las correcciones
- **Cuándo usar**: Para configuración inicial desde cero
- **Características**:
  - Tablas con campos corregidos y validaciones mejoradas
  - Políticas RLS completas y seguras
  - Índices optimizados para rendimiento
  - Vistas útiles para consultas complejas
  - Funciones auxiliares para estadísticas

### 2. `diagnosticar-y-reparar-supabase.sql`
- **Propósito**: Diagnóstico automático y reparación de problemas existentes
- **Cuándo usar**: Cuando la base de datos ya existe pero tiene problemas
- **Características**:
  - Diagnóstico automático de tablas, políticas e índices
  - Reparación automática de elementos faltantes
  - Verificación completa al finalizar
  - No elimina datos existentes

### Problemas Comunes Corregidos

1. **Restricciones UNIQUE en RUT**
   - Problema: La tabla `madres` permitía RUT duplicados
   - Solución: Índice único `idx_madres_rut_unique`

2. **Campos faltantes en tablas**
   - Problema: Faltaban campos importantes como `origen_registro`
   - Solución: Campos agregados con validaciones apropiadas

3. **Políticas RLS incompletas**
   - Problema: Faltaban políticas para algunas operaciones
   - Solución: Políticas completas para todas las tablas

4. **Índices de rendimiento faltantes**
   - Problema: Consultas lentas por falta de índices
   - Solución: Índices optimizados para consultas frecuentes

5. **Trigger automático no funcional**
   - Problema: Perfiles no se creaban automáticamente
   - Solución: Trigger mejorado con manejo de errores

## 🚀 Flujo de Trabajo Recomendado

### Para Nueva Instalación
1. Ejecutar `supabase-tablas-corregidas.sql` completo
2. Configurar autenticación en Supabase
3. Probar con `test-supabase-connection.html`

### Para Reparar Instalación Existente
1. Ejecutar `diagnosticar-y-reparar-supabase.sql`
2. Revisar el diagnóstico generado
3. Verificar que las reparaciones se aplicaron correctamente
4. Probar con `test-supabase-connection.html`

## 📊 Mejoras Implementadas

### Seguridad
- Políticas RLS completas y verificadas
- Validaciones de datos en todas las tablas
- Manejo seguro de relaciones entre tablas

### Rendimiento
- Índices optimizados para consultas frecuentes
- Vistas predefinidas para operaciones complejas
- Funciones almacenadas para estadísticas

### Mantenimiento
- Scripts de diagnóstico y reparación automáticos
- Verificación completa de la configuración
- Logs detallados para troubleshooting

---

**Última actualización**: 11 de noviembre de 2025
**Versión**: 2.0.0 (con correcciones y mejoras)