-- =====================================================
-- AGREGAR CAMPOS DE MADRE PARA REGISTRO NEO
-- =====================================================
-- Este script agrega campos opcionales para almacenar el nombre
-- y apellido de la madre cuando se registra un bebé (NEO)
-- =====================================================

-- 1. Agregar columnas para datos de la madre en registros NEO
ALTER TABLE pacientes ADD COLUMN nombre_madre VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN apellido_madre VARCHAR(100);

-- 2. Agregar comentario a las nuevas columnas
COMMENT ON COLUMN pacientes.nombre_madre IS 'Nombre de la madre (opcional, usado principalmente para registros NEO)';
COMMENT ON COLUMN pacientes.apellido_madre IS 'Apellido de la madre (opcional, usado principalmente para registros NEO)';

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX idx_pacientes_nombre_madre ON pacientes(nombre_madre) WHERE nombre_madre IS NOT NULL;
CREATE INDEX idx_pacientes_apellido_madre ON pacientes(apellido_madre) WHERE apellido_madre IS NOT NULL;

-- =====================================================
-- COMPLETADO
-- =====================================================
-- Los campos nombre_madre y apellido_madre han sido agregados
-- Ahora se pueden usar en el formulario NEO
-- =====================================================