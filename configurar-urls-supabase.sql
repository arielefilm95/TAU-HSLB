-- =====================================================
-- CONFIGURACIÓN DE URLs PARA GITHUB PAGES
-- =====================================================
-- NOTA: Este SQL es informativo. Las URLs deben configurarse
-- manualmente en el dashboard de Supabase
-- =====================================================

-- ESTE SCRIPT ES PARA REFERENCIA - NO SE PUEDE EJECUTAR DIRECTAMENTE
-- DEBES CONFIGURAR LAS URLS MANUALMENTE EN:

-- Supabase Dashboard > Authentication > Settings

-- =====================================================
-- URLS QUE DEBES CONFIGURAR:
-- =====================================================

-- 1. Site URL (principal):
-- https://arielefilm95.github.io/TAU-HSLB/

-- 2. Redirect URLs (añade todas estas):
-- https://arielefilm95.github.io/TAU-HSLB/
-- https://arielefilm95.github.io/TAU-HSLB/signup.html
-- https://arielefilm95.github.io/TAU-HSLB/index.html
-- https://arielefilm95.github.io/TAU-HSLB/dashboard.html
-- http://localhost:3000 (para desarrollo local)

-- =====================================================
-- VERIFICACIÓN DE CONFIGURACIÓN ACTUAL
-- =====================================================

-- Verificar usuarios recientes
SELECT 
    'USUARIOS RECIENTES' as info,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'CONFIRMADO'
        ELSE 'SIN CONFIRMAR'
    END as estado
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar perfiles recientes
SELECT 
    'PERFILES RECIENTES' as info,
    id,
    nombre_usuario,
    updated_at
FROM perfiles 
ORDER BY updated_at DESC 
LIMIT 5;

-- =====================================================
-- INSTRUCCIONES PASO A PASO:
-- =====================================================

-- 1. Ve a https://supabase.com/dashboard
-- 2. Selecciona tu proyecto: oywepfjbzvnzvcnqtlnv
-- 3. En el menú izquierdo, ve a Authentication > Settings
-- 4. En "Site URL", pon: https://arielefilm95.github.io/TAU-HSLB/
-- 5. En "Redirect URLs", haz clic en "Add URL" y añade:
--    - https://arielefilm95.github.io/TAU-HSLB/
--    - https://arielefilm95.github.io/TAU-HSLB/signup.html
--    - https://arielefilm95.github.io/TAU-HSLB/index.html
-- 6. Haz clic en "Save"

-- =====================================================
-- PROBLEMAS COMUNES Y SOLUCIONES:
-- =====================================================

-- PROBLEMA: No llegan emails de confirmación
-- SOLUCIÓN: Revisa la carpeta de spam o configura SMTP en Supabase

-- PROBLEMA: El usuario se crea pero no el perfil
-- SOLUCIÓN: Ejecuta el script reparar-trigger.sql

-- PROBLEMA: Error de redirección después del registro
-- SOLUCIÓN: Configura las URLs como se indica arriba

-- =====================================================
-- DESPUÉS DE CONFIGURAR LAS URLS:
-- =====================================================

-- 1. Limpia el caché de tu navegador
-- 2. Intenta registrar un nuevo usuario
-- 3. Revisa tu email (incluida la carpeta spam)
-- 4. Si llega el email, haz clic en el enlace de confirmación
-- 5. El usuario debería aparecer como confirmado en Supabase