-- Script para eliminar todos los registros importados y sus datos relacionados
-- Este script eliminará:
-- 1. Todos los registros de partos_importados
-- 2. Todos los exámenes EOA relacionados con registros importados
-- 3. Todos los pacientes con origen_registro = 'IMPORTADO'
-- 4. Todos los pacientes que tengan un registro en partos_importados

-- Iniciar transacción para asegurar que todo se elimine correctamente
BEGIN;

-- 1. Primero eliminar todos los registros de partos_importados
DELETE FROM partos_importados;

-- 2. Eliminar exámenes EOA de pacientes importados
-- Primero identificamos todos los pacientes que serán eliminados
WITH pacientes_a_eliminar AS (
    SELECT id FROM pacientes WHERE origen_registro = 'IMPORTADO'
)
DELETE FROM examenes_eoa
WHERE paciente_id IN (SELECT id FROM pacientes_a_eliminar);

-- 3. Eliminar todos los pacientes con origen_registro = 'IMPORTADO'
DELETE FROM pacientes WHERE origen_registro = 'IMPORTADO';

-- 4. Verificación: mostrar cuántos registros quedan
DO $$
DECLARE
    total_pacientes INTEGER;
    total_importados INTEGER;
    total_examenes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_pacientes FROM pacientes;
    SELECT COUNT(*) INTO total_importados FROM partos_importados;
    SELECT COUNT(*) INTO total_examenes FROM examenes_eoa;
    
    RAISE NOTICE '=== RESUMEN DE ELIMINACIÓN ===';
    RAISE NOTICE 'Total de pacientes restantes: %', total_pacientes;
    RAISE NOTICE 'Total de registros importados restantes: %', total_importados;
    RAISE NOTICE 'Total de exámenes EOA restantes: %', total_examenes;
    RAISE NOTICE '================================';
END $$;

-- Confirmar la transacción
COMMIT;

-- Mensaje de confirmación
SELECT 'Todos los registros importados han sido eliminados exitosamente' AS resultado;