-- =====================================================
-- AGREGAR CAMPOS DE BEBE A LA TABLA PACIENTES
-- =====================================================
-- Este script agrega campos específicos para bebés (NEO)
-- a la tabla de pacientes para evitar errores al registrar.
-- =====================================================

-- 1. Agregar columnas para datos del bebé
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS sexo_bebe VARCHAR(10) CHECK (sexo_bebe IN ('MASCULINO', 'FEMENINO'));
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS tipo_parto VARCHAR(15) CHECK (tipo_parto IN ('NORMAL', 'CESAREA'));
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS semanas_gestacion INTEGER CHECK (semanas_gestacion >= 20 AND semanas_gestacion <= 42);

-- 2. Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN pacientes.fecha_nacimiento IS 'Fecha de nacimiento del paciente (usado para BEBE/NEO)';
COMMENT ON COLUMN pacientes.sexo_bebe IS 'Sexo del paciente (usado para BEBE/NEO)';
COMMENT ON COLUMN pacientes.tipo_parto IS 'Tipo de parto (usado para BEBE/NEO)';
COMMENT ON COLUMN pacientes.semanas_gestacion IS 'Semanas de gestación al nacer (usado para BEBE/NEO)';

-- =====================================================
-- COMPLETADO
-- =====================================================
-- Los campos han sido agregados a la tabla 'pacientes'.
-- Ahora se pueden registrar bebés desde el formulario NEO.
-- =====================================================
