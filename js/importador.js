// Funcionalidad para importar datos de partos desde archivos Excel

// Variable global para almacenar la librería SheetJS
let XLSX = null;

// Cargar la librería SheetJS dinámicamente
function cargarSheetJS() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve(window.XLSX);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => {
            XLSX = window.XLSX;
            resolve(window.XLSX);
        };
        script.onerror = () => reject(new Error('No se pudo cargar la librería SheetJS'));
        document.head.appendChild(script);
    });
}

// Función para procesar archivo Excel
async function procesarArchivoExcel(file) {
    try {
        // Cargar SheetJS si no está disponible
        if (!XLSX) {
            await cargarSheetJS();
        }

        // Mostrar notificación de procesamiento
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Procesando archivo Excel...', 'info');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Obtener la primera hoja del workbook
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertir a JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    // Procesar datos
                    const datosProcesados = procesarDatosExcel(jsonData, file.name);
                    
                    resolve(datosProcesados);
                } catch (error) {
                    console.error('Error al procesar el archivo Excel:', error);
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        console.error('Error en procesarArchivoExcel:', error);
        throw error;
    }
}

// Función para procesar los datos del Excel y validarlos
function procesarDatosExcel(jsonData, nombreArchivo) {
    // Eliminar filas vacías y obtener encabezados
    const datosLimpios = jsonData.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
    
    if (datosLimpios.length < 2) {
        throw new Error('El archivo no contiene datos válidos');
    }
    
    // La primera fila contiene los encabezados
    const encabezados = datosLimpios[0];
    const filasDatos = datosLimpios.slice(1);
    
    // Mapear columnas esperadas
    const mapaColumnas = identificarColumnas(encabezados);
    
    if (!mapaColumnas.rut || !mapaColumnas.nombre || !mapaColumnas.apellido || !mapaColumnas.fechaParto) {
        throw new Error('El archivo debe contener columnas para RUT, nombre, apellido y fecha de parto');
    }
    
    // Procesar cada fila
    const datosProcesados = filasDatos.map((fila, index) => {
        try {
            const rut = limpiarRUT(fila[mapaColumnas.rut]);
            const nombre = limpiarTexto(fila[mapaColumnas.nombre]);
            const apellido = limpiarTexto(fila[mapaColumnas.apellido]);
            const fechaParto = parsearFecha(fila[mapaColumnas.fechaParto]);
            
            // Validaciones básicas
            if (!rut || !nombre || !apellido || !fechaParto) {
                console.warn(`Fila ${index + 2} con datos incompletos, omitiendo:`, fila);
                return null;
            }
            
            return {
                rut: rut,
                nombre: nombre,
                apellido: apellido,
                fecha_parto: fechaParto,
                archivo_origen: nombreArchivo,
                fila_original: index + 2 // Para referencia
            };
        } catch (error) {
            console.warn(`Error procesando fila ${index + 2}:`, error);
            return null;
        }
    }).filter(item => item !== null); // Eliminar filas nulas
    
    if (datosProcesados.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
    }
    
    return datosProcesados;
}

// Función para identificar las columnas del Excel
function identificarColumnas(encabezados) {
    const mapa = {};
    
    encabezados.forEach((encabezado, index) => {
        const texto = (encabezado || '').toString().toLowerCase().trim();
        
        if (texto.includes('rut')) {
            mapa.rut = index;
        } else if (texto.includes('nombre') && !texto.includes('apellido')) {
            mapa.nombre = index;
        } else if (texto.includes('apellido')) {
            mapa.apellido = index;
        } else if (texto.includes('fecha') && (texto.includes('parto') || texto.includes('nacimiento'))) {
            mapa.fechaParto = index;
        }
    });
    
    return mapa;
}

// Función para limpiar y formatear RUT
function limpiarRUT(rut) {
    if (!rut) return '';
    return rut.toString().replace(/[^\dKk]/g, '').toUpperCase();
}

// Función para limpiar texto
function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim();
}

// Función para parsear fecha
function parsearFecha(fecha) {
    if (!fecha) return null;
    
    // Si ya es un objeto Date
    if (fecha instanceof Date) {
        return fecha.toISOString().split('T')[0];
    }
    
    // Si es un número (formato de Excel)
    if (typeof fecha === 'number') {
        const date = new Date((fecha - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    // Si es un string, intentar diferentes formatos
    const fechaStr = fecha.toString().trim();
    
    // Formato DD/MM/YYYY o DD-MM-YYYY
    const regex1 = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/;
    const match1 = fechaStr.match(regex1);
    if (match1) {
        const [, dia, mes, año] = match1;
        return `${año}-${mes}-${dia}`;
    }
    
    // Formato YYYY/MM/DD o YYYY-MM-DD
    const regex2 = /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/;
    const match2 = fechaStr.match(regex2);
    if (match2) {
        const [, año, mes, dia] = match2;
        return `${año}-${mes}-${dia}`;
    }
    
    // Intentar parseo directo
    const date = new Date(fechaStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

// Función para guardar datos en Supabase
async function guardarDatosPartos(datos) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Cliente de Supabase no disponible');
        }
        
        // Insertar datos en lotes para evitar límites
        const batchSize = 100;
        const resultados = [];
        
        for (let i = 0; i < datos.length; i += batchSize) {
            const batch = datos.slice(i, i + batchSize);
            
            const { data, error } = await window.supabaseClient
                .from('partos_importados')
                .insert(batch)
                .select();
            
            if (error) {
                throw error;
            }
            
            resultados.push(...(data || []));
        }
        
        return resultados;
    } catch (error) {
        console.error('Error al guardar datos en Supabase:', error);
        throw error;
    }
}

// Función para cruzar datos importados con registros manuales
async function cruzarDatosConRegistros() {
    try {
        if (!window.supabaseClient) {
            throw new Error('Cliente de Supabase no disponible');
        }
        
        // Obtener todos los partos importados no procesados
        const { data: partosImportados, error: errorImportados } = await window.supabaseClient
            .from('partos_importados')
            .select('*')
            .eq('procesado', false);
        
        if (errorImportados) {
            throw errorImportados;
        }
        
        if (!partosImportados || partosImportados.length === 0) {
            return { message: 'No hay datos importados pendientes de procesar' };
        }
        
        // Obtener todas las madres registradas manualmente
        const { data: madresRegistradas, error: errorMadres } = await window.supabaseClient
            .from('madres')
            .select('*');
        
        if (errorMadres) {
            throw errorMadres;
        }
        
        // Crear mapa de RUT a ID de madre para búsqueda rápida
        const mapaRutMadre = new Map();
        madresRegistradas.forEach(madre => {
            const rutNormalizado = madre.rut.replace('-', '').toUpperCase();
            mapaRutMadre.set(rutNormalizado, madre.id);
        });
        
        // Cruzar datos
        const actualizaciones = [];
        const nuevosRegistros = [];
        
        partosImportados.forEach(parto => {
            const rutNormalizado = parto.rut.replace('-', '').toUpperCase();
            const madreId = mapaRutMadre.get(rutNormalizado);
            
            if (madreId) {
                // Se encontró coincidencia
                actualizaciones.push({
                    id: parto.id,
                    madre_id: madreId,
                    procesado: true
                });
            } else {
                // No se encontró coincidencia
                nuevosRegistros.push({
                    ...parto,
                    procesado: true
                });
            }
        });
        
        // Actualizar registros con coincidencias
        if (actualizaciones.length > 0) {
            for (const actualizacion of actualizaciones) {
                const { error } = await window.supabaseClient
                    .from('partos_importados')
                    .update({
                        madre_id: actualizacion.madre_id,
                        procesado: actualizacion.procesado
                    })
                    .eq('id', actualizacion.id);
                
                if (error) {
                    console.error('Error actualizando registro:', error);
                }
            }
        }
        
        // Marcar como procesados los registros sin coincidencias
        if (nuevosRegistros.length > 0) {
            for (const nuevo of nuevosRegistros) {
                const { error } = await window.supabaseClient
                    .from('partos_importados')
                    .update({ procesado: true })
                    .eq('id', nuevo.id);
                
                if (error) {
                    console.error('Error actualizando registro sin coincidencia:', error);
                }
            }
        }
        
        return {
            totalProcesados: partosImportados.length,
            coincidencias: actualizaciones.length,
            sinCoincidencia: nuevosRegistros.length
        };
        
    } catch (error) {
        console.error('Error al cruzar datos:', error);
        throw error;
    }
}

// Función principal para importar archivo
async function importarArchivoPartos(file) {
    try {
        // Validar tipo de archivo
        if (!file || !file.name.match(/\.(xlsx|xls)$/)) {
            throw new Error('Por favor, seleccione un archivo Excel válido (.xlsx o .xls)');
        }
        
        // Procesar archivo
        const datosProcesados = await procesarArchivoExcel(file);
        
        // Guardar en base de datos
        const resultados = await guardarDatosPartos(datosProcesados);
        
        // Cruzar datos con registros manuales
        const resultadoCruce = await cruzarDatosConRegistros();
        
        // Mostrar resultados
        if (window.utils && window.utils.showNotification) {
            const mensaje = `Se importaron ${resultados.length} registros. ` +
                `${resultadoCruce.coincidencias || 0} coincidencias encontradas, ` +
                `${resultadoCruce.sinCoincidencia || 0} sin coincidencias.`;
            window.utils.showNotification(mensaje, 'success');
        }
        
        // Recargar dashboard para mostrar nuevos datos
        if (window.dashboard && window.dashboard.loadRecentMothers) {
            await window.dashboard.loadRecentMothers();
        }
        
        return {
            exito: true,
            datosImportados: resultados.length,
            coincidencias: resultadoCruce.coincidencias || 0,
            sinCoincidencia: resultadoCruce.sinCoincidencia || 0
        };
        
    } catch (error) {
        console.error('Error en importación:', error);
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification(`Error: ${error.message}`, 'error');
        }
        return {
            exito: false,
            error: error.message
        };
    }
}

// Exportar funciones para uso global
window.importador = {
    importarArchivoPartos,
    procesarArchivoExcel,
    cruzarDatosConRegistros
};