-- =====================================================
-- CONFIGURACIÓN CORREGIDA Y COMPLETA DE BASE DE DATOS PARA TAU
-- =====================================================
-- Ejecutar este script completo en el SQL Editor de Supabase
-- Corrige errores encontrados en versiones anteriores
-- =====================================================

-- 1. LIMPIEZA DE ELEMENTOS EXISTENTES (OPCIONAL)
-- =====================================================
-- Descomenta las siguientes líneas solo si quieres empezar desde cero
-- DROP TABLE IF EXISTS examenes_eoa CASCADE;
-- DROP TABLE IF EXISTS madres CASCADE;
-- DROP TABLE IF EXISTS perfiles CASCADE;
-- DROP TABLE IF EXISTS partos_importados CASCADE;
-- 
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =====================================================
-- 2. TABLA DE PERFILES DE USUARIO
-- =====================================================

-- Crear tabla de perfiles si no existe
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'usuario',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política de seguridad para perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir actualización de perfiles propios" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON perfiles;

-- Crear políticas corregidas para perfiles
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su perfil" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su perfil" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 3. TABLA DE MADRES (CORREGIDA)
-- =====================================================

-- Crear tabla de madres con campos corregidos
CREATE TABLE IF NOT EXISTS madres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rut VARCHAR(12) NOT NULL,
  numero_ficha VARCHAR(20) NOT NULL,
  sala VARCHAR(20) NOT NULL,
  cama VARCHAR(20) NOT NULL,
  cantidad_hijos INTEGER DEFAULT 1 CHECK (cantidad_hijos > 0),
  usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  origen_registro VARCHAR(20) DEFAULT 'MANUAL' CHECK (origen_registro IN ('MANUAL', 'IMPORTADO', 'NEO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice único para RUT (evitar duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_madres_rut_unique ON madres(rut);

-- Crear política de seguridad para madres
ALTER TABLE madres ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar madres" ON madres;
DROP POLICY IF EXISTS "Permitir lectura de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir inserción de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir actualización de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir eliminación de madres a usuarios autenticados" ON madres;

-- Crear políticas corregidas para madres
CREATE POLICY "Usuarios autenticados pueden ver madres" ON madres
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar madres" ON madres
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar madres" ON madres
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar madres" ON madres
  FOR DELETE USING (auth.role() = 'authenticated');

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_madres_rut ON madres(rut);
CREATE INDEX IF NOT EXISTS idx_madres_usuario_id ON madres(usuario_id);
CREATE INDEX IF NOT EXISTS idx_madres_created_at ON madres(created_at);
CREATE INDEX IF NOT EXISTS idx_madres_origen_registro ON madres(origen_registro);

-- =====================================================
-- 4. TABLA DE EXÁMENES EOA (CORREGIDA)
-- =====================================================

-- Crear tabla de exámenes EOA con campos corregidos
CREATE TABLE IF NOT EXISTS examenes_eoa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  madre_id UUID REFERENCES madres(id) ON DELETE CASCADE,
  od_resultado VARCHAR(10) NOT NULL CHECK (od_resultado IN ('PASA', 'REFIERE')),
  oi_resultado VARCHAR(10) NOT NULL CHECK (oi_resultado IN ('PASA', 'REFIERE')),
  observaciones TEXT,
  fecha_examen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Datos del bebé y embarazo (corregidos)
  fecha_nacimiento DATE,
  sexo_bebe VARCHAR(10) CHECK (sexo_bebe IN ('MASCULINO', 'FEMENINO')),
  tipo_parto VARCHAR(15) CHECK (tipo_parto IN ('NORMAL', 'CESAREA')),
  semanas_gestacion INTEGER CHECK (semanas_gestacion >= 20 AND semanas_gestacion <= 42),
  complicaciones_embarazo TEXT,
  complicaciones_desarrollo TEXT,
  familiares_perdida_auditiva BOOLEAN DEFAULT false,
  madre_fumo BOOLEAN DEFAULT false,
  madre_alcohol BOOLEAN DEFAULT false,
  madre_drogas BOOLEAN DEFAULT false
);

-- Crear política de seguridad para exámenes EOA
ALTER TABLE examenes_eoa ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir lectura de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir inserción de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir actualización de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir eliminación de exámenes a usuarios autenticados" ON examenes_eoa;

-- Crear políticas corregidas para exámenes EOA
CREATE POLICY "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa
  FOR DELETE USING (auth.role() = 'authenticated');

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_examenes_madre_id ON examenes_eoa(madre_id);
CREATE INDEX IF NOT EXISTS idx_examenes_usuario_id ON examenes_eoa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_examenes_fecha_examen ON examenes_eoa(fecha_examen);

-- =====================================================
-- 5. TABLA DE PARTOS IMPORTADOS (NUEVA)
-- =====================================================

-- Crear tabla para partos importados desde Excel
CREATE TABLE IF NOT EXISTS partos_importados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rut VARCHAR(12) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  fecha_parto DATE NOT NULL,
  madre_id UUID REFERENCES madres(id) ON DELETE SET NULL,
  archivo_origen VARCHAR(255),
  fila_original INTEGER,
  procesado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear política de seguridad para partos importados
ALTER TABLE partos_importados ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver partos importados" ON partos_importados;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar partos importados" ON partos_importados;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar partos importados" ON partos_importados;

-- Crear políticas para partos importados
CREATE POLICY "Usuarios autenticados pueden ver partos importados" ON partos_importados
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar partos importados" ON partos_importados
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar partos importados" ON partos_importados
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_partos_importados_rut ON partos_importados(rut);
CREATE INDEX IF NOT EXISTS idx_partos_importados_madre_id ON partos_importados(madre_id);
CREATE INDEX IF NOT EXISTS idx_partos_importados_procesado ON partos_importados(procesado);

-- =====================================================
-- 6. TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================

-- Eliminar función y trigger existentes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear función mejorada para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente cuando se crea un usuario
  INSERT INTO public.perfiles (id, nombre_usuario, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'name', 'Usuario'),
    new.email
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta después de insertar un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. VISTAS ÚTILES
-- =====================================================

-- Vista para ver exámenes con datos de la madre
CREATE OR REPLACE VIEW vista_examenes_completos AS
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
  m.nombre as madre_nombre,
  m.apellido as madre_apellido,
  p.nombre_usuario as examinador,
  e.created_at
FROM examenes_eoa e
JOIN madres m ON e.madre_id = m.id
LEFT JOIN perfiles p ON e.usuario_id = p.id;

-- Vista para estadísticas
CREATE OR REPLACE VIEW vista_estadisticas AS
SELECT
  'madres' as tabla,
  COUNT(*) as total,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as ultimos_7_dias,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias
FROM madres
UNION ALL
SELECT
  'examenes_eoa' as tabla,
  COUNT(*) as total,
  COUNT(CASE WHEN fecha_examen >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as ultimos_7_dias,
  COUNT(CASE WHEN fecha_examen >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias
FROM examenes_eoa;

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Función para obtener estadísticas de una madre
CREATE OR REPLACE FUNCTION obtener_estadisticas_madre(madre_uuid UUID)
RETURNS TABLE(
  total_examenes BIGINT,
  examenes_pasan BIGINT,
  examenes_refieren BIGINT,
  ultimo_examen TIMESTAMP WITH TIME ZONE,
  primer_examen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_examenes,
    COUNT(CASE WHEN od_resultado = 'PASA' AND oi_resultado = 'PASA' THEN 1 END) as examenes_pasan,
    COUNT(CASE WHEN od_resultado = 'REFIERE' OR oi_resultado = 'REFIERE' THEN 1 END) as examenes_refieren,
    MAX(fecha_examen) as ultimo_examen,
    MIN(fecha_examen) as primer_examen
  FROM examenes_eoa
  WHERE madre_id = madre_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CONFIGURACIÓN DE STORAGE (OPCIONAL)
-- =====================================================

-- Crear bucket para documentos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes de storage
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos" ON storage.objects;

-- Crear políticas de seguridad para storage
CREATE POLICY "Usuarios autenticados pueden subir archivos" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'documentos');

CREATE POLICY "Usuarios autenticados pueden ver archivos" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'documentos');

-- =====================================================
-- 10. VERIFICACIÓN DE CONFIGURACIÓN
-- =====================================================

-- Mostrar tablas creadas
SELECT
    'perfiles' as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'perfiles' AND table_schema = 'public') as created
UNION ALL
SELECT
    'madres' as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'madres' AND table_schema = 'public') as created
UNION ALL
SELECT
    'examenes_eoa' as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'examenes_eoa' AND table_schema = 'public') as created
UNION ALL
SELECT
    'partos_importados' as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'partos_importados' AND table_schema = 'public') as created;

-- Mostrar políticas creadas
SELECT
    tablename,
    policyname,
    cmd,
    '✅ POLÍTICA CREADA' as status
FROM pg_policies
WHERE tablename IN ('perfiles', 'madres', 'examenes_eoa', 'partos_importados')
ORDER BY tablename, policyname;

-- Mostrar triggers creados
SELECT
    trigger_name,
    event_manipulation,
    '✅ TRIGGER CREADO' as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURACIÓN COMPLETADA CORRECTAMENTE ===';
    RAISE NOTICE 'Tablas creadas: perfiles, madres, examenes_eoa, partos_importados';
    RAISE NOTICE 'Políticas RLS configuradas para todas las tablas';
    RAISE NOTICE 'Trigger automático para perfiles creado';
    RAISE NOTICE 'Vistas útiles creadas: vista_examenes_completos, vista_estadisticas';
    RAISE NOTICE 'Funciones útiles creadas: obtener_estadisticas_madre';
    RAISE NOTICE 'Storage configurado para documentos';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '1. Configura Authentication > Settings en la UI de Supabase';
    RAISE NOTICE '2. Configura las URLs de redirección';
    RAISE NOTICE '3. Prueba la aplicación con test-supabase-connection.html';
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================