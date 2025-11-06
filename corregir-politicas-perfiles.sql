-- =====================================================
-- CORRECCIÓN ESPECÍFICA PARA POLÍTICAS DE PERFILES
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Permitir lectura de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfiles a usuarios autenticados" ON perfiles;
DROP POLICY IF EXISTS "Permitir actualización de perfiles propios" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles;

-- 2. CREAR POLÍTICAS CORRECTAS Y SIMPLES
-- Política para INSERT: Permitir que cualquier usuario autenticado inserte su propio perfil
CREATE POLICY "Allow users to insert their own profile" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para SELECT: Permitir que usuarios vean todos los perfiles (o solo el suyo)
CREATE POLICY "Allow users to view all profiles" ON perfiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para UPDATE: Permitir que usuarios actualicen su propio perfil
CREATE POLICY "Allow users to update their own profile" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. VERIFICACIÓN
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'perfiles';

-- =====================================================
-- EXPLICACIÓN:
-- El problema era que las políticas RLS eran demasiado restrictivas
-- Ahora permiten:
-- 1. INSERT solo cuando el ID del usuario autenticado coincide con el ID a insertar
-- 2. SELECT a todos los usuarios autenticados
-- 3. UPDATE solo del propio perfil
-- =====================================================