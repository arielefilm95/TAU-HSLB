-- =====================================================
-- SOLUCIÓN SIMPLE PARA PROBLEMAS DE REGISTRO EN SUPABASE
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- 1. CREAR TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir actualización de perfiles propios" ON perfiles;

-- Crear políticas
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON perfiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción de perfiles a usuarios autenticados" ON perfiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir actualización de perfiles propios" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. CREAR TRIGGER AUTOMÁTICO
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_usuario)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFICACIÓN
SELECT 'perfiles' as tabla_creada, COUNT(*) as existe
FROM information_schema.tables 
WHERE table_name = 'perfiles' AND table_schema = 'public';

SELECT policyname, cmd as tipo
FROM pg_policies 
WHERE tablename = 'perfiles';

SELECT trigger_name, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- INSTRUCCIONES:
-- 1. Configura Authentication > Settings en Supabase:
--    - Site URL: http://localhost:3000
--    - Redirect URLs: http://localhost:3000, http://localhost:3000/*
-- 2. Prueba el registro con signup.html
-- =====================================================