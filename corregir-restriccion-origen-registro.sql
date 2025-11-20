-- =====================================================
-- CORREGIR RESTRICCIÓN DE ORIGEN_REGISTRO PARA PERMITIR NEO
-- =====================================================
-- Este script corrige la restricción check para permitir el valor 'NEO'
-- en el campo origen_registro de la tabla pacientes
-- =====================================================

-- 1. Eliminar la restricción check existente (si existe)
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_origen_registro_check;
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS madres_origen_registro_check;
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS origen_registro_check;

-- 2. Agregar la restricción check corregida que incluye 'NEO'
ALTER TABLE pacientes 
ADD CONSTRAINT pacientes_origen_registro_check 
CHECK (origen_registro IN ('MANUAL', 'IMPORTADO', 'NEO', 'SISTEMA'));

-- 3. Verificar que la restricción se haya agregado correctamente
-- Mostrar todas las restricciones de la tabla pacientes
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'pacientes'
)
AND contype = 'c'
ORDER BY conname;

-- 4. Mostrar valores actuales en la tabla para verificar
SELECT 
    origen_registro,
    COUNT(*) as cantidad
FROM pacientes 
GROUP BY origen_registro 
ORDER BY origen_registro;

-- =====================================================
-- COMENTARIOS
-- =====================================================
-- Este script soluciona el error:
-- "new row for relation "pacientes" violates check constraint "madres_origen_registro_check""
-- 
-- La restricción ahora permite los siguientes valores:
-- - 'MANUAL': Registros ingresados manualmente por usuarios
-- - 'IMPORTADO': Registros importados desde archivos Excel
-- - 'NEO': Registros de bebés ingresados desde NEO
-- - 'SISTEMA': Registros creados automáticamente por el sistema
-- =====================================================