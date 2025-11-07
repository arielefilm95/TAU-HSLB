// Funcionalidad para la página de datos importados

// Variables globales
let datosImportados = [];
let datosFiltrados = [];
let datosMadres = new Map();
let datosEOA = new Map();

// Función para cargar todos los datos
async function cargarDatos() {
    try {
        if (!window.supabaseClient) {
            throw new Error('Cliente de Supabase no disponible');
        }
        
        // Mostrar estado de carga
        mostrarCarga();
        
        // Cargar datos en paralelo
        const [partosResult, madresResult, eoaResult] = await Promise.all([
            window.supabaseClient
                .from('partos_importados')
                .select('*')
                .order('fecha_importacion', { ascending: false }),
            
            window.supabaseClient
                .from('madres')
                .select('*'),
            
            window.supabaseClient
                .from('examenes_eoa')
                .select('id,madre_id,od_resultado,oi_resultado,fecha_examen')
        ]);
        
        if (partosResult.error) throw partosResult.error;
        if (madresResult.error) throw madresResult.error;
        if (eoaResult.error) throw eoaResult.error;
        
        // Procesar datos
        datosImportados = partosResult.data || [];
        datosFiltrados = [...datosImportados];
        
        // Crear mapas para búsqueda rápida
        datosMadres.clear();
        (madresResult.data || []).forEach(madre => {
            const rutNormalizado = madre.rut.replace('-', '').toUpperCase();
            datosMadres.set(rutNormalizado, madre);
        });
        
        datosEOA.clear();
        (eoaResult.data || []).forEach(eoa => {
            if (!datosEOA.has(eoa.madre_id)) {
                datosEOA.set(eoa.madre_id, []);
            }
            datosEOA.get(eoa.madre_id).push(eoa);
        });
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
        // Mostrar datos
        mostrarDatos();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarError(`Error al cargar datos: ${error.message}`);
    }
}

// Función para actualizar estadísticas
function actualizarEstadisticas() {
    const totalImportados = datosFiltrados.length;
    const totalCoincidencias = datosFiltrados.filter(item => item.madre_id).length;
    const totalSinCoincidencia = totalImportados - totalCoincidencias;
    
    // Contar cuántos tienen EOA realizado
    let totalConEOA = 0;
    datosFiltrados.forEach(item => {
        if (item.madre_id && datosEOA.has(item.madre_id)) {
            totalConEOA++;
        }
    });
    
    // Actualizar DOM
    document.getElementById('totalImportados').textContent = totalImportados;
    document.getElementById('totalCoincidencias').textContent = totalCoincidencias;
    document.getElementById('totalSinCoincidencia').textContent = totalSinCoincidencia;
    document.getElementById('totalConEOA').textContent = totalConEOA;
}

// Función para mostrar datos en la tabla
function mostrarDatos() {
    const container = document.getElementById('importadosList');
    
    if (!container) return;
    
    if (datosFiltrados.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos para mostrar</p>';
        return;
    }
    
    const html = datosFiltrados.map(item => {
        const rutNormalizado = item.rut.replace('-', '').toUpperCase();
        const madre = datosMadres.get(rutNormalizado);
        const tieneEOA = item.madre_id && datosEOA.has(item.madre_id);
        
        // Determinar clases de estado
        const itemClasses = ['importado-item'];
        if (item.madre_id) {
            itemClasses.push('con-registro');
        } else {
            itemClasses.push('sin-registro');
        }
        
        if (tieneEOA) {
            itemClasses.push('con-eoa');
        } else {
            itemClasses.push('sin-eoa');
        }
        
        // Formatear fecha
        const fechaParto = window.utils ? window.utils.formatearFecha(item.fecha_parto) : new Date(item.fecha_parto).toLocaleDateString();
        const fechaImportacion = window.utils ? window.utils.formatearFecha(item.fecha_importacion) : new Date(item.fecha_importacion).toLocaleDateString();
        
        return `
            <div class="${itemClasses.join(' ')}" data-id="${item.id}">
                <div class="importado-item-header">
                    <div class="importado-item-rut">${window.utils ? window.utils.escapeHTML(window.utils.formatearRUT(item.rut)) : item.rut}</div>
                    <div class="importado-item-nombre">${window.utils ? window.utils.escapeHTML(`${item.nombre} ${item.apellido}`) : `${item.nombre} ${item.apellido}`}</div>
                    <div class="importado-item-fecha">${fechaParto}</div>
                </div>
                <div class="importado-item-status">
                    ${item.madre_id ? 
                        `<span class="status-pill success">Con registro manual</span>` : 
                        `<span class="status-pill warning">Sin registro manual</span>`
                    }
                    ${tieneEOA ? 
                        `<span class="status-pill success">EOA realizado</span>` : 
                        `<span class="status-pill pending">EOA pendiente</span>`
                    }
                </div>
                <div class="importado-item-details">
                    <div><strong>Archivo:</strong> ${window.utils ? window.utils.escapeHTML(item.archivo_origen) : item.archivo_origen}</div>
                    <div><strong>Importación:</strong> ${fechaImportacion}</div>
                    ${madre ? `
                        <div><strong>Ficha:</strong> ${window.utils ? window.utils.escapeHTML(madre.numero_ficha) : madre.numero_ficha}</div>
                        <div><strong>Sala:</strong> ${window.utils ? window.utils.escapeHTML(madre.sala) : madre.sala}</div>
                        <div><strong>Cama:</strong> ${window.utils ? window.utils.escapeHTML(madre.cama) : madre.cama}</div>
                    ` : ''}
                </div>
                <div class="importado-item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="verDetalles('${item.id}')">
                        Ver Detalles
                    </button>
                    ${item.madre_id && !tieneEOA ? `
                        <button class="btn btn-primary btn-sm" onclick="realizarEOA('${item.madre_id}')">
                            Realizar EOA
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Función para mostrar estado de carga
function mostrarCarga() {
    const container = document.getElementById('importadosList');
    if (container) {
        container.innerHTML = '<p class="loading">Cargando datos...</p>';
    }
}

// Función para mostrar error
function mostrarError(mensaje) {
    const container = document.getElementById('importadosList');
    if (container) {
        container.innerHTML = `
            <p class="no-data">${mensaje}</p>
            <button class="btn btn-secondary btn-sm" onclick="window.importados.cargarDatos()">Reintentar</button>
        `;
    }
}

// Función para aplicar filtros
function aplicarFiltros() {
    const filtroEstado = document.getElementById('filtroEstado').value;
    const filtroMes = document.getElementById('filtroMes').value;
    
    // Filtrar datos
    datosFiltrados = datosImportados.filter(item => {
        // Filtro por estado
        if (filtroEstado !== 'todos') {
            switch (filtroEstado) {
                case 'con_registro':
                    if (!item.madre_id) return false;
                    break;
                case 'sin_registro':
                    if (item.madre_id) return false;
                    break;
                case 'con_eoa':
                    if (!item.madre_id || !datosEOA.has(item.madre_id)) return false;
                    break;
                case 'sin_eoa':
                    if (item.madre_id && datosEOA.has(item.madre_id)) return false;
                    break;
            }
        }
        
        // Filtro por mes
        if (filtroMes) {
            const fechaParto = new Date(item.fecha_parto);
            const mesAnio = `${fechaParto.getFullYear()}-${String(fechaParto.getMonth() + 1).padStart(2, '0')}`;
            if (mesAnio !== filtroMes) return false;
        }
        
        return true;
    });
    
    // Actualizar vista
    actualizarEstadisticas();
    mostrarDatos();
}

// Función para limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroEstado').value = 'todos';
    document.getElementById('filtroMes').value = '';
    
    datosFiltrados = [...datosImportados];
    actualizarEstadisticas();
    mostrarDatos();
}

// Función para ver detalles de un registro
function verDetalles(id) {
    const item = datosImportados.find(d => d.id === id);
    if (!item) return;
    
    const rutNormalizado = item.rut.replace('-', '').toUpperCase();
    const madre = datosMadres.get(rutNormalizado);
    const tieneEOA = item.madre_id && datosEOA.has(item.madre_id);
    const examenesEOA = tieneEOA ? datosEOA.get(item.madre_id) : [];
    
    const contenido = `
        <div class="detalle-grid">
            <div class="detalle-section">
                <h4>Datos del Parto Importado</h4>
                <div class="detalle-item">
                    <strong>RUT:</strong> ${window.utils ? window.utils.escapeHTML(window.utils.formatearRUT(item.rut)) : item.rut}
                </div>
                <div class="detalle-item">
                    <strong>Nombre completo:</strong> ${window.utils ? window.utils.escapeHTML(`${item.nombre} ${item.apellido}`) : `${item.nombre} ${item.apellido}`}
                </div>
                <div class="detalle-item">
                    <strong>Fecha de parto:</strong> ${window.utils ? window.utils.formatearFecha(item.fecha_parto) : new Date(item.fecha_parto).toLocaleDateString()}
                </div>
                <div class="detalle-item">
                    <strong>Archivo origen:</strong> ${window.utils ? window.utils.escapeHTML(item.archivo_origen) : item.archivo_origen}
                </div>
                <div class="detalle-item">
                    <strong>Fecha importación:</strong> ${window.utils ? window.utils.formatearFecha(item.fecha_importacion) : new Date(item.fecha_importacion).toLocaleDateString()}
                </div>
            </div>
            
            ${madre ? `
                <div class="detalle-section">
                    <h4>Registro Manual</h4>
                    <div class="detalle-item">
                        <strong>Ficha:</strong> ${window.utils ? window.utils.escapeHTML(madre.numero_ficha) : madre.numero_ficha}
                    </div>
                    <div class="detalle-item">
                        <strong>Sala:</strong> ${window.utils ? window.utils.escapeHTML(madre.sala) : madre.sala}
                    </div>
                    <div class="detalle-item">
                        <strong>Cama:</strong> ${window.utils ? window.utils.escapeHTML(madre.cama) : madre.cama}
                    </div>
                    <div class="detalle-item">
                        <strong>Hijos:</strong> ${madre.cantidad_hijos || 'N/A'}
                    </div>
                </div>
            ` : `
                <div class="detalle-section">
                    <h4>Registro Manual</h4>
                    <p class="no-data">No se encontró registro manual para esta madre</p>
                </div>
            `}
            
            <div class="detalle-section">
                <h4>Estado EOA</h4>
                ${tieneEOA ? `
                    <div class="eoa-summary">
                        <div class="eoa-count">${examenesEOA.length} examen(es) realizado(s)</div>
                        ${examenesEOA.map(eoa => `
                            <div class="eoa-item">
                                <div><strong>Fecha:</strong> ${window.utils ? window.utils.formatearFecha(eoa.fecha_examen) : new Date(eoa.fecha_examen).toLocaleDateString()}</div>
                                <div><strong>OD:</strong> ${eoa.od_resultado}</div>
                                <div><strong>OI:</strong> ${eoa.oi_resultado}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p class="no-data">No se han realizado exámenes EOA</p>
                `}
            </div>
        </div>
    `;
    
    document.getElementById('detalleContent').innerHTML = contenido;
    
    // Mostrar modal
    const modal = document.getElementById('detalleModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

// Función para realizar EOA
function realizarEOA(madreId) {
    // Redirigir al dashboard con el ID de la madre seleccionada
    window.location.href = `dashboard.html?madre=${madreId}&action=eoa`;
}

// Función para exportar a Excel
async function exportarExcel() {
    try {
        if (!window.XLSX) {
            // Cargar SheetJS dinámicamente
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => {
                realizarExportacion();
            };
            document.head.appendChild(script);
        } else {
            realizarExportacion();
        }
    } catch (error) {
        console.error('Error al exportar:', error);
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Error al exportar datos', 'error');
        }
    }
}

function realizarExportacion() {
    try {
        // Preparar datos para exportación
        const datosExport = datosFiltrados.map(item => {
            const rutNormalizado = item.rut.replace('-', '').toUpperCase();
            const madre = datosMadres.get(rutNormalizado);
            const tieneEOA = item.madre_id && datosEOA.has(item.madre_id);
            
            return {
                'RUT': window.utils ? window.utils.formatearRUT(item.rut) : item.rut,
                'Nombre': item.nombre,
                'Apellido': item.apellido,
                'Fecha Parto': item.fecha_parto,
                'Archivo Origen': item.archivo_origen,
                'Fecha Importación': item.fecha_importacion,
                'Con Registro Manual': item.madre_id ? 'Sí' : 'No',
                'Ficha': madre ? madre.numero_ficha : '',
                'Sala': madre ? madre.sala : '',
                'Cama': madre ? madre.cama : '',
                'EOA Realizado': tieneEOA ? 'Sí' : 'No'
            };
        });
        
        // Crear workbook
        const ws = window.XLSX.utils.json_to_sheet(datosExport);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Datos Importados');
        
        // Generar nombre de archivo
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `datos_importados_${fecha}.xlsx`;
        
        // Descargar archivo
        window.XLSX.writeFile(wb, nombreArchivo);
        
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Archivo exportado correctamente', 'success');
        }
        
    } catch (error) {
        console.error('Error en realización de exportación:', error);
        if (window.utils && window.utils.showNotification) {
            window.utils.showNotification('Error al exportar archivo', 'error');
        }
    }
}

// Exportar funciones para uso global
window.importados = {
    cargarDatos,
    aplicarFiltros,
    limpiarFiltros,
    exportarExcel
};