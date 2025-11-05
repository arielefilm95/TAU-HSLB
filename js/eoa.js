// Funcionalidad específica para la gestión de exámenes EOA

// Variables globales
let currentMadreEOA = null;
let currentExamenEOA = null;

// Función para abrir modal de EOA
function openEoaModal(madre) {
    currentMadreEOA = madre;
    
    const modal = document.getElementById('eoaModal');
    if (modal) {
        // Actualizar información de la madre en el modal
        const madreInfo = document.getElementById('madreInfo');
        if (madreInfo) {
            madreInfo.innerHTML = `
                <strong>RUT:</strong> ${utils.escapeHTML(utils.formatearRUT(madre.rut))} | 
                <strong>Ficha:</strong> ${utils.escapeHTML(madre.numero_ficha)} | 
                <strong>Sala:</strong> ${utils.escapeHTML(madre.sala)} | 
                <strong>Cama:</strong> ${utils.escapeHTML(madre.cama)}
            `;
        }
        
        // Limpiar formulario
        limpiarFormularioEOA();
        
        // Mostrar modal
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Cargar exámenes anteriores si existen
        cargarExamenesAnteriores(madre.id);
    }
}

// Función para cerrar modal de EOA
function closeEoaModal() {
    const modal = document.getElementById('eoaModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    currentMadreEOA = null;
    currentExamenEOA = null;
}

// Función para cargar exámenes anteriores de una madre
async function cargarExamenesAnteriores(madreId) {
    try {
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .select('*')
            .eq('madre_id', madreId)
            .order('fecha_examen', { ascending: false })
            .limit(5);
        
        if (error) {
            throw error;
        }
        
        // Mostrar exámenes anteriores si existen
        if (data && data.length > 0) {
            mostrarExamenesAnteriores(data);
        }
        
    } catch (error) {
        console.error('Error al cargar exámenes anteriores:', error);
    }
}

// Función para mostrar exámenes anteriores
function mostrarExamenesAnteriores(examenes) {
    // Crear sección de exámenes anteriores si no existe
    let examenesSection = document.getElementById('examenesAnteriores');
    if (!examenesSection) {
        const modalBody = document.querySelector('#eoaModal .modal-body');
        const madreInfo = document.getElementById('madreInfo');
        
        examenesSection = document.createElement('div');
        examenesSection.id = 'examenesAnteriores';
        examenesSection.className = 'examenes-anteriores';
        examenesSection.innerHTML = `
            <h4>Exámenes Anteriores</h4>
            <div id="examenesList" class="examenes-list"></div>
        `;
        
        madreInfo.parentNode.insertBefore(examenesSection, madreInfo.nextSibling);
    }
    
    const examenesList = document.getElementById('examenesList');
    if (examenesList) {
        const html = examenes.map(examen => `
            <div class="examen-anterior">
                <div class="examen-fecha">
                    ${utils.formatearFechaHora(examen.fecha_examen)}
                </div>
                <div class="examen-resultados">
                    <span class="resultado ${examen.od_resultado.toLowerCase()}">OD: ${examen.od_resultado}</span>
                    <span class="resultado ${examen.oi_resultado.toLowerCase()}">OI: ${examen.oi_resultado}</span>
                </div>
                ${examen.observaciones ? `<div class="examen-observaciones">${utils.escapeHTML(examen.observaciones)}</div>` : ''}
            </div>
        `).join('');
        
        examenesList.innerHTML = html;
    }
}

// Función para registrar un examen EOA
async function registrarExamenEOA(examenData) {
    try {
        // Validar datos
        if (!examenData.madre_id || !examenData.od_resultado || !examenData.oi_resultado) {
            throw new Error('Todos los campos obligatorios deben ser completados');
        }
        
        // Validar valores permitidos
        if (!['PASA', 'REFIERE'].includes(examenData.od_resultado)) {
            throw new Error('Resultado de OD inválido');
        }
        
        if (!['PASA', 'REFIERE'].includes(examenData.oi_resultado)) {
            throw new Error('Resultado de OI inválido');
        }
        
        // Obtener usuario actual
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            throw new Error('Usuario no autenticado');
        }
        
        // Preparar datos para inserción
        const dataToInsert = {
            madre_id: examenData.madre_id,
            od_resultado: examenData.od_resultado,
            oi_resultado: examenData.oi_resultado,
            observaciones: examenData.observaciones ? examenData.observaciones.trim() : null,
            usuario_id: currentUser.id,
            fecha_examen: new Date().toISOString()
        };
        
        // Insertar en Supabase
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .insert([dataToInsert])
            .select();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data[0] };
        
    } catch (error) {
        console.error('Error al registrar examen EOA:', error);
        return { 
            success: false, 
            error: error.message || 'Error al registrar examen' 
        };
    }
}

// Función para obtener exámenes de una madre
async function obtenerExamenesMadre(madreId, limit = 10) {
    try {
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .select('*')
            .eq('madre_id', madreId)
            .order('fecha_examen', { ascending: false })
            .limit(limit);
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data || [] };
        
    } catch (error) {
        console.error('Error al obtener exámenes:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener exámenes' 
        };
    }
}

// Función para obtener todos los exámenes
async function obtenerTodosExamenes(limit = 50) {
    try {
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .select(`
                *,
                madres (
                    rut,
                    numero_ficha,
                    sala,
                    cama
                )
            `)
            .order('fecha_examen', { ascending: false })
            .limit(limit);
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data || [] };
        
    } catch (error) {
        console.error('Error al obtener todos los exámenes:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener exámenes' 
        };
    }
}

// Función para actualizar un examen EOA
async function actualizarExamenEOA(examenId, updates) {
    try {
        // Validar que al menos hay un campo para actualizar
        if (Object.keys(updates).length === 0) {
            throw new Error('No hay datos para actualizar');
        }
        
        // Validar valores si se actualizan resultados
        if (updates.od_resultado && !['PASA', 'REFIERE'].includes(updates.od_resultado)) {
            throw new Error('Resultado de OD inválido');
        }
        
        if (updates.oi_resultado && !['PASA', 'REFIERE'].includes(updates.oi_resultado)) {
            throw new Error('Resultado de OI inválido');
        }
        
        // Preparar datos para actualización
        const dataToUpdate = {};
        
        if (updates.od_resultado) {
            dataToUpdate.od_resultado = updates.od_resultado;
        }
        if (updates.oi_resultado) {
            dataToUpdate.oi_resultado = updates.oi_resultado;
        }
        if (updates.observaciones !== undefined) {
            dataToUpdate.observaciones = updates.observaciones.trim() || null;
        }
        
        // Actualizar en Supabase
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .update(dataToUpdate)
            .eq('id', examenId)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al actualizar examen:', error);
        return { 
            success: false, 
            error: error.message || 'Error al actualizar examen' 
        };
    }
}

// Función para eliminar un examen EOA
async function eliminarExamenEOA(examenId) {
    try {
        const { error } = await auth.supabase
            .from('examenes_eoa')
            .delete()
            .eq('id', examenId);
        
        if (error) {
            throw error;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error al eliminar examen:', error);
        return { 
            success: false, 
            error: error.message || 'Error al eliminar examen' 
        };
    }
}

// Función para obtener estadísticas de exámenes EOA
async function obtenerEstadisticasEOA() {
    try {
        const { data, error } = await auth.supabase
            .from('examenes_eoa')
            .select('od_resultado, oi_resultado, fecha_examen');
        
        if (error) {
            throw error;
        }
        
        const total = data.length;
        const pasanOD = data.filter(e => e.od_resultado === 'PASA').length;
        const pasanOI = data.filter(e => e.oi_resultado === 'PASA').length;
        const refierenOD = data.filter(e => e.od_resultado === 'REFIERE').length;
        const refierenOI = data.filter(e => e.oi_resultado === 'REFIERE').length;
        
        const hoy = new Date();
        const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        const ultimos7Dias = data.filter(e => 
            new Date(e.fecha_examen) >= hace7Dias
        ).length;
        
        return {
            success: true,
            data: {
                total,
                pasanOD,
                pasanOI,
                refierenOD,
                refierenOI,
                ultimos7Dias,
                porcentajePasaOD: total > 0 ? ((pasanOD / total) * 100).toFixed(1) : 0,
                porcentajePasaOI: total > 0 ? ((pasanOI / total) * 100).toFixed(1) : 0
            }
        };
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener estadísticas' 
        };
    }
}

// Función para exportar exámenes a CSV
async function exportarExamenesCSV() {
    try {
        const result = await obtenerTodosExamenes();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const examenes = result.data;
        
        // Crear CSV
        const headers = [
            'RUT Madre', 'Número de Ficha', 'Sala', 'Cama', 
            'Resultado OD', 'Resultado OI', 'Observaciones', 'Fecha Examen'
        ];
        const csvContent = [
            headers.join(','),
            ...examenes.map(examen => [
                utils.formatearRUT(examen.madres.rut),
                examen.madres.numero_ficha,
                examen.madres.sala,
                examen.madres.cama,
                examen.od_resultado,
                examen.oi_resultado,
                examen.observaciones ? `"${examen.observaciones.replace(/"/g, '""')}"` : '',
                utils.formatearFechaHora(examen.fecha_examen)
            ].join(','))
        ].join('\n');
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `examenes_eoa_${utils.formatearFecha(new Date())}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.showNotification('Datos exportados exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar datos:', error);
        utils.showNotification('Error al exportar datos', 'error');
    }
}

// Función para validar formulario EOA
function validarFormularioEOA() {
    const odResultado = document.querySelector('input[name="od"]:checked');
    const oiResultado = document.querySelector('input[name="oi"]:checked');
    
    let isValid = true;
    
    // Validar OD
    if (!odResultado) {
        utils.showNotification('Debe seleccionar un resultado para el Oído Derecho', 'error');
        isValid = false;
    }
    
    // Validar OI
    if (!oiResultado) {
        utils.showNotification('Debe seleccionar un resultado para el Oído Izquierdo', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Función para limpiar formulario EOA
function limpiarFormularioEOA() {
    // Limpiar radio buttons
    const radioButtons = document.querySelectorAll('#eoaForm input[type="radio"]');
    radioButtons.forEach(radio => radio.checked = false);
    
    // Limpiar textarea
    const observaciones = document.getElementById('observaciones');
    if (observaciones) {
        observaciones.value = '';
    }
    
    // Eliminar sección de exámenes anteriores si existe
    const examenesSection = document.getElementById('examenesAnteriores');
    if (examenesSection) {
        examenesSection.remove();
    }
}

// Event listeners específicos para EOA
document.addEventListener('DOMContentLoaded', function() {
    // Formulario de EOA
    const eoaForm = document.getElementById('eoaForm');
    if (eoaForm) {
        eoaForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validar formulario
            if (!validarFormularioEOA()) {
                return;
            }
            
            if (!currentMadreEOA) {
                utils.showNotification('Error: no se ha seleccionado una madre', 'error');
                return;
            }
            
            // Obtener datos del formulario
            const odResultado = document.querySelector('input[name="od"]:checked').value;
            const oiResultado = document.querySelector('input[name="oi"]:checked').value;
            const observaciones = document.getElementById('observaciones').value.trim();
            
            // Mostrar loader
            utils.toggleButtonLoader('guardarEoaBtn', true);
            
            try {
                const result = await registrarExamenEOA({
                    madre_id: currentMadreEOA.id,
                    od_resultado: odResultado,
                    oi_resultado: oiResultado,
                    observaciones: observaciones
                });
                
                if (result.success) {
                    utils.showNotification('Examen registrado exitosamente', 'success');
                    closeEoaModal();
                    
                    // Recargar registros recientes si estamos en el dashboard
                    if (typeof dashboard !== 'undefined' && dashboard.loadRecentMothers) {
                        await dashboard.loadRecentMothers();
                    }
                } else {
                    utils.showNotification(result.error, 'error');
                }
            } catch (error) {
                utils.showNotification('Error al registrar examen', 'error');
            } finally {
                utils.toggleButtonLoader('guardarEoaBtn', false);
            }
        });
    }
    
    // Efectos visuales en radio buttons
    const radioLabels = document.querySelectorAll('.radio-label');
    radioLabels.forEach(label => {
        label.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                // Remover selección previa en el mismo grupo
                const name = radio.name;
                document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                    r.closest('.radio-label').classList.remove('selected');
                });
                
                // Agregar selección actual
                this.classList.add('selected');
            }
        });
    });
});

// Exportar funciones para uso en otros módulos
window.eoa = {
    openEoaModal,
    closeEoaModal,
    registrarExamenEOA,
    obtenerExamenesMadre,
    obtenerTodosExamenes,
    actualizarExamenEOA,
    eliminarExamenEOA,
    obtenerEstadisticasEOA,
    exportarExamenesCSV,
    validarFormularioEOA,
    limpiarFormularioEOA,
    getCurrentMadre: () => currentMadreEOA,
    getCurrentExamen: () => currentExamenEOA
};