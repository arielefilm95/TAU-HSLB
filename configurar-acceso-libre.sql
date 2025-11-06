-- Configurar acceso libre a la base de datos (sin autenticación)
-- Este archivo modifica las políticas RLS para permitir acceso sin requerir autenticación

-- =====================================================
-- IMPORTANTE: Esto elimina la seguridad de autenticación
-- Solo usar si se desea acceso completamente abierto
-- =====================================================

-- Eliminar políticas existentes que requieren autenticación
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir actualización de perfiles propios" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON perfiles;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar madres" ON madres;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar madres" ON madres;
DROP POLICY IF EXISTS "Permitir lectura de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir inserción de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir actualización de madres a usuarios autenticados" ON madres;
DROP POLICY IF EXISTS "Permitir eliminación de madres a usuarios autenticados" ON madres;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir lectura de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir inserción de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir actualización de exámenes a usuarios autenticados" ON examenes_eoa;
DROP POLICY IF EXISTS "Permitir eliminación de exámenes a usuarios autenticados" ON examenes_eoa;

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos" ON storage.objects;

-- Crear nuevas políticas que permiten acceso sin autenticación
-- Perfiles (acceso libre)
CREATE POLICY "Permitir lectura de perfiles sin autenticación" ON perfiles
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción de perfiles sin autenticación" ON perfiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización de perfiles sin autenticación" ON perfiles
  FOR UPDATE USING (true);

-- Madres (acceso libre)
CREATE POLICY "Permitir lectura de madres sin autenticación" ON madres
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción de madres sin autenticación" ON madres
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización de madres sin autenticación" ON madres
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminación de madres sin autenticación" ON madres
  FOR DELETE USING (true);

-- Exámenes EOA (acceso libre)
CREATE POLICY "Permitir lectura de exámenes sin autenticación" ON examenes_eoa
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción de exámenes sin autenticación" ON examenes_eoa
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización de exámenes sin autenticación" ON examenes_eoa
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminación de exámenes sin autenticación" ON examenes_eoa
  FOR DELETE USING (true);

-- Storage (acceso libre)
CREATE POLICY "Permitir subir archivos sin autenticación" ON storage.objects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir ver archivos sin autenticación" ON storage.objects
  FOR SELECT USING (true);

-- Eliminar el trigger de creación automática de perfiles (ya no es necesario)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Modificar la tabla madres para eliminar la restricción de usuario_id
ALTER TABLE madres DROP CONSTRAINT IF EXISTS madres_usuario_id_fkey;
ALTER TABLE examenes_eoa DROP CONSTRAINT IF EXISTS examenes_eoa_usuario_id_fkey;

-- Opcional: Eliminar las columnas usuario_id si no se van a usar
-- ALTER TABLE madres DROP COLUMN IF EXISTS usuario_id;
-- ALTER TABLE examenes_eoa DROP COLUMN IF EXISTS usuario_id;

-- =====================================================
-- INSTRUCCIONES:
-- 1. Ejecutar este script en tu base de datos de Supabase
-- 2. Ir a Supabase > SQL Editor
-- 3. Copiar y pegar este script
-- 4. Hacer clic en "Run"
-- =====================================================

-- Verificación de que las políticas se aplicaron correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;