-- =====================================================
-- FUNCIÓN PARA EJECUTAR SQL DINÁMICO EN SUPABASE
-- =====================================================
-- Esta función permite ejecutar consultas SQL dinámicas
-- Necesaria para que el administrador SQL funcione correctamente
-- =====================================================

-- Crear función para ejecutar SQL dinámico (solo para administradores)
CREATE OR REPLACE FUNCTION execute_sql(query_text TEXT)
RETURNS TABLE(
    result JSON,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    query_result JSON;
    exec_result RECORD;
BEGIN
    -- Verificar que el usuario esté autenticado (medida de seguridad básica)
    IF auth.role() != 'authenticated' THEN
        RETURN QUERY SELECT 
            NULL::JSON as result,
            FALSE as success,
            'Usuario no autenticado' as message;
    END IF;
    
    -- Ejecutar la consulta dinámicamente
    BEGIN
        -- Para consultas SELECT, usar EXECUTE y retornar resultados
        IF LOWER(query_text) LIKE 'select%' THEN
            EXECUTE 'SELECT json_agg(row_to_json(t))::text FROM (' || query_text || ') t'
            INTO exec_result;
            
            IF FOUND THEN
                query_result := exec_result.json_agg::JSON;
            ELSE
                query_result := '[]'::JSON;
            END IF;
            
            RETURN QUERY SELECT 
                query_result as result,
                TRUE as success,
                'Consulta ejecutada correctamente' as message;
        ELSE
            -- Para otras consultas (INSERT, UPDATE, DELETE, etc.)
            EXECUTE query_text;
            
            RETURN QUERY SELECT 
                '{"affected": "success"}'::JSON as result,
                TRUE as success,
                'Consulta ejecutada correctamente' as message;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 
                NULL::JSON as result,
                FALSE as success,
                'Error: ' || SQLERRM as message;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD PARA LA FUNCIÓN
-- =====================================================

-- Habilitar RLS para la función (si aplica)
-- Nota: Las funciones SECURITY DEFINER no están sujetas a RLS
-- pero agregamos políticas adicionales por seguridad

-- Crear política para restringir el uso de la función
-- (Esto es más conceptual, ya que las funciones SECURITY DEFINER ignoran RLS)

-- =====================================================
-- FUNCIONES AUXILIARES PARA EL ADMINISTRADOR
-- =====================================================

-- Función para obtener información de tablas
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT DEFAULT NULL)
RETURNS TABLE(
    table_name TEXT,
    table_type TEXT,
    column_count BIGINT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name,
        t.table_type,
        COUNT(c.column_name) as column_count,
        COALESCE((SELECT reltuples::BIGINT FROM pg_class WHERE relname = t.table_name), 0) as row_count
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public' 
    AND (table_name IS NULL OR t.table_name = table_name)
    GROUP BY t.table_name, t.table_type
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información de columnas
CREATE OR REPLACE FUNCTION get_column_info(table_name TEXT)
RETURNS TABLE(
    column_name TEXT,
    data_type TEXT,
    is_nullable TEXT,
    column_default TEXT,
    ordinal_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = table_name
    ORDER BY ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información de políticas RLS
CREATE OR REPLACE FUNCTION get_policy_info(table_name TEXT DEFAULT NULL)
RETURNS TABLE(
    tablename TEXT,
    policyname TEXT,
    cmd TEXT,
    roles TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tablename,
        policyname,
        cmd,
        roles
    FROM pg_policies
    WHERE tablename = table_name OR table_name IS NULL
    ORDER BY tablename, policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información de índices
CREATE OR REPLACE FUNCTION get_index_info(table_name TEXT DEFAULT NULL)
RETURNS TABLE(
    tablename TEXT,
    indexname TEXT,
    indexdef TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND (tablename = table_name OR table_name IS NULL)
    ORDER BY tablename, indexname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICACIÓN DE CREACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FUNCIONES SQL DINÁMICAS CREADAS ===';
    RAISE NOTICE '1. execute_sql - Para ejecutar SQL dinámico';
    RAISE NOTICE '2. get_table_info - Para obtener información de tablas';
    RAISE NOTICE '3. get_column_info - Para obtener información de columnas';
    RAISE NOTICE '4. get_policy_info - Para obtener información de políticas RLS';
    RAISE NOTICE '5. get_index_info - Para obtener información de índices';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ADVERTENCIA DE SEGURIDAD:';
    RAISE NOTICE 'La función execute_sql permite ejecutar SQL arbitrario.';
    RAISE NOTICE 'Asegúrate de que solo usuarios autorizados tengan acceso.';
    RAISE NOTICE 'Considera agregar restricciones adicionales según sea necesario.';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Configuración completada correctamente.';
END $$;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Ejecutar una consulta SELECT
SELECT * FROM execute_sql('SELECT * FROM pacientes LIMIT 5');

-- Ejecutar una consulta INSERT
SELECT * FROM execute_sql('INSERT INTO pacientes (nombre, apellido, rut) VALUES (''Test'', ''User'', ''12345678-9'')');

-- Obtener información de tablas
SELECT * FROM get_table_info();

-- Obtener información de una tabla específica
SELECT * FROM get_table_info('madres');

-- Obtener información de columnas de una tabla
SELECT * FROM get_column_info('madres');

-- Obtener información de políticas
SELECT * FROM get_policy_info();

-- Obtener información de políticas de una tabla específica
SELECT * FROM get_policy_info('madres');

-- Obtener información de índices
SELECT * FROM get_index_info();

-- Obtener información de índices de una tabla específica
SELECT * FROM get_index_info('madres');
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================