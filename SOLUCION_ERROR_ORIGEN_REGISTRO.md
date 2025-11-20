# Solución Error: Violación de restricción `madres_origen_registro_check`

## Problema

Al intentar registrar un bebé en el sistema, aparece el siguiente error:

```
Error al registrar bebé: {code: '23514', details: null, hint: null, message: 'new row for relation "pacientes" violates check constraint "madres_origen_registro_check"'}
```

## Causa

El error ocurre porque la restricción `CHECK` en el campo `origen_registro` de la tabla `pacientes` no permite el valor 'NEO' que se utiliza para los registros de bebés desde la unidad neonatal (NEO).

## Solución

### Paso 1: Ejecutar script SQL

Ejecuta el siguiente script en el SQL Editor de Supabase:

```sql
-- Archivo: corregir-restriccion-origen-registro.sql
```

Este script:
1. Elimina la restricción check existente
2. Crea una nueva restricción que permite los valores: 'MANUAL', 'IMPORTADO', 'NEO', 'SISTEMA'
3. Verifica que la restricción se haya aplicado correctamente

### Paso 2: Verificar la solución

Después de ejecutar el script, el sistema debería permitir registrar bebés con `origen_registro = 'NEO'` sin errores.

### Paso 3: Probar el registro

1. Abre la aplicación TAU
2. Haz clic en "Registrar"
3. Selecciona "Bebé (NEO)"
4. Completa el formulario y envía
5. El registro debería guardarse exitosamente

## Detalles técnicos

### Valores permitidos en `origen_registro`:

- **MANUAL**: Registros ingresados manualmente por usuarios (madres)
- **IMPORTADO**: Registros importados desde archivos Excel
- **NEO**: Registros de bebés ingresados desde la unidad neonatal
- **SISTEMA**: Registros creados automáticamente por el sistema

### Flujo del registro de bebés:

1. El formulario de bebé envía los datos a la tabla `pacientes`
2. Se establece `tipo_paciente = 'BEBE'`
3. Se establece `origen_registro = 'NEO'`
4. Se establece `cantidad_hijos = 1` (valor por defecto para bebés)
5. Opcionalmente, se crea un registro inicial en `examenes_eoa`

## Archivos relacionados

- `dashboard.html`: Formulario de registro de bebés (líneas 1124-1135)
- `corregir-restriccion-origen-registro.sql`: Script para corregir la restricción
- `supabase-tablas-corregidas.sql`: Definición correcta de la tabla pacientes

## Notas importantes

- Este cambio es compatible con registros existentes
- No afecta el funcionamiento de los registros de madres
- No requiere cambios en el código JavaScript
- La restricción ahora es más flexible y permite todos los casos de uso

## Si el problema persiste

1. Verifica que el script SQL se haya ejecutado sin errores
2. Revisa las restricciones actuales de la tabla pacientes
3. Verifica que el valor 'NEO' esté incluido en la restricción CHECK
4. Contacta al administrador de la base de datos si necesitas asistencia adicional