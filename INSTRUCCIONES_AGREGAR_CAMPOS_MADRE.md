# Instrucciones para Agregar Campos de Madre en Registro NEO

## Problema Identificado

El error "Error al registrar bebé" ocurre porque la aplicación está intentando guardar los campos `nombre_madre` y `apellido_madre` en la base de datos, pero estos campos no existen en la tabla `pacientes`.

## Solución

### Paso 1: Ejecutar SQL en Supabase

Ve a la consola de Supabase y sigue estos pasos:

1. Inicia sesión en [supabase.com](https://supabase.com)
2. Selecciona tu proyecto
3. Ve a la sección **SQL Editor**
4. Crea una nueva consulta
5. Ejecuta los siguientes comandos uno por uno:

```sql
-- Agregar campo para nombre de la madre
ALTER TABLE pacientes ADD COLUMN nombre_madre VARCHAR(100);
```

```sql
-- Agregar campo para apellido de la madre  
ALTER TABLE pacientes ADD COLUMN apellido_madre VARCHAR(100);
```

### Paso 2: Verificar los campos

Para verificar que los campos se agregaron correctamente, ejecuta:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
    AND table_schema = 'public'
    AND column_name IN ('nombre_madre', 'apellido_madre')
ORDER BY column_name;
```

Deberías ver ambos campos en el resultado.

## Cambios Realizados en el Código

### 1. Formulario NEO Modificado

Se agregaron los siguientes campos al formulario de registro de bebés (NEO):

- **Nombre de la Madre** (opcional)
- **Apellido de la Madre** (opcional)

Estos campos se encuentran en una nueva sección "Datos de la Madre (opcional)".

### 2. Lógica de Registro Actualizada

El código JavaScript ahora:

- Lee los valores de los campos de la madre
- Los incluye en el objeto `formData` solo si se proporcionan
- Maneja errores específicos con mensajes más descriptivos
- Registra detalles del error en la consola para facilitar debugging

### 3. Manejo de Errores Mejorado

Se agregaron mensajes de error específicos para:

- **Error 42703**: Columna no reconocida (cuando faltan los campos en la BD)
- **Error 23502**: Campos obligatorios faltantes
- **Error 23505**: RUT duplicado
- **Otros errores**: Muestra el mensaje específico del error

## Pruebas

Una vez agregados los campos en la base de datos:

1. Abre la aplicación
2. Haz clic en "Registrar"
3. Selecciona "Bebé (NEO)"
4. Completa los datos del bebé
5. Opcionalmente, completa los datos de la madre
6. Haz clic en "Guardar Bebé"

El registro debería funcionar correctamente.

## Notas Importantes

- Los campos de la madre son **completamente opcionales**
- Si no se proporcionan, no se incluyen en el registro
- El registro del bebé funcionará igual sin estos datos
- Los campos se agregan solo para registros de tipo 'NEO'
- Los registros de tipo 'MADRE' no utilizan estos campos

## Si el Problema Persiste

Si después de agregar los campos el error continúa:

1. Revisa la consola del navegador (F12) para ver detalles del error
2. Verifica que los campos se hayan creado correctamente en Supabase
3. Asegúrate de que el usuario tiene permisos para escribir en la tabla `pacientes`

## Archivos Modificados

- `dashboard.html`: Formulario y lógica de registro
- `INSTRUCCIONES_AGREGAR_CAMPOS_MADRE.md`: Este archivo de instrucciones