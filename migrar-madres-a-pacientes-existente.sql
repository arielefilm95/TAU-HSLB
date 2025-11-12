-- =====================================================
-- SCRIPT PARA MIGRAR TABLA MADRES A PACIENTES (BASE DE DATOS EXISTENTE)
-- =====================================================
-- Este script asume que las tablas ya existen y solo realiza la migración
-- =====================================================

-- 1. Verificar si la tabla pacientes ya existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pacientes' AND table_schema = 'public') THEN
        RAISE NOTICE 'La tabla pacientes ya existe. No se realizará la migración.';
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'madres' AND table_schema = 'public') THEN
        RAISE NOTICE 'La tabla madres no existe. No se puede realizar la migración.';
        RETURN;
    END IF;
    
    -- Renombrar tabla de madres a pacientes
    EXECUTE 'ALTER TABLE madres RENAME TO pacientes';
    
    -- Agregar campo tipo_paciente si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'tipo_paciente'
    ) THEN
        EXECUTE 'ALTER TABLE pacientes ADD COLUMN tipo_paciente VARCHAR(10) NOT NULL DEFAULT ''MADRE'' CHECK (tipo_paciente IN (''MADRE'', ''BEBE'', ''NEO''))';
    END IF;
    
    RAISE NOTICE 'Migración completada exitosamente';
END $$;

-- 2. Actualizar referencias en otras tablas si es necesario
DO $$
BEGIN
    -- Actualizar la columna madre_id en examenes_eoa a paciente_id si existe
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'examenes_eoa' AND column_name = 'madre_id'
    ) THEN
        EXECUTE 'ALTER TABLE examenes_eoa RENAME COLUMN madre_id TO paciente_id';
        
        -- Actualizar la referencia de clave externa
        EXECUTE 'ALTER TABLE examenes_eoa DROP CONSTRAINT IF EXISTS examenes_eoa_madre_id_fkey';
        EXECUTE 'ALTER TABLE examenes_eoa ADD CONSTRAINT examenes_eoa_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE';
    END IF;
END $$;

-- 3. Actualizar índices
DO $$
BEGIN
    -- Eliminar índices antiguos si existen
    EXECUTE 'DROP INDEX IF EXISTS idx_madres_rut';
    EXECUTE 'DROP INDEX IF EXISTS idx_madres_usuario_id';
    EXECUTE 'DROP INDEX IF EXISTS idx_madres_created_at';
    
    -- Crear nuevos índices si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pacientes_rut') THEN
        EXECUTE 'CREATE INDEX idx_pacientes_rut ON pacientes(rut)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pacientes_usuario_id') THEN
        EXECUTE 'CREATE INDEX idx_pacientes_usuario_id ON pacientes(usuario_id)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pacientes_created_at') THEN
        EXECUTE 'CREATE INDEX idx_pacientes_created_at ON pacientes(created_at)';
    END IF;
    
    -- Actualizar índice en examenes_eoa
    EXECUTE 'DROP INDEX IF EXISTS idx_examenes_madre_id';
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_examenes_paciente_id') THEN
        EXECUTE 'CREATE INDEX idx_examenes_paciente_id ON examenes_eoa(paciente_id)';
    END IF;
END $$;

-- 4. Actualizar políticas de seguridad
DO $$
BEGIN
    -- Eliminar políticas antiguas si existen
    EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden ver madres" ON pacientes';
    EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar madres" ON pacientes';
    EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar madres" ON pacientes';
    EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar madres" ON pacientes';
    
    -- Crear nuevas políticas si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Usuarios autenticados pueden ver pacientes') THEN
        EXECUTE 'CREATE POLICY "Usuarios autenticados pueden ver pacientes" ON pacientes FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Usuarios autenticados pueden insertar pacientes') THEN
        EXECUTE 'CREATE POLICY "Usuarios autenticados pueden insertar pacientes" ON pacientes FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Usuarios autenticados pueden actualizar pacientes') THEN
        EXECUTE 'CREATE POLICY "Usuarios autenticados pueden actualizar pacientes" ON pacientes FOR UPDATE USING (auth.role() = ''authenticated'')';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Usuarios autenticados pueden eliminar pacientes') THEN
        EXECUTE 'CREATE POLICY "Usuarios autenticados pueden eliminar pacientes" ON pacientes FOR DELETE USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- 5. Actualizar vista si existe
DO $$
BEGIN
    EXECUTE 'DROP VIEW IF EXISTS vista_examenes_completos';
    
    EXECUTE 'CREATE VIEW vista_examenes_completos AS
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
    JOIN perfiles perf ON e.usuario_id = perf.id';
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    -- Verificar si la tabla pacientes existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pacientes' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla pacientes existe';
    ELSE
        RAISE NOTICE '❌ Tabla pacientes no existe';
    END IF;
    
    -- Verificar si la tabla madres ya no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'madres' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla madres fue renombrada correctamente';
    ELSE
        RAISE NOTICE '❌ Tabla madres todavía existe';
    END IF;
    
    -- Verificar si el campo tipo_paciente existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pacientes' AND column_name = 'tipo_paciente') THEN
        RAISE NOTICE '✅ Campo tipo_paciente existe en pacientes';
    ELSE
        RAISE NOTICE '❌ Campo tipo_paciente no existe en pacientes';
    END IF;
    
    -- Verificar si la columna paciente_id existe en examenes_eoa
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'examenes_eoa' AND column_name = 'paciente_id') THEN
        RAISE NOTICE '✅ Columna paciente_id existe en examenes_eoa';
    ELSE
        RAISE NOTICE '❌ Columna paciente_id no existe en examenes_eoa';
    END IF;
    
    RAISE NOTICE '=== MIGRACIÓN COMPLETADA ===';
END $$;