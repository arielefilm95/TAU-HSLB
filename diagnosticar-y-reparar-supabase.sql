-- =====================================================
-- SCRIPT DE DIAGNÓSTICO Y REPARACIÓN PARA SUPABASE TAU
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Identifica problemas y aplica correcciones automáticamente
-- =====================================================

-- 1. FUNCIONES DE DIAGNÓSTICO
-- =====================================================

-- Función para verificar si una tabla existe
CREATE OR REPLACE FUNCTION verificar_tabla(nombre_tabla TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = nombre_tabla
    );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una política existe
CREATE OR REPLACE FUNCTION verificar_politica(nombre_tabla TEXT, nombre_politica TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = nombre_tabla AND policyname = nombre_politica
    );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un índice existe
CREATE OR REPLACE FUNCTION verificar_indice(nombre_indice TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = nombre_indice AND schemaname = 'public'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. DIAGNÓSTICO COMPLETO
-- =====================================================

DO $$
DECLARE
    tabla TEXT;
    politica TEXT;
    indice TEXT;
    problemas TEXT := '';
    correcciones TEXT := '';
BEGIN
    RAISE NOTICE '=== INICIANDO DIAGNÓSTICO DE SUPABASE TAU ===';
    RAISE NOTICE '';
    
    -- Verificar tablas principales
    RAISE NOTICE '📋 Verificando tablas principales...';
    
    FOREACH tabla IN ARRAY ARRAY['perfiles', 'madres', 'examenes_eoa', 'partos_importados']
    LOOP
        IF NOT verificar_tabla(tabla) THEN
            problemas := problemas || '❌ Tabla ' || tabla || ' no existe' || E'\n';
            correcciones := correcciones || 'CREATE TABLE ' || tabla || ' (...);' || E'\n';
        ELSE
            RAISE NOTICE '✅ Tabla % existe', tabla;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Verificar políticas RLS
    RAISE NOTICE '🔒 Verificando políticas RLS...';
    
    -- Políticas para perfiles
    FOREACH politica IN ARRAY ARRAY[
        'Usuarios pueden ver su propio perfil',
        'Usuarios pueden insertar su perfil',
        'Usuarios pueden actualizar su perfil'
    ]
    LOOP
        IF NOT verificar_politica('perfiles', politica) THEN
            problemas := problemas || '❌ Política faltante en perfiles: ' || politica || E'\n';
            correcciones := correcciones || 'CREATE POLICY "' || politica || '" ON perfiles ...;' || E'\n';
        ELSE
            RAISE NOTICE '✅ Política % en perfiles existe', politica;
        END IF;
    END LOOP;
    
    -- Políticas para madres
    FOREACH politica IN ARRAY ARRAY[
        'Usuarios autenticados pueden ver madres',
        'Usuarios autenticados pueden insertar madres',
        'Usuarios autenticados pueden actualizar madres',
        'Usuarios autenticados pueden eliminar madres'
    ]
    LOOP
        IF NOT verificar_politica('madres', politica) THEN
            problemas := problemas || '❌ Política faltante en madres: ' || politica || E'\n';
            correcciones := correcciones || 'CREATE POLICY "' || politica || '" ON madres ...;' || E'\n';
        ELSE
            RAISE NOTICE '✅ Política % en madres existe', politica;
        END IF;
    END LOOP;
    
    -- Políticas para examenes_eoa
    FOREACH politica IN ARRAY ARRAY[
        'Usuarios autenticados pueden ver exámenes EOA',
        'Usuarios autenticados pueden insertar exámenes EOA',
        'Usuarios autenticados pueden actualizar exámenes EOA',
        'Usuarios autenticados pueden eliminar exámenes EOA'
    ]
    LOOP
        IF NOT verificar_politica('examenes_eoa', politica) THEN
            problemas := problemas || '❌ Política faltante en examenes_eoa: ' || politica || E'\n';
            correcciones := correcciones || 'CREATE POLICY "' || politica || '" ON examenes_eoa ...;' || E'\n';
        ELSE
            RAISE NOTICE '✅ Política % en examenes_eoa existe', politica;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Verificar índices importantes
    RAISE NOTICE '🔍 Verificando índices importantes...';
    
    FOREACH indice IN ARRAY ARRAY[
        'idx_madres_rut_unique',
        'idx_madres_rut',
        'idx_madres_usuario_id',
        'idx_madres_created_at',
        'idx_examenes_madre_id',
        'idx_examenes_usuario_id',
        'idx_examenes_fecha_examen'
    ]
    LOOP
        IF NOT verificar_indice(indice) THEN
            problemas := problemas || '❌ Índice faltante: ' || indice || E'\n';
            correcciones := correcciones || 'CREATE INDEX ' || indice || ' ON ...;' || E'\n';
        ELSE
            RAISE NOTICE '✅ Índice % existe', indice;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Verificar trigger para perfiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN
        problemas := problemas || '❌ Trigger on_auth_user_created no existe' || E'\n';
        correcciones := correcciones || 'CREATE TRIGGER on_auth_user_created ...;' || E'\n';
        RAISE NOTICE '❌ Trigger on_auth_user_created no existe';
    ELSE
        RAISE NOTICE '✅ Trigger on_auth_user_created existe';
    END IF;
    
    RAISE NOTICE '';
    
    -- Mostrar resumen
    IF LENGTH(problemas) > 0 THEN
        RAISE NOTICE '⚠️ PROBLEMAS ENCONTRADOS:';
        RAISE NOTICE '%', problemas;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 CORRECCIONES NECESARIAS:';
        RAISE NOTICE '%', correcciones;
    ELSE
        RAISE NOTICE '🎉 NO SE ENCONTRARON PROBLEMAS';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== DIAGNÓSTICO COMPLETADO ===';
END $$;

-- =====================================================
-- 3. REPARACIONES AUTOMÁTICAS
-- =====================================================

-- Reparar tabla perfiles si no existe
DO $$
BEGIN
    IF NOT verificar_tabla('perfiles') THEN
        RAISE NOTICE '🔧 Creando tabla perfiles...';
        EXECUTE '
            CREATE TABLE perfiles (
                id UUID REFERENCES auth.users(id) PRIMARY KEY,
                nombre_usuario VARCHAR(100) NOT NULL,
                email VARCHAR(255),
                rol VARCHAR(50) DEFAULT ''usuario'',
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ';
        RAISE NOTICE '✅ Tabla perfiles creada';
    END IF;
END $$;

-- Reparar tabla madres si no existe
DO $$
BEGIN
    IF NOT verificar_tabla('madres') THEN
        RAISE NOTICE '🔧 Creando tabla madres...';
        EXECUTE '
            CREATE TABLE madres (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                rut VARCHAR(12) NOT NULL,
                numero_ficha VARCHAR(20) NOT NULL,
                sala VARCHAR(20) NOT NULL,
                cama VARCHAR(20) NOT NULL,
                cantidad_hijos INTEGER DEFAULT 1 CHECK (cantidad_hijos > 0),
                usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
                origen_registro VARCHAR(20) DEFAULT ''MANUAL'' CHECK (origen_registro IN (''MANUAL'', ''IMPORTADO'', ''NEO'')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ';
        RAISE NOTICE '✅ Tabla madres creada';
    END IF;
END $$;

-- Reparar tabla examenes_eoa si no existe
DO $$
BEGIN
    IF NOT verificar_tabla('examenes_eoa') THEN
        RAISE NOTICE '🔧 Creando tabla examenes_eoa...';
        EXECUTE '
            CREATE TABLE examenes_eoa (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                madre_id UUID REFERENCES madres(id) ON DELETE CASCADE,
                od_resultado VARCHAR(10) NOT NULL CHECK (od_resultado IN (''PASA'', ''REFIERE'')),
                oi_resultado VARCHAR(10) NOT NULL CHECK (oi_resultado IN (''PASA'', ''REFIERE'')),
                observaciones TEXT,
                fecha_examen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                usuario_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                fecha_nacimiento DATE,
                sexo_bebe VARCHAR(10) CHECK (sexo_bebe IN (''MASCULINO'', ''FEMENINO'')),
                tipo_parto VARCHAR(15) CHECK (tipo_parto IN (''NORMAL'', ''CESAREA'')),
                semanas_gestacion INTEGER CHECK (semanas_gestacion >= 20 AND semanas_gestacion <= 42),
                complicaciones_embarazo TEXT,
                complicaciones_desarrollo TEXT,
                familiares_perdida_auditiva BOOLEAN DEFAULT false,
                madre_fumo BOOLEAN DEFAULT false,
                madre_alcohol BOOLEAN DEFAULT false,
                madre_drogas BOOLEAN DEFAULT false
            )
        ';
        RAISE NOTICE '✅ Tabla examenes_eoa creada';
    END IF;
END $$;

-- Reparar tabla partos_importados si no existe
DO $$
BEGIN
    IF NOT verificar_tabla('partos_importados') THEN
        RAISE NOTICE '🔧 Creando tabla partos_importados...';
        EXECUTE '
            CREATE TABLE partos_importados (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                rut VARCHAR(12) NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                apellido VARCHAR(100) NOT NULL,
                fecha_parto DATE NOT NULL,
                madre_id UUID REFERENCES madres(id) ON DELETE SET NULL,
                archivo_origen VARCHAR(255),
                fila_original INTEGER,
                procesado BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ';
        RAISE NOTICE '✅ Tabla partos_importados creada';
    END IF;
END $$;

-- =====================================================
-- 4. REPARAR POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
DO $$
DECLARE
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY['perfiles', 'madres', 'examenes_eoa', 'partos_importados']
    LOOP
        IF verificar_tabla(tabla) THEN
            EXECUTE 'ALTER TABLE ' || tabla || ' ENABLE ROW LEVEL SECURITY';
            RAISE NOTICE '🔒 RLS habilitado en tabla %', tabla;
        END IF;
    END LOOP;
END $$;

-- Crear políticas para perfiles
DO $$
BEGIN
    IF verificar_tabla('perfiles') THEN
        -- Eliminar políticas existentes para evitar conflictos
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON perfiles';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON perfiles';
        
        -- Crear políticas corregidas
        EXECUTE '
            CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
            FOR SELECT USING (auth.uid() = id)
        ';
        EXECUTE '
            CREATE POLICY "Usuarios pueden insertar su perfil" ON perfiles
            FOR INSERT WITH CHECK (auth.uid() = id)
        ';
        EXECUTE '
            CREATE POLICY "Usuarios pueden actualizar su perfil" ON perfiles
            FOR UPDATE USING (auth.uid() = id)
        ';
        
        RAISE NOTICE '✅ Políticas de perfiles creadas';
    END IF;
END $$;

-- Crear políticas para madres
DO $$
BEGIN
    IF verificar_tabla('madres') THEN
        -- Eliminar políticas existentes
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden ver madres" ON madres';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar madres" ON madres';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar madres" ON madres';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar madres" ON madres';
        
        -- Crear políticas corregidas
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden ver madres" ON madres
            FOR SELECT USING (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden insertar madres" ON madres
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden actualizar madres" ON madres
            FOR UPDATE USING (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden eliminar madres" ON madres
            FOR DELETE USING (auth.role() = ''authenticated'')
        ';
        
        RAISE NOTICE '✅ Políticas de madres creadas';
    END IF;
END $$;

-- Crear políticas para examenes_eoa
DO $$
BEGIN
    IF verificar_tabla('examenes_eoa') THEN
        -- Eliminar políticas existentes
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa';
        EXECUTE 'DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa';
        
        -- Crear políticas corregidas
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden ver exámenes EOA" ON examenes_eoa
            FOR SELECT USING (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden insertar exámenes EOA" ON examenes_eoa
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden actualizar exámenes EOA" ON examenes_eoa
            FOR UPDATE USING (auth.role() = ''authenticated'')
        ';
        EXECUTE '
            CREATE POLICY "Usuarios autenticados pueden eliminar exámenes EOA" ON examenes_eoa
            FOR DELETE USING (auth.role() = ''authenticated'')
        ';
        
        RAISE NOTICE '✅ Políticas de examenes_eoa creadas';
    END IF;
END $$;

-- =====================================================
-- 5. REPARAR ÍNDICES IMPORTANTES
-- =====================================================

-- Crear índices para madres
DO $$
BEGIN
    IF verificar_tabla('madres') THEN
        -- Índice único para RUT
        IF NOT verificar_indice('idx_madres_rut_unique') THEN
            EXECUTE 'CREATE UNIQUE INDEX idx_madres_rut_unique ON madres(rut)';
            RAISE NOTICE '✅ Índice único para RUT en madres creado';
        END IF;
        
        -- Otros índices importantes
        IF NOT verificar_indice('idx_madres_usuario_id') THEN
            EXECUTE 'CREATE INDEX idx_madres_usuario_id ON madres(usuario_id)';
            RAISE NOTICE '✅ Índice usuario_id en madres creado';
        END IF;
        
        IF NOT verificar_indice('idx_madres_created_at') THEN
            EXECUTE 'CREATE INDEX idx_madres_created_at ON madres(created_at)';
            RAISE NOTICE '✅ Índice created_at en madres creado';
        END IF;
    END IF;
END $$;

-- Crear índices para examenes_eoa
DO $$
BEGIN
    IF verificar_tabla('examenes_eoa') THEN
        IF NOT verificar_indice('idx_examenes_madre_id') THEN
            EXECUTE 'CREATE INDEX idx_examenes_madre_id ON examenes_eoa(madre_id)';
            RAISE NOTICE '✅ Índice madre_id en examenes_eoa creado';
        END IF;
        
        IF NOT verificar_indice('idx_examenes_usuario_id') THEN
            EXECUTE 'CREATE INDEX idx_examenes_usuario_id ON examenes_eoa(usuario_id)';
            RAISE NOTICE '✅ Índice usuario_id en examenes_eoa creado';
        END IF;
        
        IF NOT verificar_indice('idx_examenes_fecha_examen') THEN
            EXECUTE 'CREATE INDEX idx_examenes_fecha_examen ON examenes_eoa(fecha_examen)';
            RAISE NOTICE '✅ Índice fecha_examen en examenes_eoa creado';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 6. REPARAR TRIGGER PARA PERFILES
-- =====================================================

DO $$
BEGIN
    -- Eliminar función y trigger existentes
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Crear función mejorada
    EXECUTE '
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.perfiles (id, nombre_usuario, email)
            VALUES (
                new.id, 
                COALESCE(new.raw_user_meta_data->>''nombre'', new.raw_user_meta_data->>''name'', ''Usuario''),
                new.email
            );
            RETURN new;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER
    ';
    
    -- Crear trigger
    EXECUTE '
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
    ';
    
    RAISE NOTICE '✅ Trigger para perfiles creado/reparado';
END $$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    -- Contar tablas
    RAISE NOTICE 'Tablas creadas: %', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('perfiles', 'madres', 'examenes_eoa', 'partos_importados')
    );
    
    -- Contar políticas
    RAISE NOTICE 'Políticas RLS creadas: %', (
        SELECT COUNT(*) FROM pg_policies 
        WHERE tablename IN ('perfiles', 'madres', 'examenes_eoa', 'partos_importados')
    );
    
    -- Contar índices
    RAISE NOTICE 'Índices creados: %', (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    );
    
    -- Verificar trigger
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE 'Trigger automático: ✅ Activo';
    ELSE
        RAISE NOTICE 'Trigger automático: ❌ Inactivo';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 REPARACIONES COMPLETADAS';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora puedes:';
    RAISE NOTICE '1. Probar la conexión con test-supabase-connection.html';
    RAISE NOTICE '2. Usar la aplicación TAU normalmente';
    RAISE NOTICE '3. Verificar que todo funcione correctamente';
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE DIAGNÓSTICO Y REPARACIÓN
-- =====================================================