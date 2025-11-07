// Funcionalidad para la página de datos importados

// Variables globales
let datosImportados = [];
let datosFiltrados = [];
let datosMadres = new Map();
let datosEOA = new Map();
let registroEoaSeleccionado = null;

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
        container.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No hay datos para mostrar</td>
            </tr>
        `;
        return;
    }

    const rowsHtml = datosFiltrados.map(item => {
        const rutNormalizado = item.rut.replace('-', '').toUpperCase();
        const madre = datosMadres.get(rutNormalizado);
        const examenes = item.madre_id && datosEOA.has(item.madre_id)
            ? datosEOA.get(item.madre_id).sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen))
            : [];

        const primerExamen = examenes[0];
        const segundoExamen = examenes[1];

        const renderExamen = (examen, label, registroId) => {
            if (!examen) {
                return `
                    <div class="estado-eoa">
                        <button class="btn btn-secondary btn-sm" onclick="abrirRegistrarEoaModal('${registroId}', '${label}')">
                            ${label} pendiente
                        </button>
                    </div>
                `;
            }

            const clase = examen.od_resultado === 'PASA' && examen.oi_resultado === 'PASA'
                ? 'success'
                : 'danger';
            const textoEstado = `OD: ${examen.od_resultado || '-'}, OI: ${examen.oi_resultado || '-'}`;
            const fecha = window.utils ? window.utils.formatearFecha(examen.fecha_examen) : new Date(examen.fecha_examen).toLocaleDateString();

            return `
                <div class="estado-eoa">
                    <div>
                        <span class="status-pill ${clase}">${label}</span>
                        <span>${textoEstado}</span>
                        <span>${fecha}</span>
                    </div>
                    <div class="exam-actions">
                        <button class="btn-icon btn-edit" onclick="abrirEditarEoaModal('${examen.id}', '${registroId}', '${label}')" title="Editar examen">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="eliminarExamenEoa('${examen.id}')" title="Eliminar examen">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        };

        const observaciones = [
            examenObservacion(primerExamen, '1er'),
            examenObservacion(segundoExamen, '2do')
        ].filter(Boolean).join(' | ');

        const nombreCompleto = `${item.nombre} ${item.apellido}`.trim();

        return `
            <tr>
                <td>
                    ${window.utils ? window.utils.escapeHTML(nombreCompleto) : nombreCompleto}
                </td>
                <td>${madre ? window.utils.escapeHTML(madre.numero_ficha || '') : ''}</td>
                <td>${window.utils ? window.utils.escapeHTML(window.utils.formatearRUT(item.rut)) : item.rut}</td>
                <td>${window.utils ? window.utils.formatearFecha(item.fecha_parto) : new Date(item.fecha_parto).toLocaleDateString()}</td>
                <td>${renderExamen(primerExamen, '1er examen', item.id)}</td>
                <td>${renderExamen(segundoExamen, '2do examen', item.id)}</td>
                <td class="observaciones">${window.utils ? window.utils.escapeHTML(observaciones) : observaciones}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = rowsHtml;
}

function examenObservacion(examen, etiqueta) {
    if (!examen || !examen.observaciones) {
        return '';
    }
    return `${etiqueta}: ${examen.observaciones}`;
}

window.abrirRegistrarEoaModal = function(importadoId, etiquetaExamen = null) {
    const item = datosImportados.find(d => d.id === importadoId);
    if (!item) {
        return;
    }

    registroEoaSeleccionado = item;
    registroEoaSeleccionado.etiqueta = etiquetaExamen;
    registroEoaSeleccionado.modoEdicion = false;

    const modal = document.getElementById('registrarEoaModal');
    if (modal) {
        // Cambiar título del modal
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = `Registrar ${etiquetaExamen || 'Examen'} EOA`;
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    const fechaInput = document.getElementById('eoaFecha');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    document.querySelectorAll('#registrarEoaForm input[name="eoaOd"]').forEach(input => input.checked = false);
    document.querySelectorAll('#registrarEoaForm input[name="eoaOi"]').forEach(input => input.checked = false);
    document.getElementById('eoaObservaciones').value = '';
    
    // Resetear botón de guardar
    const guardarBtn = document.getElementById('guardarEoaImportadosBtn');
    if (guardarBtn) {
        guardarBtn.innerHTML = '<span class="btn-text">Guardar Examen</span><span class="btn-loader" style="display: none;">Guardando...</span>';
    }
}

window.abrirEditarEoaModal = function(examenId, importadoId, etiquetaExamen = null) {
    const item = datosImportados.find(d => d.id === importadoId);
    if (!item) {
        return;
    }

    // Buscar el examen específico
    let examenEditar = null;
    if (item.madre_id && datosEOA.has(item.madre_id)) {
        examenEditar = datosEOA.get(item.madre_id).find(e => e.id === examenId);
    }

    if (!examenEditar) {
        window.utils?.showNotification('No se encontró el examen a editar', 'error');
        return;
    }

    registroEoaSeleccionado = item;
    registroEoaSeleccionado.etiqueta = etiquetaExamen;
    registroEoaSeleccionado.modoEdicion = true;
    registroEoaSeleccionado.examenId = examenId;

    const modal = document.getElementById('registrarEoaModal');
    if (modal) {
        // Cambiar título del modal
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = `Editar ${etiquetaExamen || 'Examen'} EOA`;
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Cargar datos del examen
    const fechaInput = document.getElementById('eoaFecha');
    if (fechaInput) {
        fechaInput.value = examenEditar.fecha_examen;
    }

    // Seleccionar resultados del examen
    document.querySelectorAll('#registrarEoaForm input[name="eoaOd"]').forEach(input => {
        input.checked = input.value === examenEditar.od_resultado;
    });
    document.querySelectorAll('#registrarEoaForm input[name="eoaOi"]').forEach(input => {
        input.checked = input.value === examenEditar.oi_resultado;
    });
    
    document.getElementById('eoaObservaciones').value = examenEditar.observaciones || '';
    
    // Cambiar texto del botón
    const guardarBtn = document.getElementById('guardarEoaImportadosBtn');
    if (guardarBtn) {
        guardarBtn.innerHTML = '<span class="btn-text">Actualizar Examen</span><span class="btn-loader" style="display: none;">Actualizando...</span>';
    }
}

window.eliminarExamenEoa = async function(examenId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este examen? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('examenes_eoa')
            .delete()
            .eq('id', examenId);

        if (error) {
            throw error;
        }

        // Eliminar del mapa de datos
        datosEOA.forEach((examenes, madreId) => {
            const index = examenes.findIndex(e => e.id === examenId);
            if (index !== -1) {
                examenes.splice(index, 1);
                if (examenes.length === 0) {
                    datosEOA.delete(madreId);
                }
            }
        });

        window.utils?.showNotification('Examen eliminado exitosamente', 'success');
        mostrarDatos();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error eliminando examen:', error);
        window.utils?.showNotification(error.message || 'Error al eliminar examen', 'error');
    }
}

function closeRegistrarEoaModal() {
    const modal = document.getElementById('registrarEoaModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    registroEoaSeleccionado = null;
}

async function guardarExamenDesdeImportados(event) {
    event.preventDefault();

    if (!registroEoaSeleccionado) {
        window.utils?.showNotification('No se encontró el registro seleccionado', 'error');
        return;
    }

    const fecha = document.getElementById('eoaFecha').value;
    const od = document.querySelector('input[name="eoaOd"]:checked');
    const oi = document.querySelector('input[name="eoaOi"]:checked');
    const observaciones = document.getElementById('eoaObservaciones').value.trim();

    if (!fecha || !od || !oi) {
        window.utils?.showNotification('Completa todos los campos del examen', 'error');
        return;
    }

    try {
        window.utils?.toggleButtonLoader('guardarEoaImportadosBtn', true);

        const madreId = await asegurarMadreParaImportado(registroEoaSeleccionado);
        if (!madreId) {
            throw new Error('No fue posible asociar una madre al registro');
        }

        const payload = {
            madre_id: madreId,
            od_resultado: od.value,
            oi_resultado: oi.value,
            fecha_examen: fecha,
            observaciones: observaciones || null
        };

        let data, error;
        const esModoEdicion = registroEoaSeleccionado.modoEdicion === true;
        
        if (esModoEdicion) {
            // Modo edición: actualizar examen existente
            const result = await window.supabaseClient
                .from('examenes_eoa')
                .update(payload)
                .eq('id', registroEoaSeleccionado.examenId)
                .select()
                .single();
            
            data = result.data;
            error = result.error;
            
            if (!error) {
                // Actualizar en el mapa de datos
                if (datosEOA.has(madreId)) {
                    const index = datosEOA.get(madreId).findIndex(e => e.id === registroEoaSeleccionado.examenId);
                    if (index !== -1) {
                        datosEOA.get(madreId)[index] = data;
                    }
                }
            }
        } else {
            // Modo creación: insertar nuevo examen
            const result = await window.supabaseClient
                .from('examenes_eoa')
                .insert([payload])
                .select()
                .single();
            
            data = result.data;
            error = result.error;
            
            if (!error) {
                if (!datosEOA.has(registroEoaSeleccionado.madre_id)) {
                    datosEOA.set(registroEoaSeleccionado.madre_id, []);
                }
                datosEOA.get(registroEoaSeleccionado.madre_id).push(data);
            }
        }

        if (error) {
            throw error;
        }

        closeRegistrarEoaModal();
        const mensaje = esModoEdicion
            ? 'Examen actualizado exitosamente'
            : 'Examen registrado exitosamente';
        window.utils?.showNotification(mensaje, 'success');
        mostrarDatos();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error guardando examen vía importados:', error);
        window.utils?.showNotification(error.message || 'Error al guardar examen', 'error');
    } finally {
        window.utils?.toggleButtonLoader('guardarEoaImportadosBtn', false);
    }
}

function normalizarRutValor(rut) {
    return (rut || '').toString().replace(/\./g, '').replace(/-/g, '').toUpperCase();
}

function formatearRutCompleto(rut) {
    const limpio = normalizarRutValor(rut);
    if (limpio.length < 2) {
        return rut || '';
    }
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    return `${cuerpo}-${dv}`;
}

async function asegurarMadreParaImportado(registro) {
    if (!registro) {
        return null;
    }

    const rutNormalizado = normalizarRutValor(registro.rut);
    const madreExistente = datosMadres.get(rutNormalizado);

    if (madreExistente) {
        if (!registro.madre_id) {
            await window.supabaseClient
                .from('partos_importados')
                .update({ madre_id: madreExistente.id })
                .eq('id', registro.id);
            registro.madre_id = madreExistente.id;
        }
        return madreExistente.id;
    }

    // Solo crear nueva madre si no existe y si no tiene madre_id asociado
    // Esto evita crear madres duplicadas innecesariamente
    if (registro.madre_id) {
        // Si ya tiene madre_id, verificar que exista en la base de datos
        const { data: madreVerificada } = await window.supabaseClient
            .from('madres')
            .select('id')
            .eq('id', registro.madre_id)
            .single();
        
        if (madreVerificada) {
            return registro.madre_id;
        }
    }

    // Crear nueva madre solo si es absolutamente necesario
    const nuevaMadre = {
        nombre: registro.nombre || 'SIN',
        apellido: registro.apellido || 'REGISTRO',
        rut: formatearRutCompleto(registro.rut),
        numero_ficha: (`IMPORT-${rutNormalizado}`).substring(0, 20),
        sala: 'PEND',
        cama: 'PEND',
        cantidad_hijos: 1,
        origen_registro: 'IMPORTADO' // Marcar como importado
    };

    const { data, error } = await window.supabaseClient
        .from('madres')
        .insert([nuevaMadre])
        .select()
        .single();

    if (error) {
        console.error('Error creando madre desde importado:', error);
        throw error;
    }

    datosMadres.set(rutNormalizado, data);

    await window.supabaseClient
        .from('partos_importados')
        .update({ madre_id: data.id })
        .eq('id', registro.id);

    registro.madre_id = data.id;
    return data.id;
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
    exportarExcel,
    abrirRegistrarEoaModal,
    abrirEditarEoaModal,
    eliminarExamenEoa
};

window.verDetalles = verDetalles;
window.realizarEOA = realizarEOA;
window.closeRegistrarEoaModal = closeRegistrarEoaModal;

const registrarEoaForm = document.getElementById('registrarEoaForm');
if (registrarEoaForm) {
    registrarEoaForm.addEventListener('submit', guardarExamenDesdeImportados);
}
