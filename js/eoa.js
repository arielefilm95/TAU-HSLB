// Funcionalidad específica para la gestión de exámenes EOA

// Variables globales
let currentPacienteEOA = null;
let currentExamenEOA = null;
let currentPacienteExamenes = [];
let currentPacienteExamenCount = 0;
let eoaFormPristine = true;
const EOA_FORM_STORAGE_PREFIX = 'tau_eoa_form_state_';

function getEoaFormStorageKey(pacienteId) {
    return `${EOA_FORM_STORAGE_PREFIX}${pacienteId}`;
}

function guardarEstadoFormularioEOA(pacienteId, examen) {
    if (!pacienteId || !examen) {
        return;
    }

    try {
        const payload = {
            savedAt: new Date().toISOString(),
            data: examen
        };
        localStorage.setItem(getEoaFormStorageKey(pacienteId), JSON.stringify(payload));
    } catch (error) {
        console.warn('No se pudo guardar el estado del formulario EOA:', error);
    }
}

function obtenerEstadoFormularioEOA(pacienteId) {
    if (!pacienteId) {
        return null;
    }

    try {
        const raw = localStorage.getItem(getEoaFormStorageKey(pacienteId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return parsed.data || null;
    } catch (error) {
        console.warn('No se pudo leer el estado del formulario EOA:', error);
        return null;
    }
}

function restaurarFormularioEOADesdeLocal(pacienteId) {
    const data = obtenerEstadoFormularioEOA(pacienteId);
    if (data) {
        prefillFormularioEOA(data);
        currentExamenEOA = data;
    }
}

// Función para abrir modal de EOA
function openEoaModal(paciente) {
    currentPacienteEOA = paciente;
    currentPacienteExamenes = [];
    currentPacienteExamenCount = 0;
    eoaFormPristine = true;
    
    const modal = document.getElementById('eoaModal');
    if (modal) {
        // Actualizar información del paciente en el modal
        const pacienteInfo = document.getElementById('madreInfo');
        if (pacienteInfo) {
            const tipoPaciente = paciente.tipo_paciente || 'MADRE';
            const etiquetaTipo = tipoPaciente === 'MADRE' ? 'Madre' : (tipoPaciente === 'BEBE' ? 'Bebé' : 'Neo');
            
            pacienteInfo.innerHTML = `
                <strong>${etiquetaTipo}:</strong> ${utils.escapeHTML([paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado')} |
                <strong>RUT:</strong> ${utils.escapeHTML(utils.formatearRUT(paciente.rut))} |
                <strong>Ficha:</strong> ${utils.escapeHTML(paciente.numero_ficha)} |
                <strong>Sala:</strong> ${utils.escapeHTML(paciente.sala)} |
                <strong>Cama:</strong> ${utils.escapeHTML(paciente.cama)}
                ${paciente.tipo_paciente === 'MADRE' && paciente.cantidad_hijos ? ` | <strong>Hijos:</strong> ${paciente.cantidad_hijos}` : ''}
            `;
        }
        
        // Limpiar formulario
        limpiarFormularioEOA();

        // Intentar restaurar el último examen guardado localmente
        restaurarFormularioEOADesdeLocal(paciente.id);
        
        // Mostrar modal
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Cargar exámenes anteriores si existen
        cargarExamenesAnteriores(paciente.id);
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
    
    currentPacienteEOA = null;
    currentExamenEOA = null;
    currentPacienteExamenes = [];
    currentPacienteExamenCount = 0;
    eoaFormPristine = true;
}

// Función para cargar exámenes anteriores de un paciente
async function cargarExamenesAnteriores(pacienteId) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            return;
        }
        
        const { data, error, count } = await window.supabaseClient
            .from('examenes_eoa')
            .select('*', { count: 'exact' })
            .eq('paciente_id', pacienteId)
            .order('fecha_examen', { ascending: false })
            .limit(5);
        
        if (error) {
            throw error;
        }

        const examenesDesc = data || [];
        const examenesAsc = examenesDesc.slice().sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
        currentPacienteExamenes = examenesAsc;
        currentPacienteExamenCount = typeof count === 'number' ? count : examenesAsc.length;
        
        // Mostrar exámenes anteriores si existen
        if (examenesDesc.length > 0) {
            mostrarExamenesAnteriores(examenesDesc);
            
            // Mantener referencia al último examen
            currentExamenEOA = examenesDesc[0];
            prefillFormularioEOA(examenesDesc[0]);
            guardarEstadoFormularioEOA(examenesDesc[0].paciente_id, examenesDesc[0]);
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
        if (!examenData.paciente_id || !examenData.od_resultado || !examenData.oi_resultado) {
            throw new Error('Todos los campos obligatorios deben ser completados');
        }
        
        // Validar valores permitidos
        if (!['PASA', 'REFIERE'].includes(examenData.od_resultado)) {
            throw new Error('Resultado de OD inválido');
        }
        
        if (!['PASA', 'REFIERE'].includes(examenData.oi_resultado)) {
            throw new Error('Resultado de OI inválido');
        }
        
        // Validar valores permitidos para sexo
        if (!['MASCULINO', 'FEMENINO'].includes(examenData.sexo_bebe)) {
            throw new Error('Sexo del bebé inválido');
        }
        
        // Validar valores permitidos para tipo de parto
        if (!['NORMAL', 'CESAREA'].includes(examenData.tipo_parto)) {
            throw new Error('Tipo de parto inválido');
        }
        
        // Validar semanas de gestación
        if (examenData.semanas_gestacion < 20 || examenData.semanas_gestacion > 42) {
            throw new Error('Semanas de gestación fuera de rango válido (20-42)');
        }
        
        // Preparar datos para inserción
        const pacienteNombre = (examenData.paciente_nombre || '').trim() || 'SIN REGISTRO';
        const pacienteApellido = (examenData.paciente_apellido || '').trim() || 'SIN REGISTRO';

        const dataToInsert = {
            paciente_id: examenData.paciente_id,
            nombre: pacienteNombre,
            apellido: pacienteApellido,
            od_resultado: examenData.od_resultado,
            oi_resultado: examenData.oi_resultado,
            fecha_nacimiento: examenData.fecha_nacimiento,
            sexo_bebe: examenData.sexo_bebe,
            tipo_parto: examenData.tipo_parto,
            semanas_gestacion: examenData.semanas_gestacion,
            complicaciones_embarazo: examenData.complicaciones_embarazo,
            complicaciones_desarrollo: examenData.complicaciones_desarrollo,
            familiares_perdida_auditiva: examenData.familiares_perdida_auditiva,
            madre_fumo: examenData.madre_fumo,
            madre_alcohol: examenData.madre_alcohol,
            madre_drogas: examenData.madre_drogas,
            observaciones: examenData.observaciones,
            fecha_examen: new Date().toISOString()
        };
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Insertar en Supabase
        const { data, error } = await window.supabaseClient
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

// Función para obtener exámenes de un paciente
async function obtenerExamenesPaciente(pacienteId, limit = 10) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('examenes_eoa')
            .select('*')
            .eq('paciente_id', pacienteId)
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

// Función para obtener exámenes de una madre (mantener compatibilidad)
async function obtenerExamenesMadre(madreId, limit = 10) {
    return obtenerExamenesPaciente(madreId, limit);
}

// Función para obtener todos los exámenes
async function obtenerTodosExamenes(limit = 50) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('examenes_eoa')
            .select(`
                *,
                pacientes (
                    rut,
                    numero_ficha,
                    sala,
                    cama,
                    tipo_paciente
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
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Actualizar en Supabase
        const { data, error } = await window.supabaseClient
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
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { error } = await window.supabaseClient
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
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
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
            'RUT Paciente', 'Tipo Paciente', 'Número de Ficha', 'Sala', 'Cama',
            'Resultado OD', 'Resultado OI', 'Observaciones', 'Fecha Examen'
        ];
        const csvContent = [
            headers.join(','),
            ...examenes.map(examen => [
                utils.formatearRUT(examen.pacientes.rut),
                examen.pacientes.tipo_paciente || 'MADRE',
                examen.pacientes.numero_ficha,
                examen.pacientes.sala,
                examen.pacientes.cama,
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
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const sexoBebe = document.querySelector('input[name="sexoBebe"]:checked');
    const tipoParto = document.querySelector('input[name="tipoParto"]:checked');
    const semanasGestacion = document.getElementById('semanasGestacion').value;
    const familiaresPerdidaAuditiva = document.querySelector('input[name="familiaresPerdidaAuditiva"]:checked');
    const madreFumo = document.querySelector('input[name="madreFumo"]:checked');
    const madreAlcohol = document.querySelector('input[name="madreAlcohol"]:checked');
    const madreDrogas = document.querySelector('input[name="madreDrogas"]:checked');
    
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
    
    // Validar fecha de nacimiento
    if (!fechaNacimiento) {
        utils.showNotification('Debe ingresar la fecha de nacimiento del bebé', 'error');
        isValid = false;
    }
    
    // Validar sexo del bebé
    if (!sexoBebe) {
        utils.showNotification('Debe seleccionar el sexo del bebé', 'error');
        isValid = false;
    }
    
    // Validar tipo de parto
    if (!tipoParto) {
        utils.showNotification('Debe seleccionar el tipo de parto', 'error');
        isValid = false;
    }
    
    // Validar semanas de gestación
    if (!semanasGestacion || semanasGestacion < 20 || semanasGestacion > 42) {
        utils.showNotification('Debe ingresar las semanas de gestación (entre 20 y 42)', 'error');
        isValid = false;
    }
    
    // Validar factores de riesgo
    if (!familiaresPerdidaAuditiva) {
        utils.showNotification('Debe indicar si hay familiares con pérdida auditiva', 'error');
        isValid = false;
    }
    
    if (!madreFumo) {
        utils.showNotification('Debe indicar si la madre fumó durante el embarazo', 'error');
        isValid = false;
    }
    
    if (!madreAlcohol) {
        utils.showNotification('Debe indicar si la madre consumió alcohol durante el embarazo', 'error');
        isValid = false;
    }
    
    if (!madreDrogas) {
        utils.showNotification('Debe indicar si la madre usó drogas durante el embarazo', 'error');
        isValid = false;
    }
    
    return isValid;
}

function construirPayloadExamenDesdeFormulario() {
    const odResultadoInput = document.querySelector('input[name="od"]:checked');
    const oiResultadoInput = document.querySelector('input[name="oi"]:checked');
    const sexoBebeInput = document.querySelector('input[name="sexoBebe"]:checked');
    const tipoPartoInput = document.querySelector('input[name="tipoParto"]:checked');
    const familiaresInput = document.querySelector('input[name="familiaresPerdidaAuditiva"]:checked');
    const madreFumoInput = document.querySelector('input[name="madreFumo"]:checked');
    const madreAlcoholInput = document.querySelector('input[name="madreAlcohol"]:checked');
    const madreDrogasInput = document.querySelector('input[name="madreDrogas"]:checked');

    if (!odResultadoInput || !oiResultadoInput || !sexoBebeInput || !tipoPartoInput ||
        !familiaresInput || !madreFumoInput || !madreAlcoholInput || !madreDrogasInput) {
        return null;
    }

    const semanasGestacionValue = document.getElementById('semanasGestacion').value;
    const semanasGestacion = semanasGestacionValue ? parseInt(semanasGestacionValue, 10) : null;

    return {
        paciente_id: currentPacienteEOA ? currentPacienteEOA.id : null,
        paciente_nombre: currentPacienteEOA ? currentPacienteEOA.nombre : null,
        paciente_apellido: currentPacienteEOA ? currentPacienteEOA.apellido : null,
        od_resultado: odResultadoInput.value,
        oi_resultado: oiResultadoInput.value,
        fecha_nacimiento: document.getElementById('fechaNacimiento').value,
        sexo_bebe: sexoBebeInput.value,
        tipo_parto: tipoPartoInput.value,
        semanas_gestacion: semanasGestacion,
        complicaciones_embarazo: document.getElementById('complicacionesEmbarazo').value.trim() || null,
        complicaciones_desarrollo: document.getElementById('complicacionesDesarrollo').value.trim() || null,
        familiares_perdida_auditiva: familiaresInput.value === 'true',
        madre_fumo: madreFumoInput.value === 'true',
        madre_alcohol: madreAlcoholInput.value === 'true',
        madre_drogas: madreDrogasInput.value === 'true',
        observaciones: document.getElementById('observaciones').value.trim() || null
    };
}

function sonExamenesIguales(examenA, examenB) {
    if (!examenA || !examenB) {
        return false;
    }

    const camposComparar = [
        'od_resultado',
        'oi_resultado',
        'fecha_nacimiento',
        'sexo_bebe',
        'tipo_parto',
        'semanas_gestacion',
        'complicaciones_embarazo',
        'complicaciones_desarrollo',
        'familiares_perdida_auditiva',
        'madre_fumo',
        'madre_alcohol',
        'madre_drogas',
        'observaciones'
    ];

    return camposComparar.every(campo => {
        const valorA = examenA[campo];
        const valorB = examenB[campo];

        if (typeof valorA === 'boolean' || typeof valorB === 'boolean') {
            return Boolean(valorA) === Boolean(valorB);
        }

        if (campo === 'fecha_nacimiento') {
            const fechaA = valorA ? valorA.split('T')[0] : '';
            const fechaB = valorB ? valorB.split('T')[0] : '';
            return fechaA === fechaB;
        }

        if (campo === 'observaciones') {
            return (valorA || '').trim() === (valorB || '').trim();
        }

        if (campo === 'complicaciones_embarazo' || campo === 'complicaciones_desarrollo') {
            return (valorA || '').trim() === (valorB || '').trim();
        }

        return valorA === valorB;
    });
}

function prefillFormularioEOA(examenData) {
    if (!examenData) {
        return;
    }

    const setRadioValue = (name, value) => {
        if (value === undefined || value === null) {
            return;
        }

        const radios = document.querySelectorAll(`#eoaForm input[name="${name}"]`);
        if (!radios.length) {
            return;
        }

        radios.forEach(radio => {
            const label = radio.closest('.radio-label');
            if (label) {
                label.classList.remove('selected');
            }
        });

        const radioToSelect = document.querySelector(`#eoaForm input[name="${name}"][value="${value}"]`);
        if (radioToSelect) {
            radioToSelect.checked = true;
            const label = radioToSelect.closest('.radio-label');
            if (label) {
                label.classList.add('selected');
            }
        }
    };

    const setBooleanRadio = (name, value) => {
        if (value === undefined || value === null) {
            return;
        }
        setRadioValue(name, String(Boolean(value)));
    };

    setRadioValue('od', examenData.od_resultado);
    setRadioValue('oi', examenData.oi_resultado);
    setRadioValue('sexoBebe', examenData.sexo_bebe);
    setRadioValue('tipoParto', examenData.tipo_parto);
    setBooleanRadio('familiaresPerdidaAuditiva', examenData.familiares_perdida_auditiva);
    setBooleanRadio('madreFumo', examenData.madre_fumo);
    setBooleanRadio('madreAlcohol', examenData.madre_alcohol);
    setBooleanRadio('madreDrogas', examenData.madre_drogas);

    const fechaNacimientoInput = document.getElementById('fechaNacimiento');
    if (fechaNacimientoInput) {
        const fecha = examenData.fecha_nacimiento ? examenData.fecha_nacimiento.split('T')[0] : '';
        fechaNacimientoInput.value = fecha || '';
    }

    const semanasGestacionInput = document.getElementById('semanasGestacion');
    if (semanasGestacionInput) {
        semanasGestacionInput.value = examenData.semanas_gestacion ?? '';
    }

    const complicacionesEmbarazoInput = document.getElementById('complicacionesEmbarazo');
    if (complicacionesEmbarazoInput) {
        complicacionesEmbarazoInput.value = examenData.complicaciones_embarazo || '';
    }

    const complicacionesDesarrolloInput = document.getElementById('complicacionesDesarrollo');
    if (complicacionesDesarrolloInput) {
        complicacionesDesarrolloInput.value = examenData.complicaciones_desarrollo || '';
    }

    const observacionesInput = document.getElementById('observaciones');
    if (observacionesInput) {
        observacionesInput.value = examenData.observaciones || '';
    }
}

// Función para limpiar formulario EOA
function limpiarFormularioEOA() {
    // Limpiar radio buttons
    const radioButtons = document.querySelectorAll('#eoaForm input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.checked = false;
        // Remover clase selected de los labels
        const label = radio.closest('.radio-label');
        if (label) {
            label.classList.remove('selected');
        }
    });
    
    // Limpiar inputs de texto y números
    const textInputs = document.querySelectorAll('#eoaForm input[type="text"], #eoaForm input[type="date"], #eoaForm input[type="number"]');
    textInputs.forEach(input => input.value = '');
    
    // Limpiar textareas
    const textareas = document.querySelectorAll('#eoaForm textarea');
    textareas.forEach(textarea => textarea.value = '');
    
    // Eliminar sección de exámenes anteriores si existe
    const examenesSection = document.getElementById('examenesAnteriores');
    if (examenesSection) {
        examenesSection.remove();
    }

    eoaFormPristine = true;
}

function formatearFechaTexto(fecha) {
    if (!fecha) {
        return 'Sin registro';
    }
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
        return fecha;
    }
    return date.toLocaleDateString('es-CL');
}

function formatearSiNo(valor) {
    return valor ? 'S\u00ed' : 'No';
}

function formatearTipoParto(tipo) {
    if (!tipo) {
        return 'Sin registro';
    }
    if (tipo === 'NORMAL') {
        return 'Parto normal';
    }
    if (tipo === 'CESAREA') {
        return 'Ces\u00e1rea';
    }
    return tipo.charAt(0) + tipo.slice(1).toLowerCase();
}

function formatearUsoSustancias(examenData) {
    const partes = [];
    partes.push(`Drogas: ${formatearSiNo(examenData.madre_drogas)}`);
    partes.push(`Alcohol: ${formatearSiNo(examenData.madre_alcohol)}`);
    partes.push(`Cigarros: ${formatearSiNo(examenData.madre_fumo)}`);
    return partes.join(' / ');
}

function esResultadoRefiere(examenData) {
    if (!examenData) {
        return false;
    }
    return examenData.od_resultado === 'REFIERE' || examenData.oi_resultado === 'REFIERE';
}

function generarTextoEvolucion(examenData, numeroExamen) {
    if (!examenData) {
        return '';
    }

    const resultadoRefiere = esResultadoRefiere(examenData);
    const od = examenData.od_resultado || '';
    const oi = examenData.oi_resultado || '';

    if (numeroExamen <= 1) {
        const lineasPrimera = [
            'FONOAUDIOLOG\u00cdA - EOA',
            '',
            `•    Fecha de nacimiento: ${formatearFechaTexto(examenData.fecha_nacimiento)}`,
            `•    Semana de gestación: ${examenData.semanas_gestacion ?? 'Sin registro'}`,
            `•    Tipo de parto: ${formatearTipoParto(examenData.tipo_parto)}`,
            `•    Complicaciones embarazo: ${examenData.complicaciones_embarazo || 'Sin antecedentes'}`,
            `•    Uso de drogas/ Alcohol/ Cigarros: ${formatearUsoSustancias(examenData)}`,
            `•    Antecedentes m\u00f3rbidos familiares: ${examenData.familiares_perdida_auditiva ? 'Presentes' : 'Ausentes'}`,
            `•    Resultado EOA: OD: (${od})   OI: (${oi})`,
            ''
        ];
        if (resultadoRefiere) {
            lineasPrimera.push('Se solicita asistir nuevamente a la realizaci\u00f3n del examen en 2 semanas m\u00e1s. En carnet del RN queda informativo para pedir hora.');
        } else {
            lineasPrimera.push('Se da alta fonoaudiol\u00f3gica.');
        }
        return lineasPrimera.join('\n');
    }

    const lineasRepeticion = [
        'FONOAUDIOLOG\u00cdA - EOA',
        '',
        'Usuaria asiste junto a su beb\u00e9 para repetir examen de audici\u00f3n.',
        '',
        `•    Resultado EOA: OD: (${od}) OI: (${oi})`,
        ''
    ];

    if (resultadoRefiere) {
        lineasRepeticion.push('Se realiza IC a ORL de HBLT para realizaci\u00f3n de PEAT + Impedanciometr\u00eda por sospecha de Hipoacusia');
    } else {
        lineasRepeticion.push('Se educa a la usuaria para estimulaci\u00f3n temprana del lenguaje.');
        lineasRepeticion.push('Se da alta fonoaudiol\u00f3gica.');
    }

    return lineasRepeticion.join('\n');
}

function descargarTextoEvolucion(nombreArchivo, contenido) {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

function exportarEvolucionDesdeFormulario() {
    if (!currentPacienteEOA) {
        utils.showNotification('Seleccione un paciente antes de exportar la evoluci\u00f3n', 'error');
        return;
    }

    if (!validarFormularioEOA()) {
        return;
    }

    const examenPayload = construirPayloadExamenDesdeFormulario();
    if (!examenPayload) {
        utils.showNotification('Complete todos los campos antes de exportar la evoluci\u00f3n', 'error');
        return;
    }

    const esReimpresion = eoaFormPristine &&
        currentPacienteExamenCount > 0 &&
        currentExamenEOA &&
        sonExamenesIguales(examenPayload, currentExamenEOA);

    const numeroExamen = esReimpresion
        ? currentPacienteExamenCount
        : currentPacienteExamenCount + 1;

    const texto = generarTextoEvolucion(examenPayload, numeroExamen);

    if (!texto) {
        utils.showNotification('No se pudo generar el texto de la evoluci\u00f3n', 'error');
        return;
    }

    const pacienteIdentificador = currentPacienteEOA.rut || currentPacienteEOA.id || 'paciente';
    const safeName = pacienteIdentificador.toString().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `evolucion_${safeName}_${new Date().toISOString().split('T')[0]}.txt`;
    descargarTextoEvolucion(fileName, texto);
    utils.showNotification('Evoluci\u00f3n exportada en TXT', 'success');
}

// Event listeners específicos para EOA
let eoaEventHandlersInitialized = false;

function initializeEoaEventHandlers() {
    if (eoaEventHandlersInitialized) {
        return;
    }

    const eoaForm = document.getElementById('eoaForm');
    if (!eoaForm) {
        // El DOM aún no está listo para el formulario; reintentar en breve
        setTimeout(initializeEoaEventHandlers, 200);
        return;
    }

    eoaEventHandlersInitialized = true;

    // Formulario de EOA
    eoaForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        eoaFormPristine = false;

        // Validar formulario
        if (!validarFormularioEOA()) {
            return;
        }
        
        if (!currentPacienteEOA) {
            utils.showNotification('Error: no se ha seleccionado un paciente', 'error');
            return;
        }
        
        const examenPayload = construirPayloadExamenDesdeFormulario();
        if (!examenPayload) {
            utils.showNotification('Complete los campos del formulario para continuar', 'error');
            return;
        }
        
        // Mostrar loader
        utils.toggleButtonLoader('guardarEoaBtn', true);
        
        try {
            const result = await registrarExamenEOA(examenPayload);
            
                if (result.success) {
                    utils.showNotification('Examen registrado exitosamente', 'success');
                    
                    if (result.data) {
                        currentExamenEOA = result.data;
                        currentPacienteExamenes.push(result.data);
                        currentPacienteExamenes.sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
                        currentPacienteExamenCount += 1;
                        guardarEstadoFormularioEOA(result.data.paciente_id || (currentPacienteEOA && currentPacienteEOA.id), result.data);
                    }

                    if (typeof dashboard !== 'undefined' && typeof dashboard.markMadreConExamen === 'function') {
                        dashboard.markMadreConExamen(currentPacienteEOA.id, result.data);
                    }
                    
                    closeEoaModal();
                    
                    // Recargar registros recientes si estamos en el dashboard
                    if (typeof dashboard !== 'undefined' && dashboard.loadRecentPatients) {
                    await dashboard.loadRecentPatients();
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

    const exportBtn = document.getElementById('exportEvolucionBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportarEvolucionDesdeFormulario();
        });
    }

    const trackDirty = () => {
        eoaFormPristine = false;
    };

    const formInputs = document.querySelectorAll('#eoaForm input, #eoaForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', trackDirty);
        input.addEventListener('change', trackDirty);
    });

    // Efectos visuales en radio buttons
    const radioLabels = document.querySelectorAll('.radio-label');
    radioLabels.forEach(label => {
        label.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                // Remover selección previa en el mismo grupo
                const name = radio.name;
                document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                    const label = r.closest('.radio-label');
                    if (label) {
                        label.classList.remove('selected');
                    }
                });
                
                // Agregar selección actual
                this.classList.add('selected');
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEoaEventHandlers);
} else {
    initializeEoaEventHandlers();
}

// Exportar funciones para uso en otros módulos
window.eoa = {
    openEoaModal,
    closeEoaModal,
    registrarExamenEOA,
    obtenerExamenesPaciente,
    obtenerExamenesMadre, // Mantener compatibilidad
    obtenerTodosExamenes,
    actualizarExamenEOA,
    eliminarExamenEOA,
    obtenerEstadisticasEOA,
    exportarExamenesCSV,
    exportarEvolucionDesdeFormulario,
    validarFormularioEOA,
    limpiarFormularioEOA,
    getCurrentPaciente: () => currentPacienteEOA,
    getCurrentMadre: () => currentPacienteEOA, // Mantener compatibilidad
    getCurrentExamen: () => currentExamenEOA
};
