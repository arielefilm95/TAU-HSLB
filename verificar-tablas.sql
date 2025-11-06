-- =====================================================
-- VERIFICACIÓN Y CREACIÓN DE TABLAS BÁSICAS PARA TAU
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- para verificar si las tablas existen y crearlas si es necesario
-- =====================================================

-- 1. Verificar si la tabla perfiles existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perfiles'
    ) THEN
        -- Crear tabla de perfiles
        CREATE TABLE perfiles (
          id UUID REFERENCES auth.users(id) PRIMARY KEY,
          nombre_usuario VARCHAR(50) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabla perfiles creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla perfiles ya existe';
    END IF;
END $$;

-- 2. Verificar y crear políticas RLS para perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles;

-- Crear políticas de seguridad para perfiles
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su perfil" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su perfil" ON perfiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Verificar y crear trigger para perfil automático
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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

-- 4. Verificar configuración de autenticación
-- (Esto es informativo, debes configurarlo manualmente en la UI de Supabase)
RAISE NOTICE 'Recuerda configurar en Authentication > Settings:';
RAISE NOTICE '- Site URL: http://localhost:3000 (para desarrollo)';
RAISE NOTICE '- Redirect URLs: http://localhost:3000, https://tudominio.com';

-- 5. Mostrar tablas existentes
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- VERIFICACIÓN COMPLETADA
-- =====================================================
-- Ahora intenta registrar un usuario nuevamente
-- Revisa la consola del navegador para ver los logs detallados
-- =====================================================