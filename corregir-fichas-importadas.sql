-- =====================================================
-- CORREGIR NÚMEROS DE FICHA DE REGISTROS IMPORTADOS
-- =====================================================
-- Este script corrige los registros importados que tienen números
-- de ficha automáticos y los deja vacíos
-- =====================================================

-- 1. Actualizar registros que tienen ficha comenzando con "IMPORT-"
UPDATE madres 
SET numero_ficha = ''
WHERE origen_registro = 'IMPORTADO' 
AND numero_ficha LIKE 'IMPORT-%';

-- 2. Verificar cuántos registros fueron actualizados
DO $$
DECLARE
    count_actualizados INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_actualizados
    FROM madres 
    WHERE origen_registro = 'IMPORTADO' 
    AND numero_ficha = '';
    
    RAISE NOTICE 'Registros importados con ficha vacía: %', count_actualizados;
END $$;

-- 3. Mostrar registros importados actuales (para verificación)
SELECT 
    id,
    nombre,
    apellido,
    rut,
    numero_ficha,
    origen_registro,
    created_at
FROM madres 
WHERE origen_registro = 'IMPORTADO'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Todos los registros importados deberían tener numero_ficha = ''
-- El registro "Olguin Valenzuela" debería aparecer con ficha vacía
-- =====================================================