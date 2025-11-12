-- =====================================================
-- SCRIPT PARA MODIFICAR TABLA MADRES A PACIENTES
-- =====================================================
-- Este script renombra la tabla madres a pacientes
-- y agrega el campo tipo_paciente para distinguir entre madre y bebé
-- =====================================================

-- 1. Renombrar tabla de madres a pacientes
ALTER TABLE madres RENAME TO pacientes;

-- 2. Agregar campo tipo_paciente para distinguir entre madre y bebé
ALTER TABLE pacientes ADD COLUMN tipo_paciente VARCHAR(10) NOT NULL DEFAULT 'MADRE' CHECK (tipo_paciente IN ('MADRE', 'BEBE', 'NEO'));

-- 3. Actualizar referencias en otras tablas
-- Actualizar la columna madre_id en examenes_eoa a paciente_id
ALTER TABLE examenes_eoa RENAME COLUMN madre_id TO paciente_id;

-- Actualizar la referencia de clave externa
ALTER TABLE examenes_eoa DROP CONSTRAINT examenes_eoa_madre_id_fkey;
ALTER TABLE examenes_eoa ADD CONSTRAINT examenes_eoa_paciente_id_fkey 
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;

-- 4. Actualizar índices
DROP INDEX IF EXISTS idx_madres_rut;
CREATE INDEX idx_pacientes_rut ON pacientes(rut);

DROP INDEX IF EXISTS idx_madres_usuario_id;
CREATE INDEX idx_pacientes_usuario_id ON pacientes(usuario_id);

DROP INDEX IF EXISTS idx_madres_created_at;
CREATE INDEX idx_pacientes_created_at ON pacientes(created_at);

-- 5. Actualizar políticas de seguridad
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver madres" ON pacientes;
CREATE POLICY "Usuarios autenticados pueden ver pacientes" ON pacientes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar madres" ON pacientes;
CREATE POLICY "Usuarios autenticados pueden insertar pacientes" ON pacientes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar madres" ON pacientes;
CREATE POLICY "Usuarios autenticados pueden actualizar pacientes" ON pacientes
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar madres" ON pacientes;
CREATE POLICY "Usuarios autenticados pueden eliminar pacientes" ON pacientes
  FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Actualizar índices en examenes_eoa
DROP INDEX IF EXISTS idx_examenes_madre_id;
CREATE INDEX idx_examenes_paciente_id ON examenes_eoa(paciente_id);

-- 7. Actualizar vista si existe
DROP VIEW IF EXISTS vista_examenes_completos;
CREATE VIEW vista_examenes_completos AS
SELECT
  e.id,
  e.od_resultado,
  e.oi_resultado,
  e.observaciones,
  e.fecha_examen,
  e.fecha_nacimiento,
  e.sexo_bebe,
  e.tipo_parto,
  e.semanas_gestacion,
  e.complicaciones_embarazo,
  e.complicaciones_desarrollo,
  e.familiares_perdida_auditiva,
  e.madre_fumo,
  e.madre_alcohol,
  e.madre_drogas,
  p.rut,
  p.numero_ficha,
  p.sala,
  p.cama,
  p.tipo_paciente,
  perf.nombre_usuario as examinador,
  e.created_at
FROM examenes_eoa e
JOIN pacientes p ON e.paciente_id = p.id
JOIN perfiles perf ON e.usuario_id = perf.id;

-- =====================================================
-- COMPLETADO
-- =====================================================
-- La tabla ahora se llama 'pacientes' y tiene el campo 'tipo_paciente'
-- que puede ser 'MADRE', 'BEBE' o 'NEO'
-- =====================================================