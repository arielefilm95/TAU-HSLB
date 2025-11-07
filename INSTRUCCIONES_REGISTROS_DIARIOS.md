# Instrucciones para Implementar Registros Diarios en Dashboard

## Objetivo
Configurar el sistema para que en "Registros Recientes" del dashboard solo aparezcan:
1. Registros manuales creados durante el día actual
2. Excluir pacientes importados desde Excel
3. Limpiar automáticamente la lista a medianoche

## Cambios Realizados

### 1. Modificaciones en JavaScript
- **js/dashboard.js**: Modificada la función `loadRecentMothers()` para filtrar por fecha actual y origen manual
- **dashboard.html**: Actualizada la función `loadRecentMothersDirectly()` con misma lógica
- **js/importados.js**: Agregado campo `origen_registro: 'IMPORTADO'` al crear madres desde importación

### 2. Nuevas Funcionalidades
- **Limpieza automática**: Se agregó `setupMidnightCleanup()` que verifica cada minuto si es medianoche y limpia la visualización
- **Filtro por origen**: Se usa el campo `origen_registro` para diferenciar registros manuales de importados
- **Filtro por fecha**: Solo se muestran registros creados el mismo día

## Pasos para Implementación

### Paso 1: Ejecutar Script SQL
Ejecuta el archivo `agregar-campo-origen-madres.sql` en el SQL Editor de Supabase:

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor**
3. Copia y pega todo el contenido del archivo `agregar-campo-origen-madres.sql`
4. Haz clic en **Run** para ejecutar el script

Este script:
- Agrega el campo `origen_registro` a la tabla `madres`
- Crea un índice para mejorar el rendimiento
- Actualiza automáticamente los registros existentes que tengan referencia en `partos_importados`
- Establece el valor por defecto 'MANUAL' para nuevos registros

### Paso 2: Verificar Cambios
Después de ejecutar el script, verifica que todo funcione correctamente:

1. **Registra una madre manualmente** desde el dashboard
2. **Importa un archivo Excel** con datos de partos
3. **Verifica que en "Registros Recientes" solo aparezca la madre manual**
4. **Verifica que la madre importada no aparezca en registros recientes**

### Paso 3: Probar Limpieza Automática
Para probar la limpieza automática sin esperar a medianoche:

1. Abre la consola del navegador en el dashboard
2. Ejecuta: `window.dashboard.clearRecentMothersDisplay()`
3. Verifica que la lista de registros recientes se limpie

## Comportamiento Esperado

### Durante el Día
- ✅ Solo aparecen registros manuales creados el mismo día
- ✅ Los registros importados desde Excel no aparecen
- ✅ Los registros de días anteriores no aparecen

### A Medianoche (00:00:00)
- ✅ La lista de registros recientes se limpia automáticamente
- ✅ Al día siguiente, solo mostrará los nuevos registros del día

### En la Vista de Importados
- ✅ Los pacientes importados siguen disponibles en `importados.html`
- ✅ Se pueden agregar exámenes EOA a pacientes importados
- ✅ No afecta el funcionamiento normal del sistema

## Solución de Problemas

### Si no aparecen registros recientes:
1. Verifica que el campo `origen_registro` se haya creado correctamente
2. Ejecuta: `SELECT origen_registro, COUNT(*) FROM madres GROUP BY origen_registro;`
3. Si faltan valores, actualiza manualmente: `UPDATE madres SET origen_registro = 'MANUAL' WHERE origen_registro IS NULL;`

### Si aparecen registros importados:
1. Verifica que el script SQL se ejecutó correctamente
2. Revisa que los registros importados tengan `origen_registro = 'IMPORTADO'`
3. Actualiza si es necesario: `UPDATE madres SET origen_registro = 'IMPORTADO' WHERE id IN (SELECT DISTINCT madre_id FROM partos_importados WHERE madre_id IS NOT NULL);`

### Si la limpieza automática no funciona:
1. Verifica que no haya errores en la consola del navegador
2. Ejecuta manualmente: `window.dashboard.setupMidnightCleanup()`
3. Revisa que la función se esté ejecutando cada minuto

## Notas Técnicas

### Rendimiento
- Se agregó índice en `origen_registro` para consultas rápidas
- Las consultas usan filtros eficientes por fecha y origen
- El sistema tiene fallbacks si el campo `origen_registro` no está disponible

### Compatibilidad
- El código mantiene compatibilidad con versiones anteriores
- Si el campo `origen_registro` no existe, usa el método anterior de filtrado
- No se pierden datos existentes

### Mantenimiento
- No requiere mantenimiento adicional
- La limpieza es automática y no afecta los datos
- Los registros permanecen en la base de datos, solo se ocultan en la vista

## Resumen
Con estos cambios, el dashboard ahora muestra una vista más limpia y enfocada en el trabajo del día actual, excluyendo automáticamente los datos importados y limpiando la vista cada medianoche para empezar fresh el siguiente día.