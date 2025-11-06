-- =====================================================
-- SOLUCIÓN COMPLETA PARA PROBLEMAS DE REGISTRO EN SUPABASE
-- =====================================================
-- Ejecutar este script completo en el SQL Editor de Supabase
-- Ve a: https://supabase.com/dashboard > tu proyecto > SQL Editor
-- =====================================================

-- 1. LIMPIEZA Y RECREACIÓN COMPLETA DE TABLAS
-- =====================================================

-- Eliminar tablas si existen (para empezar desde cero)
DROP TABLE IF EXISTS examenes_eoa CASCADE;
DROP TABLE IF EXISTS madres CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;

-- Eliminar triggers y funciones existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. CREAR TABLA DE PERFILES
-- =====================================================
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREAR TABLA DE MADRES
-- =====================================================
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

-- 4. CREAR TABLA DE EXÁMENES EOA
-- =====================================================
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

-- 5. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS) PARA PERFILES
-- =====================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas para perfiles
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON perfiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción de perfiles a usuarios autenticados" ON perfiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir actualización de perfiles propios" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Permitir inserción de perfil propio" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS) PARA MADRES
-- =====================================================
ALTER TABLE madres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de madres a usuarios autenticados" ON madres
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción de madres a usuarios autenticados" ON madres
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir actualización de madres a usuarios autenticados" ON madres
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir eliminación de madres a usuarios autenticados" ON madres
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS) PARA EXÁMENES EOA
-- =====================================================
ALTER TABLE examenes_eoa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de exámenes a usuarios autenticados" ON examenes_eoa
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción de exámenes a usuarios autenticados" ON examenes_eoa
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir actualización de exámenes a usuarios autenticados" ON examenes_eoa
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir eliminación de exámenes a usuarios autenticados" ON examenes_eoa
  FOR DELETE USING (auth.role() = 'authenticated');

-- 8. CREAR TRIGGER AUTOMÁTICO PARA PERFILES
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente cuando se crea un usuario
  INSERT INTO public.perfiles (id, nombre_usuario)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'));
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta después de insertar un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================
CREATE INDEX idx_madres_rut ON madres(rut);
CREATE INDEX idx_madres_usuario_id ON madres(usuario_id);
CREATE INDEX idx_madres_created_at ON madres(created_at);

CREATE INDEX idx_examenes_madre_id ON examenes_eoa(madre_id);
CREATE INDEX idx_examenes_usuario_id ON examenes_eoa(usuario_id);
CREATE INDEX idx_examenes_fecha_examen ON examenes_eoa(fecha_examen);

-- 10. VERIFICACIÓN DE CONFIGURACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN DE CONFIGURACIÓN ===';
END $$;

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
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'examenes_eoa' AND table_schema = 'public') as created;

-- Mostrar políticas creadas
SELECT
    tablename,
    policyname,
    cmd,
    '✅ POLÍTICA CREADA' as status
FROM pg_policies
WHERE tablename IN ('perfiles', 'madres', 'examenes_eoa')
ORDER BY tablename, policyname;

-- Mostrar triggers creados
SELECT
    trigger_name,
    event_manipulation,
    '✅ TRIGGER CREADA' as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 11. INSTRUCCIONES ADICIONALES
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== INSTRUCCIONES ADICIONALES ===';
    RAISE NOTICE '1. Configura Authentication > Settings en la UI de Supabase:';
    RAISE NOTICE '   - Site URL: http://localhost:3000 (para desarrollo)';
    RAISE NOTICE '   - Redirect URLs: http://localhost:3000, http://localhost:3000/*';
    RAISE NOTICE '2. Para producción, añade tu dominio a las URLs';
    RAISE NOTICE '3. Prueba el registro con diagnosticar-registro.html';
END $$;

-- =====================================================
-- SOLUCIÓN COMPLETADA
-- =====================================================
-- Ahora puedes:
-- 1. Probar el registro en signup.html
-- 2. Los usuarios aparecerán en Authentication > Users
-- 3. Los perfiles se crearán automáticamente en Table Editor > perfiles
-- 4. Usa diagnosticar-registro.html para verificar todo funciona
-- =====================================================