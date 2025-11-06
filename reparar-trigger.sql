-- =====================================================
-- REPARAR TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFILES
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar trigger y función existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Crear función mejorada para el trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en la tabla perfiles con el nombre del usuario
  INSERT INTO public.perfiles (id, nombre_usuario)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario')
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    '✅ TRIGGER CREADO' as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. Verificar que la función se creó correctamente
SELECT 
    proname as function_name,
    '✅ FUNCIÓN CREADA' as status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- =====================================================
-- 6. PROBAR MANUALMENTE LA CREACIÓN DE PERFIL
-- =====================================================
-- Insertar manualmente el perfil para el usuario existente
-- (Reemplaza el ID con el ID del usuario que creaste)

INSERT INTO public.perfiles (id, nombre_usuario) 
VALUES ('4949055d-f237-4600-8614-45d200a9c3a1', 'ariel espinoza')
ON CONFLICT (id) DO UPDATE SET 
  nombre_usuario = EXCLUDED.nombre_usuario,
  updated_at = NOW();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Mostrar perfiles existentes
SELECT 
    id,
    nombre_usuario,
    updated_at,
    '✅ PERFIL CREADO' as status
FROM perfiles;

-- =====================================================
-- INSTRUCCIONES
-- =====================================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Verifica que aparezca el perfil del usuario existente
-- 3. Prueba registrar un nuevo usuario desde signup.html
-- 4. El perfil debería crearse automáticamente ahora
-- =====================================================