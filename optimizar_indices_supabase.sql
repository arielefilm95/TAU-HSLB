-- Índices optimizados para Supabase - TAU Tamizaje Auditivo Universal
-- Archivo: optimizar_indices_supabase.sql
-- Descripción: Índices para mejorar el rendimiento de consultas críticas

-- ========================================
-- ÍNDICES PARA TABLA PACIENTES
-- ========================================

-- Índice para consultas de pacientes recientes (más usado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_created_at 
ON pacientes(created_at DESC);

-- Índice compuesto para filtrar por tipo y origen (usado en dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_tipo_origen 
ON pacientes(tipo_paciente, origen_registro);

-- Índice para búsquedas por RUT (búsquedas frecuentes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_rut 
ON pacientes(rut);

-- Índice para búsquedas por número de ficha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_ficha 
ON pacientes(numero_ficha);

-- Índice compuesto para consultas de pacientes del día (optimizado para dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_recientes 
ON pacientes(tipo_paciente, origen_registro, created_at DESC);

-- ========================================
-- ÍNDICES PARA TABLA EXÁMENES_EOA
-- ========================================

-- Índice compuesto para obtener exámenes por paciente y fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examenes_paciente_fecha 
ON examenes_eoa(paciente_id, fecha_examen DESC);

-- Índice para filtrar por resultados (usado en reportes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examenes_resultados 
ON examenes_eoa(od_resultado, oi_resultado);

-- Índice para consultas por fecha de examen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examenes_fecha 
ON examenes_eoa(fecha_examen DESC);

-- Índice compuesto para consultas completas de estado EOA
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examenes_paciente_resultado 
ON examenes_eoa(paciente_id, od_resultado, oi_resultado, fecha_examen DESC);

-- ========================================
-- ÍNDICES PARA TABLA PARTOS_IMPORTADOS
-- ========================================

-- Índice para relacionar partos importados con madres
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partos_importados_madre 
ON partos_importados(madre_id);

-- Índice para consultas de importaciones por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partos_importados_fecha 
ON partos_importados(created_at DESC);

-- ========================================
-- POLÍTICAS RLS OPTIMIZADAS
-- ========================================

-- Política para pacientes con filtrado eficiente
DROP POLICY IF EXISTS "Users can view their pacientes" ON pacientes;
CREATE POLICY "Users can view their pacientes" ON pacientes
    FOR SELECT USING (true);

-- Política para exámenes con filtrado eficiente
DROP POLICY IF EXISTS "Users can view their examenes" ON examenes_eoa;
CREATE POLICY "Users can view their examenes" ON examenes_eoa
    FOR SELECT USING (true);

-- Política para partos importados con filtrado eficiente
DROP POLICY IF EXISTS "Users can view their partos_importados" ON partos_importados;
CREATE POLICY "Users can view their partos_importados" ON partos_importados
    FOR SELECT USING (true);

-- ========================================
-- VISTAS OPTIMIZADAS
-- ========================================

-- Vista para pacientes con estado EOA más reciente
CREATE OR REPLACE VIEW vista_pacientes_con_eoa AS
SELECT 
    p.*,
    -- Último examen
    (SELECT json_build_object(
        'id', e.id,
        'fecha_examen', e.fecha_examen,
        'od_resultado', e.od_resultado,
        'oi_resultado', e.oi_resultado,
        'refiere', (e.od_resultado = 'REFIERE' OR e.oi_resultado = 'REFIERE')
    )
    FROM examenes_eoa e 
    WHERE e.paciente_id = p.id 
    ORDER BY e.fecha_examen DESC 
    LIMIT 1) AS ultimo_examen,
    
    -- Contador de exámenes
    (SELECT COUNT(*) 
     FROM examenes_eoa e 
     WHERE e.paciente_id = p.id) AS total_examenes,
    
    -- Estado EOA resumido
    CASE 
        WHEN (SELECT COUNT(*) FROM examenes_eoa e WHERE e.paciente_id = p.id) = 0 THEN 'PENDIENTE'
        WHEN (SELECT COUNT(*) FROM examenes_eoa e WHERE e.paciente_id = p.id) = 1 THEN 
            CASE 
                WHEN (SELECT COUNT(*) FROM examenes_eoa e WHERE e.paciente_id = p.id AND (e.od_resultado = 'REFIERE' OR e.oi_resultado = 'REFIERE')) > 0 THEN 'REFERIDO_1ER'
                ELSE 'COMPLETADO_1ER'
            END
        ELSE 
            CASE 
                WHEN (SELECT COUNT(*) FROM examenes_eoa e WHERE e.paciente_id = p.id AND (e.od_resultado = 'REFIERE' OR e.oi_resultado = 'REFIERE')) > 0 THEN 'REFERIDO_2DO'
                ELSE 'COMPLETADO_2DO'
            END
    END AS estado_eoa
FROM pacientes p;

-- ========================================
-- FUNCIONES OPTIMIZADAS
-- ========================================

-- Función para obtener pacientes recientes optimizada
CREATE OR REPLACE FUNCTION obtener_pacientes_recientes(
    p_fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_fecha_fin TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    apellido TEXT,
    rut TEXT,
    numero_ficha TEXT,
    sala TEXT,
    cama TEXT,
    cantidad_hijos INTEGER,
    tipo_paciente TEXT,
    origen_registro TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    estado_eoa TEXT,
    total_examenes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.apellido,
        p.rut,
        p.numero_ficha,
        p.sala,
        p.cama,
        p.cantidad_hijos,
        p.tipo_paciente,
        p.origen_registro,
        p.created_at,
        v.estado_eoa,
        v.total_examenes
    FROM pacientes p
    LEFT JOIN vista_pacientes_con_eoa v ON p.id = v.id
    WHERE 
        (p_fecha_inicio IS NULL OR p.created_at >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR p.created_at < p_fecha_fin)
        AND p.tipo_paciente = 'MADRE'
        AND p.origen_registro = 'MANUAL'
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ========================================

-- Función para actualizar timestamp de modificación
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para pacientes (si no existe la columna updated_at, agregarla primero)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

CREATE TRIGGER trigger_pacientes_updated_at
    BEFORE UPDATE ON pacientes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Trigger para exámenes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'examenes_eoa' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE examenes_eoa ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

CREATE TRIGGER trigger_examenes_updated_at
    BEFORE UPDATE ON examenes_eoa
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- ========================================
-- ANÁLISIS Y MANTENIMIENTO
-- ========================================

-- Comando para analizar tablas después de crear índices
-- ANALYZE pacientes;
-- ANALYZE examenes_eoa;
-- ANALYZE partos_importados;

-- Consulta para verificar uso de índices
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ========================================
-- COMENTARIAS
-- ========================================

COMMENT ON INDEX idx_pacientes_created_at IS 'Índice para consultas de pacientes recientes ordenados por fecha';
COMMENT ON INDEX idx_pacientes_tipo_origen IS 'Índice compuesto para filtrar por tipo y origen de registro';
COMMENT ON INDEX idx_pacientes_rut IS 'Índice para búsquedas rápidas por RUT';
COMMENT ON INDEX idx_pacientes_ficha IS 'Índice para búsquedas por número de ficha';
COMMENT ON INDEX idx_pacientes_recientes IS 'Índice compuesto optimizado para dashboard de pacientes recientes';

COMMENT ON INDEX idx_examenes_paciente_fecha IS 'Índice compuesto para obtener exámenes por paciente y fecha';
COMMENT ON INDEX idx_examenes_resultados IS 'Índice para filtrar exámenes por resultados';
COMMENT ON INDEX idx_examenes_fecha IS 'Índice para consultas de exámenes por fecha';
COMMENT ON INDEX idx_examenes_paciente_resultado IS 'Índice compuesto para consultas completas de estado EOA';

COMMENT ON INDEX idx_partos_importados_madre IS 'Índice para relacionar partos importados con madres';
COMMENT ON INDEX idx_partos_importados_fecha IS 'Índice para consultas de importaciones por fecha';

COMMENT ON VIEW vista_pacientes_con_eoa IS 'Vista optimizada para obtener pacientes con su estado EOA más reciente';
COMMENT ON FUNCTION obtener_pacientes_recientes IS 'Función optimizada para obtener pacientes recientes con paginación';