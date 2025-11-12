-- Crear tabla para almacenar datos de partos importados desde Excel
CREATE TABLE IF NOT EXISTS partos_importados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rut VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_parto DATE NOT NULL,
    archivo_origen VARCHAR(255) NOT NULL, -- Nombre del archivo Excel de origen
    fecha_importacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    procesado BOOLEAN DEFAULT FALSE, -- Si ya fue cruzado con registros manuales
    paciente_id UUID REFERENCES pacientes(id), -- Referencia al paciente registrado manualmente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_partos_importados_rut ON partos_importados(rut);
CREATE INDEX IF NOT EXISTS idx_partos_importados_procesado ON partos_importados(procesado);
CREATE INDEX IF NOT EXISTS idx_partos_importados_madre_id ON partos_importados(madre_id);
CREATE INDEX IF NOT EXISTS idx_partos_importados_fecha_parto ON partos_importados(fecha_parto);

-- Crear política RLS (Row Level Security)
ALTER TABLE partos_importados ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidad)
CREATE POLICY "Permitir todas las operaciones en partos_importados" ON partos_importados
    FOR ALL USING (true)
    WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE partos_importados IS 'Tabla para almacenar datos de partos importados desde archivos Excel';
COMMENT ON COLUMN partos_importados.rut IS 'RUT de la madre que tuvo el parto';
COMMENT ON COLUMN partos_importados.nombre IS 'Nombre de la madre';
COMMENT ON COLUMN partos_importados.apellido IS 'Apellido de la madre';
COMMENT ON COLUMN partos_importados.fecha_parto IS 'Fecha del parto';
COMMENT ON COLUMN partos_importados.archivo_origen IS 'Nombre del archivo Excel del que se importaron los datos';
COMMENT ON COLUMN partos_importados.fecha_importacion IS 'Fecha y hora en que se importaron los datos';
COMMENT ON COLUMN partos_importados.procesado IS 'Indica si el registro ya fue cruzado con los registros manuales';
COMMENT ON COLUMN partos_importados.madre_id IS 'Referencia al registro manual de la madre (si existe)';