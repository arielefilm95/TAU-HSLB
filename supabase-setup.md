# Configuración de Supabase para TAU

Este archivo contiene las instrucciones y el SQL necesario para configurar Supabase para la aplicación TAU.

## Pasos para configurar Supabase

### 1. Crear proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto llamado "tau-tamizaje-auditivo"
4. Espera a que el proyecto esté listo (puede tardar unos minutos)

### 2. Obtener claves de API

Una vez creado el proyecto:

1. Ve a Settings > API
2. Copia la URL del proyecto y la clave `anon` (pública)
3. Actualiza estas líneas en `js/auth.js`:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; // Reemplazar con tu URL
const SUPABASE_ANON_KEY = 'tu-anon-key'; // Reemplazar con tu clave anónima
```

### 3. Configurar autenticación

1. Ve a Authentication > Settings
2. En "Site URL", configura: `http://localhost:3000` (para desarrollo) y tu dominio de producción
3. En "Redirect URLs", añade:
   - `http://localhost:3000`
   - `https://tudominio.com`
   - `https://tudominio.com/dashboard.html`

### 4. Crear tablas de base de datos

Ve al SQL Editor y ejecuta los siguientes scripts:

#### Tabla de perfiles de usuario

```sql
-- Crear tabla de perfiles
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política de seguridad para perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su perfil" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su perfil" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- Crear trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_usuario)
  VALUES (new.id, new.raw_user_meta_data->>'nombre');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Tabla de madres

```sql
-- Crear tabla de madres
CREATE TABLE madres (  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rut VARCHAR(12) NOT NULL UNIQUE,
  numero_ficha VARCHAR(20) NOT NULL,
  sala VARCHAR(10) NOT NULL,
  cama VARCHAR(10) NOT NULL,
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política de seguridad para madres
ALTER TABLE madres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver madres" ON madres
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar madres" ON madres
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar madres" ON madres
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar madres" ON madres
  FOR DELETE USING (auth.role() = 'authenticated');

-- Crear índices para mejor rendimiento
CREATE INDEX idx_madres_rut ON madres(rut);
CREATE INDEX idx_madres_usuario_id ON madres(usuario_id);
CREATE INDEX idx_madres_created_at ON madres(created_at);
```

#### Tabla de exámenes EOA

```sql
-- Crear tabla de exámenes EOA
CREATE TABLE examenes_eoa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  madre_id UUID REFERENCES madres(id) ON DELETE CASCADE,
  od_resultado VARCHAR(10) NOT NULL CHECK (od_resultado IN ('PASA', 'REFIERE')),
  oi_resultado VARCHAR(10) NOT NULL CHECK (oi_resultado IN ('PASA', 'REFIERE')),
  observaciones TEXT,
  fecha_examen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política de seguridad para exámenes EOA
ALTER TABLE examenes_eoa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa
  FOR DELETE USING (auth.role() = 'authenticated');

-- Crear índices para mejor rendimiento
CREATE INDEX idx_examenes_madre_id ON examenes_eoa(madre_id);
CREATE INDEX idx_examenes_usuario_id ON examenes_eoa(usuario_id);
CREATE INDEX idx_examenes_fecha_examen ON examenes_eoa(fecha_examen);
```

### 5. Configurar Storage (opcional)

Si quieres permitir subir archivos (imágenes, documentos):

```sql
-- Crear bucket para archivos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Políticas de seguridad para storage
CREATE POLICY "Usuarios autenticados pueden subir archivos" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver archivos" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 6. Configurar Realtime (opcional)

Para sincronización en tiempo real:

1. Ve a Database > Replication
2. Activa la replicación para las tablas:
   - `madres`
   - `examenes_eoa`
   - `perfiles`

### 7. Probar la configuración

1. Abre la aplicación en tu navegador local
2. Intenta registrar un nuevo usuario
3. Verifica que el usuario aparezca en la tabla `perfiles`
4. Intenta registrar una madre
5. Verifica que aparezca en la tabla `madres`
6. Intenta crear un examen EOA
7. Verifica que aparezca en la tabla `examenes_eoa`

## Variables de entorno

Para producción, considera usar variables de entorno:

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'tu-anon-key';
```

## Seguridad adicional

1. Configura CORS en tu proyecto Supabase
2. Habilita 2FA en tu cuenta de Supabase
3. Configura alertas de seguridad
4. Revisa regularmente los logs de actividad

## Soporte

Si tienes problemas con la configuración:

1. Revisa la [documentación de Supabase](https://supabase.com/docs)
2. Verifica los logs en tu proyecto Supabase
3. Asegúrate de que las políticas RLS estén configuradas correctamente
4. Verifica que las claves de API sean correctas
