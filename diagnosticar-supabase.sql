-- =====================================================
-- DIAGNÓSTICO DE CONFIGURACIÓN DE SUPABASE PARA TAU
-- =====================================================
-- Ejecuta este script para verificar el estado actual
-- de tu configuración y encontrar el problema
-- =====================================================

-- 1. VERIFICAR TABLA PERFILES
-- =====================================================
SELECT 
    'TABLA PERFILES' as componente,
    table_name as nombre,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'perfiles';

-- 2. VERIFICAR POLÍTICAS RLS DE PERFILES
-- =====================================================
SELECT 
    'POLÍTICAS RLS' as componente,
    policyname as nombre,
    '✅ CREADA' as estado
FROM pg_policies 
WHERE tablename = 'perfiles'
UNION ALL
SELECT 
    'POLÍTICAS RLS' as componente,
    'RLS HABILITADO' as nombre,
    CASE 
        WHEN rowsecurity = true THEN '✅ ACTIVADO'
        ELSE '❌ DESACTIVADO'
    END as estado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'perfiles';

-- 3. VERIFICAR TRIGGER DE PERFILES
-- =====================================================
SELECT 
    'TRIGGER' as componente,
    trigger_name as nombre,
    '✅ CREADO' as estado
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'
UNION ALL
SELECT 
    'TRIGGER' as componente,
    'FUNCIÓN handle_new_user' as nombre,
    CASE 
        WHEN proname IS NOT NULL THEN '✅ CREADA'
        ELSE '❌ NO EXISTE'
    END as estado
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. VERIFICAR USUARIOS EN AUTH
-- =====================================================
SELECT 
    'USUARIOS AUTH' as componente,
    COUNT(*)::text as nombre,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTEN USUARIOS'
        ELSE '❌ SIN USUARIOS'
    END as estado
FROM auth.users;

-- 5. VERIFICAR PERFILES CREADOS
-- =====================================================
SELECT 
    'PERFILES CREADOS' as componente,
    COUNT(*)::text as nombre,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTEN PERFILES'
        ELSE '❌ SIN PERFILES'
    END as estado
FROM perfiles;

-- 6. VERIFICAR ÚLTIMOS USUARIOS REGISTRADOS
-- =====================================================
SELECT 
    'ÚLTIMOS USUARIOS' as componente,
    email::text as nombre,
    created_at::text as estado
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. VERIFICAR PERFILES SIN USUARIOS O USUARIOS SIN PERFILES
-- =====================================================
SELECT 
    'INCONSISTENCIAS' as componente,
    'Usuarios sin perfil' as nombre,
    COUNT(*)::text as estado
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'INCONSISTENCIAS' as componente,
    'Perfiles sin usuario' as nombre,
    COUNT(*)::text as estado
FROM perfiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 8. PRUEBA DE INSERCIÓN MANUAL
-- =====================================================
-- (Comentado para no crear datos automáticamente)
-- Descomenta para probar manualmente
/*
INSERT INTO perfiles (id, nombre_usuario) 
VALUES ('00000000-0000-0000-0000-000000000000', 'TEST MANUAL')
ON CONFLICT (id) DO UPDATE SET nombre_usuario = 'TEST MANUAL';
*/

-- =====================================================
-- ANÁLISIS DE RESULTADOS
-- =====================================================
-- Si todo está marcado con ✅ pero el registro no funciona:
-- 1. Revisa la configuración de Authentication > Settings en Supabase
-- 2. Verifica que las URLs de redirección estén configuradas
-- 3. Revisa los logs de tu aplicación en la consola del navegador
-- 4. Verifica que no haya errores de CORS

-- Si falta algún componente:
-- 1. Ejecuta el script supabase-tablas-completas.sql completo
-- 2. O ejecuta selectivamente las partes que faltan
-- =====================================================