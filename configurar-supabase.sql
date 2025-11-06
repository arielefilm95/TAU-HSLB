-- =====================================================
-- CONFIGURACIÓN COMPLETA DE SUPABASE PARA TAU
-- =====================================================
-- Copia y pega este código completo en el SQL Editor de Supabase
-- Ve a: https://supabase.com/dashboard > tu proyecto > SQL Editor
-- =====================================================

-- 1. CREAR TABLA DE PERFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================
-- Habilitar Row Level Security
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su perfil" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su perfil" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. CREAR TRIGGER AUTOMÁTICO PARA PERFILES
-- =====================================================
-- Eliminar función y trigger existentes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear función que se ejecutará cuando se cree un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_usuario)
  VALUES (new.id, new.raw_user_meta_data->>'nombre');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que llama a la función
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFICAR CONFIGURACIÓN
-- =====================================================
-- Mostrar tablas creadas
SELECT 
    table_name,
    table_type,
    '✅ TABLA CREADA' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'perfiles';

-- Mostrar políticas creadas
SELECT 
    policyname,
    cmd,
    '✅ POLÍTICA CREADA' as status
FROM pg_policies 
WHERE tablename = 'perfiles';

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
-- Ahora puedes:
-- 1. Probar el registro en signup.html
-- 2. Los usuarios aparecerán en Authentication > Users
-- 3. Los perfiles aparecerán en Table Editor > perfiles
-- =====================================================