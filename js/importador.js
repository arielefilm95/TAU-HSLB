// Funcionalidad para importar datos de partos desde archivos Excel

// Variable global para almacenar la librería SheetJS (compartida entre cargas)
if (typeof window.__TAU_XLSX__ === 'undefined') {
    window.__TAU_XLSX__ = null;
}

function setSheetJS(instance) {
    window.__TAU_XLSX__ = instance;
}

function getSheetJS() {
    return window.__TAU_XLSX__;
}

function normalizarTexto(texto) {
    if (texto === null || texto === undefined) {
        return '';
    }
    return texto.toString()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Cargar la librería SheetJS dinámicamente
function cargarSheetJS() {
    return new Promise((resolve, reject) => {
        const existente = getSheetJS();
        if (existente && typeof existente.read === 'function') {
            console.log('✅ SheetJS ya está disponible');
            resolve(existente);
            return;
        }

        console.log('🔄 Cargando SheetJS desde CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
            console.log('📦 Script SheetJS cargado, verificando disponibilidad...');
            
            // Esperar más tiempo y verificar múltiples veces
            let intentos = 0;
            const maxIntentos = 10;
            
            const verificarDisponibilidad = () => {
                intentos++;
                console.log(`🔍 Verificación ${intentos}/${maxIntentos}: window.XLSX =`, !!window.XLSX);
                
                if (window.XLSX && typeof window.XLSX.read === 'function') {
                    setSheetJS(window.XLSX);
                    console.log('✅ SheetJS disponible y funcional');
                    resolve(window.XLSX);
                } else if (intentos >= maxIntentos) {
                    console.error('❌ SheetJS no está disponible después de múltiples intentos');
                    reject(new Error('SheetJS no se pudo cargar correctamente'));
                } else {
                    setTimeout(verificarDisponibilidad, 200);
                }
            };
            
            // Iniciar verificación después de un breve retraso
            setTimeout(verificarDisponibilidad, 300);
        };
        
        script.onerror = (error) => {
            console.error('❌ Error cargando SheetJS:', error);
            reject(new Error('No se pudo cargar la librería SheetJS'));
        };
        
        document.head.appendChild(script);
    });
}

// Función para procesar archivo Excel
async function procesarArchivoExcel(file) {
    try {
        // Validar archivo
        if (!file) {
            throw new Error('No se seleccionó ningún archivo');
        }
        
        // Mostrar notificación de procesamiento
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Procesando archivo Excel...', 'info');
        }

        // Usar un enfoque diferente: cargar SheetJS dentro de la promesa
        return new Promise((resolve, reject) => {
            console.log('🔄 Iniciando carga de SheetJS...');
            
            // Función para procesar una vez que SheetJS esté cargado
            const procesarConSheetJS = () => {
                try {
                    const sheetJS = getSheetJS() || window.XLSX;
                    if (!sheetJS || typeof sheetJS.read !== 'function') {
                        throw new Error('SheetJS no está disponible correctamente');
                    }
                    
                    console.log('✅ SheetJS disponible, procesando archivo...');
                    
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        try {
                            console.log('📖 Leyendo archivo Excel...');
                            const data = new Uint8Array(e.target.result);
                            
                            // Validar datos antes de procesar
                            if (!data || data.length === 0) {
                                throw new Error('El archivo está vacío o no se pudo leer');
                            }
                            
                            console.log('📊 Procesando workbook con SheetJS...');
                            const workbook = sheetJS.read(data, { type: 'array' });
                            
                            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                                throw new Error('El archivo no contiene hojas válidas');
                            }
                            
                            // Obtener la primera hoja del workbook
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            
                            if (!worksheet) {
                                throw new Error('No se pudo acceder a la primera hoja del archivo');
                            }
                            
                            // Convertir a JSON
                            const jsonData = sheetJS.utils.sheet_to_json(worksheet, { header: 1 });
                            
                            console.log(`📋 Se encontraron ${jsonData.length} filas en el Excel`);
                            
                            // Procesar datos
                            const datosProcesados = procesarDatosExcel(jsonData, file.name);
                            
                            console.log(`✅ Se procesaron ${datosProcesados.length} registros válidos`);
                            resolve(datosProcesados);
                        } catch (error) {
                            console.error('❌ Error al procesar el archivo Excel:', error);
                            reject(error);
                        }
                    };
                    
                    reader.onerror = function(e) {
                        console.error('❌ Error en FileReader:', e);
                        reject(new Error('Error al leer el archivo'));
                    };
                    
                    reader.readAsArrayBuffer(file);
                    
                } catch (error) {
                    console.error('❌ Error en procesarConSheetJS:', error);
                    reject(error);
                }
            };
            
            // Verificar si SheetJS ya está disponible
            if ((getSheetJS() || window.XLSX) && typeof (getSheetJS() || window.XLSX).read === 'function') {
                console.log('🚀 SheetJS ya está disponible');
                procesarConSheetJS();
                return;
            }
            
            // Cargar SheetJS si no está disponible
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('📦 Script SheetJS cargado');
                // Esperar un momento y verificar
                setTimeout(() => {
                    if (window.XLSX && typeof window.XLSX.read === 'function') {
                        setSheetJS(window.XLSX);
                        console.log('✅ SheetJS verificado y disponible');
                        procesarConSheetJS();
                    } else {
                        console.error('❌ SheetJS no está disponible después de la carga');
                        reject(new Error('No se pudo cargar SheetJS correctamente'));
                    }
                }, 500);
            };
            
            script.onerror = (error) => {
                console.error('❌ Error cargando SheetJS:', error);
                reject(new Error('No se pudo cargar la librería SheetJS'));
            };
            
            document.head.appendChild(script);
        });
        
    } catch (error) {
        console.error('❌ Error en procesarArchivoExcel:', error);
        throw error;
    }
}

// Función para procesar los datos del Excel y validarlos
function procesarDatosExcel(jsonData, nombreArchivo) {
    // Eliminar filas vacías
    const datosLimpios = jsonData.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''));

    if (datosLimpios.length < 2) {
        throw new Error('El archivo no contiene datos válidos');
    }

    const { encabezados, data: filasDatos } = obtenerEncabezados(datosLimpios);
    const mapaColumnas = identificarColumnas(encabezados);

    const tieneSeparado = typeof mapaColumnas.rut === 'number' &&
        typeof mapaColumnas.nombre === 'number' &&
        typeof mapaColumnas.apellido === 'number' &&
        typeof mapaColumnas.fechaParto === 'number';

    const tieneNombreCompleto = typeof mapaColumnas.rut === 'number' &&
        typeof mapaColumnas.nombreCompleto === 'number' &&
        typeof mapaColumnas.fechaParto === 'number';

    if (!tieneSeparado && !tieneNombreCompleto) {
        throw new Error('El archivo debe contener columnas para RUT, nombre/apellido (o nombre completo) y fecha de parto');
    }

    const datosProcesados = filasDatos.map((fila, index) => {
        try {
            const rut = limpiarRUT(fila[mapaColumnas.rut]);

            let nombre = mapaColumnas.nombre !== undefined ? limpiarTexto(fila[mapaColumnas.nombre]) : '';
            let apellido = mapaColumnas.apellido !== undefined ? limpiarTexto(fila[mapaColumnas.apellido]) : '';

            if ((!nombre || !apellido) && mapaColumnas.nombreCompleto !== undefined) {
                const nombreCompleto = limpiarTexto(fila[mapaColumnas.nombreCompleto]);
                if (nombreCompleto) {
                    const partes = nombreCompleto.split(/\s+/);
                    if (!nombre) {
                        nombre = partes.shift() || '';
                    }
                    if (!apellido) {
                        apellido = partes.join(' ').trim();
                    }
                }
            }

            const fechaParto = parsearFecha(fila[mapaColumnas.fechaParto]);

            if (!rut || !nombre || !apellido || !fechaParto) {
                console.warn(`Fila ${index + 2} con datos incompletos, omitiendo:`, fila);
                return null;
            }

            return {
                rut,
                nombre,
                apellido,
                fecha_parto: fechaParto,
                archivo_origen: nombreArchivo,
                fila_original: index + 2
            };
        } catch (error) {
            console.warn(`Error procesando fila ${index + 2}:`, error);
            return null;
        }
    }).filter(Boolean);

    if (datosProcesados.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
    }

    return datosProcesados;
}

// Función para identificar las columnas del Excel
function identificarColumnas(encabezados = []) {
    const mapa = {};

    const sinonimos = {
        rut: ['rut', 'r.u.t', 'run', 'documento'],
        nombre: ['nombre', 'nombres', 'nombre madre'],
        apellido: ['apellido', 'apellidos'],
        nombreCompleto: [
            'nombre completo',
            'nombre y apellido',
            'madre',
            'paciente',
            'familia',
            'nombre paciente',
            'paciente madre'
        ],
        fechaParto: ['fecha parto', 'fecha de parto', 'fecha nacimiento', 'fecha de nacimiento', 'fecha parto/nacimiento']
    };

    encabezados.forEach((encabezado, index) => {
        const texto = normalizarTexto(encabezado);

        if (!texto) {
            return;
        }

        if (sinonimos.rut.some(s => texto.includes(s))) {
            mapa.rut = index;
        } else if (sinonimos.nombre.some(s => texto === s)) {
            mapa.nombre = index;
        } else if (sinonimos.apellido.some(s => texto.includes(s))) {
            mapa.apellido = index;
        } else if (sinonimos.nombreCompleto.some(s => texto.includes(s))) {
            mapa.nombreCompleto = index;
        } else if (sinonimos.fechaParto.some(s => texto.includes(s))) {
            mapa.fechaParto = index;
        }
    });

    return mapa;
}

function obtenerEncabezados(jsonData) {
    if (!Array.isArray(jsonData)) {
        return { encabezados: [], data: [] };
    }

    for (let i = 0; i < jsonData.length; i++) {
        const fila = jsonData[i];
        if (!Array.isArray(fila)) {
            continue;
        }

        const textoFila = fila.map(normalizarTexto).join(' ');
        if (textoFila.includes('rut') || textoFila.includes('nombre') || textoFila.includes('parto')) {
            return {
                encabezados: fila,
                data: jsonData.slice(i + 1)
            };
        }
    }

    return {
        encabezados: jsonData[0] || [],
        data: jsonData.slice(1)
    };
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
        
        // Obtener todos los pacientes registrados manualmente (solo madres para compatibilidad)
        const { data: pacientesRegistrados, error: errorPacientes } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('tipo_paciente', 'MADRE');
        
        if (errorPacientes) {
            throw errorPacientes;
        }
        
        // Crear mapa de RUT a ID de paciente para búsqueda rápida
        const mapaRutPaciente = new Map();
        pacientesRegistrados.forEach(paciente => {
            const rutNormalizado = paciente.rut.replace('-', '').toUpperCase();
            mapaRutPaciente.set(rutNormalizado, paciente.id);
        });
        
        // Cruzar datos
        const actualizaciones = [];
        const nuevosRegistros = [];
        
        partosImportados.forEach(parto => {
            const rutNormalizado = parto.rut.replace('-', '').toUpperCase();
            const pacienteId = mapaRutPaciente.get(rutNormalizado);
            
            if (pacienteId) {
                // Se encontró coincidencia
                actualizaciones.push({
                    id: parto.id,
                    madre_id: pacienteId, // Mantener madre_id para compatibilidad con examenes_eoa
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
        if (window.dashboard && window.dashboard.loadRecentPatients) {
            await window.dashboard.loadRecentPatients();
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
