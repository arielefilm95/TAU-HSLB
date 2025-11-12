-- =====================================================
-- AGREGAR CAMPO DE ORIGEN A TABLA MADRES
-- =====================================================
-- Este script agrega un campo para identificar si un registro
-- fue creado manualmente o importado desde Excel
-- =====================================================

-- 1. Agregar columna de origen a la tabla pacientes
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS origen_registro VARCHAR(20) DEFAULT 'MANUAL'
CHECK (origen_registro IN ('MANUAL', 'IMPORTADO', 'SISTEMA'));

-- 2. Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pacientes_origen_registro ON pacientes(origen_registro);

-- 3. Actualizar registros existentes que tengan referencia en partos_importados
UPDATE pacientes
SET origen_registro = 'IMPORTADO'
WHERE id IN (
    SELECT DISTINCT madre_id 
    FROM partos_importados 
    WHERE madre_id IS NOT NULL
);

-- 4. Crear política RLS para el nuevo campo (si es necesario)
-- Nota: Las políticas existentes deberían cubrir este campo,
-- pero si se necesita control específico, se puede agregar:

/*
CREATE POLICY "Control de origen de registro" ON madres
    FOR SELECT USING (auth.role() = 'authenticated');
*/

-- 5. Verificación
SELECT 
    origen_registro,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pacientes), 2) as porcentaje
FROM pacientes
GROUP BY origen_registro 
ORDER BY cantidad DESC;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON COLUMN pacientes.origen_registro IS 'Origen del registro: MANUAL (registrado por usuario), IMPORTADO (desde Excel), SISTEMA (creado automáticamente)';
COMMENT ON INDEX idx_pacientes_origen_registro IS 'Índice para filtrar por origen de registro';

-- =====================================================
-- INSTRUCCIONES
-- =====================================================
-- 1. Ejecutar este script en el SQL Editor de Supabase
-- 2. Verificar que los registros importados se marcaron correctamente
-- 3. El código JavaScript ya está modificado para usar este campo
-- =====================================================