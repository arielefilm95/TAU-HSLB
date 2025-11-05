-- =====================================================
-- CONFIGURACIÓN COMPLETA DE BASE DE DATOS PARA TAU
-- =====================================================
-- Ejecutar este script completo en el SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- 1. TABLA DE PERFILES DE USUARIO
-- =====================================================

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

-- =====================================================
-- 2. TABLA DE MADRES
-- =====================================================

-- Crear tabla de madres
CREATE TABLE madres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- =====================================================
-- 3. TABLA DE EXÁMENES EOA
-- =====================================================

-- Crear tabla de exámenes EOA
CREATE TABLE examenes_eoa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  madre_id UUID REFERENCES madres(id) ON DELETE CASCADE,
  od_resultado VARCHAR(10) NOT NULL CHECK (od_resultado IN ('PASA', 'REFIERE')),
  oi_resultado VARCHAR(10) NOT NULL CHECK (oi_resultado IN ('PASA', 'REFIERE')),
  observaciones TEXT,
  fecha_examen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID REFERENCES perfiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Datos del bebé y embarazo
  fecha_nacimiento DATE,
  sexo_bebe VARCHAR(10) CHECK (sexo_bebe IN ('MASCULINO', 'FEMENINO')),
  tipo_parto VARCHAR(15) CHECK (tipo_parto IN ('NORMAL', 'CESAREA')),
  semanas_gestacion INTEGER CHECK (semanas_gestacion > 0 AND semanas_gestacion <= 42),
  complicaciones_embarazo TEXT,
  complicaciones_desarrollo TEXT,
  familiares_perdida_auditiva BOOLEAN,
  madre_fumo BOOLEAN,
  madre_alcohol BOOLEAN,
  madre_drogas BOOLEAN
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

-- =====================================================
-- 4. CONFIGURACIÓN DE STORAGE (OPCIONAL)
-- =====================================================

-- Crear bucket para archivos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Políticas de seguridad para storage
CREATE POLICY "Usuarios autenticados pueden subir archivos" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver archivos" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. VISTAS ÚTILES (OPCIONAL)
-- =====================================================

-- Vista para ver exámenes con datos de la madre
CREATE VIEW vista_examenes_completos AS
SELECT
  e.id,
  e.od_resultado,
  e.oi_resultado,
  e.observaciones,
  e.fecha_examen,
  e.fecha_nacimiento,
  e.sexo_bebe,
  e.tipo_parto,
  e.semanas_gestacion,
  e.complicaciones_embarazo,
  e.complicaciones_desarrollo,
  e.familiares_perdida_auditiva,
  e.madre_fumo,
  e.madre_alcohol,
  e.madre_drogas,
  m.rut,
  m.numero_ficha,
  m.sala,
  m.cama,
  p.nombre_usuario as examinador,
  e.created_at
FROM examenes_eoa e
JOIN madres m ON e.madre_id = m.id
JOIN perfiles p ON e.usuario_id = p.id;

-- Nota: Las vistas heredan los permisos de las tablas subyacentes
-- No se necesitan políticas adicionales para la vista

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================
-- Ahora puedes:
-- 1. Configurar autenticación en Authentication > Settings
-- 2. Configurar Realtime en Database > Replication (si lo necesitas)
-- 3. Probar la aplicación
-- =====================================================