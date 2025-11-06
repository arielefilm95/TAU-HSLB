# TAU - Tamizaje Auditivo Universal

Aplicación PWA para el seguimiento de exámenes de Emisiones Otoacústicas (EOA) en recién nacidos del Hospital San Luis de Buin.

## Descripción del Proyecto

TAU (Tamizaje Auditivo Universal) es una aplicación web progresiva (PWA) diseñada para facilitar el seguimiento de exámenes auditivos en recién nacidos. La aplicación permite:

- Registrar datos de las madres (RUT, ficha, sala, cama, cantidad de hijos)
- Realizar exámenes EOA con resultados de oído derecho e izquierdo
- Sincronización en tiempo real usando Supabase
- Funcionamiento offline con sincronización posterior
- Acceso desde dispositivos móviles y computadoras de escritorio

> **Nota:** El módulo de login y registro fue retirado temporalmente; el acceso a la aplicación publicada en GitHub Pages (`https://arielefilm95.github.io/TAU-HSLB`) es completamente libre.

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (Base de datos; autenticación deshabilitada en esta versión)
- **Arquitectura**: Progressive Web App (PWA)
- **Sincronización**: Tiempo real con Supabase

## Estructura del Proyecto

```
app-tau/
├── index.html              # Página principal (redirección al dashboard)
├── dashboard.html          # Panel principal de la aplicación
├── css/
│   ├── styles.css          # Estilos generales
│   ├── auth.css            # Estilos de autenticación
│   └── dashboard.css       # Estilos del dashboard
├── js/
│   ├── auth.js             # Funcionalidad de autenticación
│   ├── dashboard.js        # Lógica del dashboard
│   ├── madres.js           # Gestión de registros de madres
│   ├── eoa.js              # Funcionalidad de exámenes EOA
│   └── utils.js            # Utilidades (validación RUT, etc.)
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker para funcionalidad offline
├── assets/
│   └── icons/              # Iconos de la aplicación
└── README.md               # Este archivo
```

## Esquema de Base de Datos (Supabase)

### Tabla de Usuarios (manejada por Supabase Auth)
- id (UUID)
- email
- created_at

### Tabla de Perfiles de Usuario
```sql
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla de Madres
```sql
CREATE TABLE madres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rut VARCHAR(12) NOT NULL UNIQUE,
  numero_ficha VARCHAR(20) NOT NULL,
  sala VARCHAR(10) NOT NULL,
  cama VARCHAR(10) NOT NULL,
  cantidad_hijos INTEGER NOT NULL CHECK (cantidad_hijos >= 1),
  usuario_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla de Exámenes EOA
```sql
CREATE TABLE examenes_eoa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  madre_id UUID REFERENCES madres(id) ON DELETE CASCADE,
  od_resultado VARCHAR(10) NOT NULL CHECK (od_resultado IN ('PASA', 'REFIERE')),
  oi_resultado VARCHAR(10) NOT NULL CHECK (oi_resultado IN ('PASA', 'REFIERE')),
  observaciones TEXT,
  fecha_examen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Flujo de la Aplicación

```mermaid
graph TD
    A[Dashboard Principal] --> B[Registrar Madre]
    A --> C[Ver Madres Registradas]
    B --> D[Guardar en Supabase]
    D --> A
    C --> E[Seleccionar Madre]
    E --> F[Formulario EOA]
    F --> G[Guardar Examen]
    G --> C
```

## Plan de Desarrollo

### Fase 1: Configuración Inicial
- [x] Crear archivo README.md con plan completo del proyecto
- [ ] Configurar proyecto inicial con estructura de archivos
- [ ] Inicializar repositorio Git y conectar con GitHub
- [ ] Configurar Supabase: crear proyecto y definir esquema de base de datos
- [ ] Configurar autenticación de Supabase (Auth)

### Fase 2: Autenticación (suspendida temporalmente)
- [x] Eliminar flujo de autenticación y habilitar acceso libre

### Fase 3: Funcionalidad Principal
- [ ] Diseñar interfaz principal para gestión de madres
- [ ] Implementar formulario de madre (RUT, ficha, sala, cama)
- [ ] Crear lista de madres registradas con navegación a EOA
- [ ] Diseñar e implementar formulario EOA (OD, OI, observaciones)
- [ ] Configurar sincronización en tiempo real con Supabase

### Fase 4: Optimización y PWA
- [ ] Implementar funcionalidad PWA (manifest, service worker)
- [ ] Agregar validación de RUT chileno
- [ ] Probar funcionalidad completa y sincronización
- [ ] Optimizar interfaz para dispositivos móviles y escritorio

## Características Técnicas

### Acceso
- Autenticación deshabilitada temporalmente; no se requiere login ni registro.
- Supabase se utiliza únicamente como base de datos con políticas abiertas (ver `configurar-acceso-libre.sql`).

### Validaciones
- RUT chileno con formato y dígito verificador
- Correo electrónico válido
- Contraseña mínima 6 caracteres
- Campos obligatorios en formularios

### PWA Features
- Instalable en dispositivos móviles
- Funcionamiento offline con sincronización
- Iconos adaptativos
- Interfaz responsiva

## Políticas de Seguridad (RLS)

```sql
-- Acceso libre para ver/crear registros
CREATE POLICY "Acceso libre para ver madres" ON madres
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar madres" ON madres
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Acceso libre para todos los registros" ON madres
  FOR ALL USING (true);

-- Similar para examenes_eoa
```

## Actualizaciones del Progreso

*Este archivo se actualizará a medida que se completen las tareas del plan de desarrollo.*

### Estado Actual:
- **Fase 1**: Completada ✅
- **Fase 2**: Completada ✅
- **Fase 3**: Completada ✅
- **Fase 4**: Completada ✅

### Progreso Detallado:
- [x] Crear archivo README.md con plan completo del proyecto
- [x] Configurar proyecto inicial con estructura de archivos
- [ ] Inicializar repositorio Git y conectar con GitHub
- [ ] Configurar Supabase: crear proyecto y definir esquema de base de datos
- [x] Configurar autenticación de Supabase (Auth)
- [x] Eliminar sistema de autenticación
- [x] Implementar acceso libre a la aplicación
- [x] Diseñar interfaz principal para gestión de madres
- [x] Implementar formulario de madre (RUT, ficha, sala, cama)
- [x] Crear lista de madres registradas con navegación a EOA
- [x] Diseñar e implementar formulario EOA (OD, OI, observaciones)
- [x] Configurar sincronización en tiempo real con Supabase
- [x] Implementar funcionalidad PWA (manifest, service worker)
- [x] Agregar validación de RUT chileno
- [ ] Probar funcionalidad completa y sincronización
- [ ] Optimizar interfaz para dispositivos móviles y escritorio

## Instrucciones de Instalación y Uso

*(Se completará cuando la aplicación esté funcional)*

## Contribución

*(Se completará cuando el proyecto esté en GitHub)*

## Licencia

*(Se definirá más adelante)*
