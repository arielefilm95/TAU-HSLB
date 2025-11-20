-- =====================================================
-- CREAR CAMPOS DE MADRE PARA REGISTRO NEO
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- Agregar campo nombre_madre
ALTER TABLE pacientes ADD COLUMN nombre_madre VARCHAR(100);

-- Agregar campo apellido_madre  
ALTER TABLE pacientes ADD COLUMN apellido_madre VARCHAR(100);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
    AND table_schema = 'public'
    AND column_name IN ('nombre_madre', 'apellido_madre')
ORDER BY column_name;