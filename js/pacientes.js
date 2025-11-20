// Lógica para la vista completa de pacientes

let pacientesListado = [];
const resumenPacientes = new Map();
let activeMenu = null;
let campoObservacionesPaciente = null;
const CAMPOS_OBSERVACIONES_CANDIDATOS = [
    'observaciones_generales',
    'observaciones_paciente',
    'observaciones_estado',
    'observaciones'
];

function parseISODateAsLocal(dateValue) {
    if (!dateValue) {
        return null;
    }
    const datePart = dateValue.toString().split('T')[0];
    const parts = datePart.split('-').map(part => parseInt(part, 10));
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
}

function formatDateFromLocal(value) {
    const date = parseISODateAsLocal(value);
    if (!date) {
        return null;
    }
    return date;
}

document.addEventListener('DOMContentLoaded', () => {
    initPacientesPage();
});

async function initPacientesPage() {
    try {
        await ensureSupabaseReady();
        bindSearchInput();
        bindEditForm();
        document.addEventListener('click', handleGlobalClicks);
        await loadPacientes();
    } catch (error) {
        console.error('Error al inicializar la página de pacientes:', error);
        mostrarMensaje('pacientesTableContainer', '<p class="no-data">No se pudo conectar con la base de datos</p>');
    }
}

async function ensureSupabaseReady() {
    let attempts = 0;
    while (!window.supabaseClient && attempts < 40) {
        if (window.auth && typeof window.auth.initializeSupabase === 'function') {
            try {
                window.auth.initializeSupabase();
            } catch (error) {
                console.warn('No se pudo inicializar Supabase desde auth:', error);
            }
        }
        await wait(100);
        attempts++;
    }
    if (!window.supabaseClient) {
        throw new Error('Supabase no está disponible');
    }
}

function bindSearchInput() {
    const searchInput = document.getElementById('pacientesSearch');
    if (!searchInput) return;
    const handler = () => {
        const term = searchInput.value.trim();
        loadPacientes(term);
    };
    if (window.utils && typeof window.utils.debounce === 'function') {
        searchInput.addEventListener('input', window.utils.debounce(handler, 400));
    } else {
        searchInput.addEventListener('input', handler);
    }
}

function bindEditForm() {
    const form = document.getElementById('editPacienteForm');
    if (!form) return;

    const rutInput = document.getElementById('editRut');
    const observacionesField = document.getElementById('editObservaciones');
    const observacionesExamenIdInput = document.getElementById('editObservacionesExamenId');
    const observacionesRawInput = document.getElementById('editObservacionesRaw');

    if (rutInput && window.utils?.formatearRUTInput) {
        rutInput.addEventListener('input', function() {
            window.utils.formatearRUTInput(this);
        });
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const pacienteId = document.getElementById('editPacienteId').value;
        if (!pacienteId) return;

        const nombre = document.getElementById('editNombre').value.trim();
        const apellido = document.getElementById('editApellido').value.trim();
        const rutValor = rutInput?.value.trim() || '';
        const numeroFicha = document.getElementById('editFicha').value.trim();
        const sala = document.getElementById('editSala').value.trim();
        const cama = document.getElementById('editCama').value.trim();
        const cantidadHijos = parseInt(document.getElementById('editHijos').value, 10);
        const rutFormateado = window.utils?.formatearRUT ? window.utils.formatearRUT(rutValor) : rutValor;
        const rutNormalizado = rutFormateado.replace(/\./g, '').replace('-', '');
        const usaObservacionesGenerales = Boolean(campoObservacionesPaciente);
        const observacionesTexto = observacionesField?.value.trim() || '';
        let requiereActualizacionExamen = false;
        let examenObservacionesId = '';
        let observacionesActualizadas = null;

        if (usaObservacionesGenerales) {
            // Las observaciones se guardarán directamente en el registro de paciente
        } else if (
            observacionesField &&
            !observacionesField.disabled &&
            observacionesExamenIdInput?.value
        ) {
            requiereActualizacionExamen = true;
            examenObservacionesId = observacionesExamenIdInput.value;
            observacionesActualizadas = construirObservacionesActualizadas(
                observacionesTexto,
                observacionesRawInput?.value || ''
            );
        }

        if (!nombre || !apellido || !sala || !cama) {
            utils?.showNotification('Los campos nombre, apellido, sala y cama son obligatorios', 'error');
            return;
        }

        // Validar RUT solo si se proporciona
        if (rutFormateado && window.utils?.validarRUT && !window.utils.validarRUT(rutFormateado)) {
            utils?.showNotification('Ingresa un RUT válido en el formato 12345678-9 (opcional)', 'error');
            return;
        }

        if (Number.isNaN(cantidadHijos) || cantidadHijos < 1) {
            utils?.showNotification('La cantidad de hijos debe ser un numero valido', 'error');
            return;
        }

        const payload = {
            nombre,
            apellido,
            rut: rutFormateado,
            numero_ficha: numeroFicha,
            sala,
            cama,
            cantidad_hijos: cantidadHijos
        };

        if (campoObservacionesPaciente) {
            payload[campoObservacionesPaciente] = observacionesTexto ? observacionesTexto : null;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoader = submitBtn?.querySelector('.btn-loader');
        const setLoading = (state) => {
            if (!submitBtn) return;
            submitBtn.disabled = state;
            if (btnText && btnLoader) {
                btnText.style.display = state ? 'none' : '';
                btnLoader.style.display = state ? '' : 'none';
            }
        };

        setLoading(true);
        try {
            const result = await window.madres.actualizarMadre(pacienteId, payload);
            if (!result.success) {
                throw new Error(result.error || 'No se pudo actualizar el paciente');
            }

            if (!campoObservacionesPaciente && requiereActualizacionExamen) {
                const examenResult = await window.eoa.actualizarExamenEOA(examenObservacionesId, {
                    observaciones: observacionesActualizadas || null
                });
                if (!examenResult.success) {
                    throw new Error(examenResult.error || 'No se pudieron actualizar las observaciones del examen');
                }
            }

            utils?.showNotification('Paciente actualizado exitosamente', 'success');
            closeEditPacienteModal();
            const searchValue = document.getElementById('pacientesSearch')?.value.trim() || '';
            await loadPacientes(searchValue);
        } catch (error) {
            console.error('Error actualizando paciente:', error);
            utils?.showNotification(error.message || 'Error al actualizar paciente', 'error');
        } finally {
            setLoading(false);
        }
    });
}

async function loadPacientes(searchTerm = '') {
    const container = document.getElementById('pacientesTableContainer');
    mostrarMensaje('pacientesTableContainer', '<p class="loading">Cargando pacientes...</p>');
    closeAllMenus();

    try {
        let query = window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('tipo_paciente', 'MADRE')
            .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.or(`rut.ilike.%${searchTerm}%,numero_ficha.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        pacientesListado = data || [];
        detectarCampoObservacionesPaciente(pacientesListado);
        const resumenMap = await obtenerResumenExamenes(pacientesListado.map(p => p.id));
        resumenPacientes.clear();
        resumenMap.forEach((value, key) => resumenPacientes.set(key, value));

        renderPacientesTable(pacientesListado);
    } catch (error) {
        console.error('Error al cargar pacientes:', error);
        mostrarMensaje('pacientesTableContainer', '<p class="no-data">No se pudo cargar la lista de pacientes</p>');
    }
}

async function obtenerResumenExamenes(pacienteIds = []) {
    if (!Array.isArray(pacienteIds) || pacienteIds.length === 0) {
        return new Map();
    }
    try {
        const uniqueIds = [...new Set(pacienteIds.filter(Boolean))];
        if (uniqueIds.length === 0) {
            return new Map();
        }

        const { data, error } = await window.supabaseClient
            .from('examenes_eoa')
            .select('id,paciente_id,od_resultado,oi_resultado,fecha_examen,fecha_nacimiento,observaciones')
            .in('paciente_id', uniqueIds)
            .order('fecha_examen', { ascending: true });

        if (error) throw error;

        const agrupados = new Map();
        (data || []).forEach(examen => {
            if (!agrupados.has(examen.paciente_id)) {
                agrupados.set(examen.paciente_id, []);
            }
            agrupados.get(examen.paciente_id).push(examen);
        });

        const resumenMap = new Map();
        uniqueIds.forEach(id => {
            const lista = agrupados.get(id) || [];
            const sorted = lista.slice().sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
            resumenMap.set(id, { examenes: sorted });
        });

        return resumenMap;
    } catch (error) {
        console.warn('No se pudo obtener el estado de EOA para la tabla:', error);
        return new Map();
    }
}

function renderPacientesTable(pacientes) {
    const container = document.getElementById('pacientesTableContainer');
    if (!container) return;

    if (!pacientes || pacientes.length === 0) {
        container.innerHTML = '<p class="no-data">No se encontraron pacientes</p>';
        return;
    }

    const headHtml = `
        <tr>
            <th class="sortable" data-column="nombre">
                Nombre
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable" data-column="rut">
                RUT
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable" data-column="numero_ficha">
                N° de Ficha
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable" data-column="fecha_parto">
                Fecha de Parto
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable" data-column="primer_examen">
                1er examen
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable resultado-col" data-column="primer_resultado">
                Resultado
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable" data-column="segundo_examen">
                2do examen
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable resultado-col" data-column="segundo_resultado">
                Resultado
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th class="sortable observaciones-col" data-column="observaciones">
                Observaciones Generales
                <div class="sort-controls">
                    <button class="sort-btn sort-asc" data-direction="asc" title="Ordenar ascendente">▲</button>
                    <button class="sort-btn sort-desc" data-direction="desc" title="Ordenar descendente">▼</button>
                </div>
            </th>
            <th></th>
        </tr>
    `;

    const rowsHtml = pacientes.map(paciente => crearFilaPaciente(paciente)).join('');
    container.innerHTML = `
        <div class="madres-table-wrapper">
            <table class="madres-table">
                <thead>${headHtml}</thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;

    bindTablaEventos(container);
    bindSortEvents(container);
}

function crearFilaPaciente(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const primerExamen = examenes[0] || null;
    const segundoExamen = examenes[1] || null;
    const nombreCompleto = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Sin nombre';
    const rutFormateado = utils.formatearRUT ? utils.formatearRUT(paciente.rut) : paciente.rut;
    const fechaNacimientoExamen = primerExamen?.fecha_nacimiento;
    const fechaParto = fechaNacimientoExamen || paciente.fecha_parto || paciente.fecha_nacimiento || paciente.created_at;
    const fechaPartoDate = formatDateFromLocal(fechaParto);
    const fechaPartoTexto = fechaPartoDate ? utils.formatearFecha(fechaPartoDate) : (fechaParto ? fechaParto.split('T')[0] : 'Sin registro');
    const observaciones = obtenerObservacionesTabla(paciente, examenes);
    const nombreConfirm = nombreCompleto.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    const estadoPrimer = determinarEstadoPrimerExamen(primerExamen, segundoExamen);
    const estadoSegundo = determinarEstadoSegundoExamen(segundoExamen);

    return `
        <tr data-madre-id="${paciente.id}">
            <td>${utils.escapeHTML(nombreCompleto)}</td>
            <td>${utils.escapeHTML(rutFormateado || 'Sin registro')}</td>
            <td>${utils.escapeHTML(paciente.numero_ficha || 'Sin ficha')}</td>
            <td>${utils.escapeHTML(fechaPartoTexto)}</td>
            <td>${utils.escapeHTML(primerExamen ? utils.formatearFecha(primerExamen.fecha_examen) : 'Sin registro')}</td>
            <td class="resultado-col">
                <span class="resultado-pill ${estadoPrimer.clase}">
                    ${utils.escapeHTML(estadoPrimer.texto)}
                </span>
            </td>
            <td>${utils.escapeHTML(segundoExamen ? utils.formatearFecha(segundoExamen.fecha_examen) : 'Sin registro')}</td>
            <td class="resultado-col">
                <span class="resultado-pill ${estadoSegundo.clase}">
                    ${utils.escapeHTML(estadoSegundo.texto)}
                </span>
            </td>
            <td class="observaciones-col">${utils.escapeHTML(observaciones)}</td>
            <td class="table-actions">
                <button type="button" class="table-actions-btn" aria-label="Acciones" data-madre-id="${paciente.id}">
                    &#8942;
                </button>
                <div class="table-actions-menu">
                    <button type="button" data-menu-action="editar" data-madre-id="${paciente.id}">Editar datos</button>
                    <button type="button" data-menu-action="eliminar" data-madre-id="${paciente.id}" data-nombre-madre="${nombreConfirm}">Eliminar</button>
                </div>
            </td>
        </tr>
    `;
}

function formatearResultado(examen) {
    if (!examen) return 'Sin resultado';
    const od = examen.od_resultado || 'N/A';
    const oi = examen.oi_resultado || 'N/A';
    return `OD: ${od} | OI: ${oi}`;
}

function examenEsRefiere(examen) {
    if (!examen) {
        return false;
    }
    return (examen.od_resultado === 'REFIERE' || examen.oi_resultado === 'REFIERE');
}

function examenEsPasa(examen) {
    if (!examen) {
        return false;
    }
    return examen.od_resultado === 'PASA' && examen.oi_resultado === 'PASA';
}

function determinarEstadoPrimerExamen(primerExamen, segundoExamen) {
    if (!primerExamen) {
        return { texto: 'Sin resultado', clase: 'estado-neutral' };
    }
    if (examenEsPasa(primerExamen)) {
        return { texto: formatearResultado(primerExamen), clase: 'estado-success' };
    }
    if (examenEsRefiere(primerExamen)) {
        if (examenEsRefiere(segundoExamen)) {
            return { texto: 'Refiere (ambos)', clase: 'estado-danger' };
        }
        return { texto: 'Refiere (1er)', clase: 'estado-warning' };
    }
    return { texto: formatearResultado(primerExamen), clase: 'estado-warning' };
}

function determinarEstadoSegundoExamen(segundoExamen) {
    if (!segundoExamen) {
        return { texto: 'Sin registro', clase: 'estado-neutral' };
    }
    if (examenEsRefiere(segundoExamen)) {
        return { texto: formatearResultado(segundoExamen), clase: 'estado-danger' };
    }
    if (examenEsPasa(segundoExamen)) {
        return { texto: formatearResultado(segundoExamen), clase: 'estado-success' };
    }
    return { texto: formatearResultado(segundoExamen), clase: 'estado-warning' };
}

function obtenerObservacionesTabla(paciente, examenes = []) {
    const generales = getObservacionesGeneralesPaciente(paciente);
    if (generales) {
        return generales;
    }
    return obtenerObservacionesPlano(examenes);
}

function obtenerObservacionesPlano(examenes = []) {
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return 'Sin observaciones';
    }
    const examen = [...examenes].reverse().find(item => item && item.observaciones);
    if (!examen) return 'Sin observaciones';
    if (window.eoa && typeof window.eoa.observacionesATextoPlano === 'function') {
        return window.eoa.observacionesATextoPlano(examen.observaciones) || 'Sin observaciones';
    }
    return examen.observaciones || 'Sin observaciones';
}

function detectarCampoObservacionesPaciente(lista = []) {
    campoObservacionesPaciente = null;
    if (!Array.isArray(lista) || lista.length === 0) {
        return;
    }
    campoObservacionesPaciente = CAMPOS_OBSERVACIONES_CANDIDATOS.find(campo =>
        lista.some(paciente => Object.prototype.hasOwnProperty.call(paciente, campo))
    ) || null;
}

function tieneObservacionesGenerales() {
    return Boolean(campoObservacionesPaciente);
}

function getObservacionesGeneralesPaciente(paciente) {
    if (!tieneObservacionesGenerales() || !paciente) {
        return '';
    }
    return paciente[campoObservacionesPaciente] || '';
}

function bindTablaEventos(container) {
    container.querySelectorAll('.madres-table tbody tr').forEach(fila => {
        fila.addEventListener('click', function() {
            const madreId = this.dataset.madreId;
            if (madreId) {
                abrirEoaParaPaciente(madreId);
            }
        });
    });

    container.querySelectorAll('.table-actions-btn').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleMenu(this);
        });
    });

    container.querySelectorAll('.table-actions-menu button').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const action = this.dataset.menuAction;
            const madreId = this.dataset.madreId;
            const nombre = this.dataset.nombreMadre || '';
            closeAllMenus();

            if (action === 'editar') {
                abrirModalEdicion(madreId);
            } else if (action === 'eliminar') {
                eliminarPaciente(madreId, nombre);
            }
        });
    });
}

function bindSortEvents(container) {
    container.querySelectorAll('.sortable').forEach(header => {
        const sortButtons = header.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const column = header.dataset.column;
                const direction = this.dataset.direction;
                sortPacientes(column, direction);
                
                // Actualizar estados visuales de los botones
                container.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    });
}

function sortPacientes(column, direction) {
    const sortedPacientes = [...pacientesListado].sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
            case 'nombre':
                valueA = `${a.nombre || ''} ${a.apellido || ''}`.toLowerCase();
                valueB = `${b.nombre || ''} ${b.apellido || ''}`.toLowerCase();
                break;
            case 'rut':
                valueA = a.rut || '';
                valueB = b.rut || '';
                break;
            case 'numero_ficha':
                valueA = a.numero_ficha || '';
                valueB = b.numero_ficha || '';
                break;
            case 'fecha_parto':
                valueA = getFechaParto(a);
                valueB = getFechaParto(b);
                break;
            case 'primer_examen':
                valueA = getPrimerExamenFecha(a);
                valueB = getPrimerExamenFecha(b);
                break;
            case 'primer_resultado':
                valueA = getPrimerExamenResultado(a);
                valueB = getPrimerExamenResultado(b);
                break;
            case 'segundo_examen':
                valueA = getSegundoExamenFecha(a);
                valueB = getSegundoExamenFecha(b);
                break;
            case 'segundo_resultado':
                valueA = getSegundoExamenResultado(a);
                valueB = getSegundoExamenResultado(b);
                break;
            case 'observaciones':
                valueA = getObservaciones(a);
                valueB = getObservaciones(b);
                break;
            default:
                return 0;
        }
        
        // Manejar fechas
        if (column.includes('fecha') || column.includes('examen')) {
            const dateA = valueA ? new Date(valueA) : new Date(0);
            const dateB = valueB ? new Date(valueB) : new Date(0);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // Manejar números
        if (!isNaN(valueA) && !isNaN(valueB)) {
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // Manejar texto
        valueA = (valueA || '').toString().toLowerCase();
        valueB = (valueB || '').toString().toLowerCase();
        
        if (direction === 'asc') {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    renderPacientesTable(sortedPacientes);
}

function getFechaParto(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const primerExamen = examenes[0] || null;
    const fechaNacimientoExamen = primerExamen?.fecha_nacimiento;
    return fechaNacimientoExamen || paciente.fecha_parto || paciente.fecha_nacimiento || paciente.created_at;
}

function getPrimerExamenFecha(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const primerExamen = examenes[0] || null;
    return primerExamen?.fecha_examen || '';
}

function getPrimerExamenResultado(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const primerExamen = examenes[0] || null;
    if (!primerExamen) return '';
    const od = primerExamen.od_resultado || 'N/A';
    const oi = primerExamen.oi_resultado || 'N/A';
    return `OD: ${od} | OI: ${oi}`;
}

function getSegundoExamenFecha(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const segundoExamen = examenes[1] || null;
    return segundoExamen?.fecha_examen || '';
}

function getSegundoExamenResultado(paciente) {
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    const segundoExamen = examenes[1] || null;
    if (!segundoExamen) return '';
    const od = segundoExamen.od_resultado || 'N/A';
    const oi = segundoExamen.oi_resultado || 'N/A';
    return `OD: ${od} | OI: ${oi}`;
}

function getObservaciones(paciente) {
    const generales = getObservacionesGeneralesPaciente(paciente);
    if (generales) {
        return generales;
    }
    const resumen = resumenPacientes.get(paciente.id) || { examenes: [] };
    const examenes = resumen.examenes || [];
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return 'Sin observaciones';
    }
    const examen = [...examenes].reverse().find(item => item && item.observaciones);
    if (!examen) return 'Sin observaciones';
    if (window.eoa && typeof window.eoa.observacionesATextoPlano === 'function') {
        return window.eoa.observacionesATextoPlano(examen.observaciones) || 'Sin observaciones';
    }
    return examen.observaciones || 'Sin observaciones';
}

function obtenerExamenEditableObservaciones(madreId) {
    const resumen = resumenPacientes.get(madreId);
    const examenes = resumen?.examenes || [];
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return null;
    }
    const ultimoConObservaciones = [...examenes].reverse().find(examen => examen && examen.observaciones);
    return ultimoConObservaciones || examenes[examenes.length - 1];
}

function obtenerTextoGeneralObservaciones(rawObservaciones) {
    if (!rawObservaciones) {
        return '';
    }
    try {
        if (window.eoa?.parseObservacionesDetalladas) {
            const parsed = window.eoa.parseObservacionesDetalladas(rawObservaciones);
            return parsed?.general || '';
        }
    } catch (error) {
        console.warn('No se pudo parsear observaciones para edición:', error);
    }
    return rawObservaciones || '';
}

function construirObservacionesActualizadas(nuevoTexto, observacionesPrevias) {
    const texto = (nuevoTexto || '').trim();
    const rawPrevio = observacionesPrevias || '';
    if (!window.eoa?.parseObservacionesDetalladas || !window.eoa?.serializarObservacionesDetalladas) {
        return texto || null;
    }

    try {
        const parsed = window.eoa.parseObservacionesDetalladas(rawPrevio);
        const detalles = parsed?.detalles || {};
        return window.eoa.serializarObservacionesDetalladas(texto, detalles);
    } catch (error) {
        console.warn('No se pudo reconstruir el detalle de observaciones:', error);
        return texto || null;
    }
}

function prepararObservacionesEdicion(paciente) {
    const textarea = document.getElementById('editObservaciones');
    const examenIdInput = document.getElementById('editObservacionesExamenId');
    const rawInput = document.getElementById('editObservacionesRaw');
    const helpText = document.getElementById('editObservacionesHelp');

    if (!textarea || !examenIdInput || !rawInput) {
        return;
    }

    if (tieneObservacionesGenerales()) {
        textarea.disabled = false;
        textarea.value = getObservacionesGeneralesPaciente(paciente) || '';
        examenIdInput.value = '';
        rawInput.value = '';
        if (helpText) {
            helpText.textContent = 'Observaciones generales del paciente (derivaciones, estado, notas).';
        }
        return;
    }

    const examenEditable = paciente ? obtenerExamenEditableObservaciones(paciente.id) : null;
    if (!examenEditable) {
        textarea.value = '';
        textarea.disabled = true;
        examenIdInput.value = '';
        rawInput.value = '';
        if (helpText) {
            helpText.textContent = 'Este paciente aun no registra examenes para editar observaciones.';
        }
        return;
    }

    textarea.disabled = false;
    const rawObservaciones = examenEditable.observaciones || '';
    textarea.value = obtenerTextoGeneralObservaciones(rawObservaciones);
    examenIdInput.value = examenEditable.id;
    rawInput.value = rawObservaciones;
    if (helpText) {
        helpText.textContent = rawObservaciones
            ? 'Edita el texto general del ultimo examen con observaciones. Los detalles adicionales se conservan.'
            : 'Aun no hay observaciones registradas para el ultimo examen. Puedes agregarlas aqui.';
    }
}

function limpiarObservacionesEdicion() {
    const textarea = document.getElementById('editObservaciones');
    const examenIdInput = document.getElementById('editObservacionesExamenId');
    const rawInput = document.getElementById('editObservacionesRaw');
    const helpText = document.getElementById('editObservacionesHelp');
    if (textarea) {
        textarea.value = '';
        textarea.disabled = !tieneObservacionesGenerales();
    }
    if (examenIdInput) {
        examenIdInput.value = '';
    }
    if (rawInput) {
        rawInput.value = '';
    }
    if (helpText) {
        helpText.textContent = tieneObservacionesGenerales()
            ? 'Observaciones generales del paciente.'
            : 'Se cargarán las observaciones del examen más reciente.';
    }
}

function toggleMenu(button) {
    const menu = button.nextElementSibling;
    if (!menu) return;
    if (menu === activeMenu) {
        menu.classList.remove('open');
        activeMenu = null;
        return;
    }
    closeAllMenus();
    menu.classList.add('open');
    activeMenu = menu;
}

function closeAllMenus() {
    document.querySelectorAll('.table-actions-menu.open').forEach(menu => menu.classList.remove('open'));
    activeMenu = null;
}

function handleGlobalClicks(event) {
    if (!event.target.closest('.table-actions')) {
        closeAllMenus();
    }
}

async function abrirEoaParaPaciente(pacienteId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .single();
        if (error) throw error;
        openEoaModal(data);
    } catch (error) {
        console.error('Error al abrir EOA para paciente:', error);
        utils?.showNotification('No se pudo abrir el formulario EOA', 'error');
    }
}

function abrirModalEdicion(madreId) {
    const paciente = pacientesListado.find(item => item.id === madreId);
    if (!paciente) {
        utils?.showNotification('No se encontro el paciente seleccionado', 'error');
        return;
    }

    const rutFormateado = window.utils?.formatearRUT ? window.utils.formatearRUT(paciente.rut || '') : (paciente.rut || '');
    document.getElementById('editPacienteId').value = paciente.id;
    document.getElementById('editNombre').value = paciente.nombre || '';
    document.getElementById('editApellido').value = paciente.apellido || '';
    document.getElementById('editRut').value = rutFormateado;
    document.getElementById('editFicha').value = paciente.numero_ficha || '';
    document.getElementById('editSala').value = paciente.sala || '';
    document.getElementById('editCama').value = paciente.cama || '';
    document.getElementById('editHijos').value = paciente.cantidad_hijos ?? 1;
    prepararObservacionesEdicion(paciente);

    const modal = document.getElementById('editPacienteModal');
    if (modal) {
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    }
    document.getElementById('editNombre')?.focus();
}

function closeEditPacienteModal() {
    const modal = document.getElementById('editPacienteModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    const form = document.getElementById('editPacienteForm');
    form?.reset();
    limpiarObservacionesEdicion();
}

function crearInputEdicion(value, field, type = 'text') {
    return `<input class="inline-edit-input" data-field="${field}" type="${type}" value="${value ?? ''}">`;
}

function iniciarEdicionInline(madreId) {
    const row = document.querySelector(`tr[data-madre-id="${madreId}"]`);
    if (!row || row.classList.contains('editing')) {
        return;
    }

    const paciente = pacientesListado.find(item => item.id === madreId);
    if (!paciente) {
        utils?.showNotification('No se encontró el paciente para editar', 'error');
        return;
    }

    row.dataset.originalHtml = row.innerHTML;
    row.classList.add('editing');

    const cells = row.querySelectorAll('td');
    cells[0].innerHTML = crearInputEdicion(paciente.nombre || '', 'nombre');
    cells[1].innerHTML = crearInputEdicion(utils.formatearRUT ? utils.formatearRUT(paciente.rut) : paciente.rut || '', 'rut');
    cells[2].innerHTML = crearInputEdicion(paciente.numero_ficha || '', 'numero_ficha');
    cells[4].innerHTML = crearInputEdicion(paciente.created_at ? paciente.created_at.split('T')[0] : '', 'fecha_examen', 'date');

    const actionsCell = cells[cells.length - 1];
    actionsCell.innerHTML = `
        <button class="btn btn-success btn-sm inline-save" type="button">Guardar</button>
        <button class="btn btn-secondary btn-sm inline-cancel" type="button">Cancelar</button>
    `;
    actionsCell.querySelector('.inline-save').addEventListener('click', async function(event) {
        event.stopPropagation();
        await guardarEdicionInline(row, paciente.id);
    });
    actionsCell.querySelector('.inline-cancel').addEventListener('click', function(event) {
        event.stopPropagation();
        cancelarEdicionInline(row);
    });
}

async function guardarEdicionInline(row, pacienteId) {
    const nombre = row.querySelector('.inline-edit-input[data-field="nombre"]').value.trim();
    const rut = row.querySelector('.inline-edit-input[data-field="rut"]').value.trim().replace(/\./g, '').replace('-', '');
    const numeroFicha = row.querySelector('.inline-edit-input[data-field="numero_ficha"]').value.trim();
    const fechaExamen = row.querySelector('.inline-edit-input[data-field="fecha_examen"]').value;

    if (!nombre || !rut || !numeroFicha) {
        utils?.showNotification('Completa nombre, RUT y ficha para guardar.', 'error');
        return;
    }

    const payload = {
        nombre,
        apellido: pacientesListado.find(p => p.id === pacienteId)?.apellido || '',
        rut,
        numero_ficha: numeroFicha,
        sala: pacientesListado.find(p => p.id === pacienteId)?.sala || '',
        cama: pacientesListado.find(p => p.id === pacienteId)?.cama || '',
        cantidad_hijos: pacientesListado.find(p => p.id === pacienteId)?.cantidad_hijos ?? 1
    };

    const btn = row.querySelector('.inline-save');
    if (btn) {
        btn.disabled = true;
    }

    try {
        const result = await window.madres.actualizarMadre(pacienteId, payload);
        if (!result.success) {
            throw new Error(result.error || 'No se pudo actualizar el paciente');
        }
        utils?.showNotification('Paciente actualizado directamente en la tabla', 'success');
        const searchValue = document.getElementById('pacientesSearch')?.value.trim() || '';
        await loadPacientes(searchValue);
    } catch (error) {
        console.error('Error guardando edición inline:', error);
        utils?.showNotification(error.message || 'Error al guardar edición', 'error');
        if (btn) {
            btn.disabled = false;
        }
    }
}

function cancelarEdicionInline(row) {
    if (!row || !row.dataset.originalHtml) {
        return;
    }
    row.innerHTML = row.dataset.originalHtml;
    row.classList.remove('editing');
    delete row.dataset.originalHtml;
    bindTablaEventos(row.closest('.madres-table-wrapper'));
}

async function eliminarPaciente(madreId, nombreMadre = '') {
    if (!madreId) return;
    const nombreMostrar = nombreMadre ? nombreMadre.replace(/\\'/g, '\'') : 'este registro';
    const confirmado = window.confirm(`¿Eliminar el registro de ${nombreMostrar}? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
        // Verificar que window.madres existe y tiene el método eliminarMadre
        if (!window.madres || typeof window.madres.eliminarMadre !== 'function') {
            throw new Error('Función de eliminación no disponible');
        }
        
        const result = await window.madres.eliminarMadre(madreId);
        
        // Verificar que result existe y tiene la propiedad success
        if (!result || typeof result !== 'object' || result.success === undefined) {
            throw new Error('Respuesta inválida al eliminar paciente');
        }
        
        if (!result.success) {
            throw new Error(result.error || 'No se pudo eliminar el paciente');
        }
        utils?.showNotification('Paciente eliminado correctamente', 'success');
        const searchValue = document.getElementById('pacientesSearch')?.value.trim() || '';
        await loadPacientes(searchValue);
    } catch (error) {
        console.error('Error al eliminar paciente:', error);
        utils?.showNotification(error.message || 'Error al eliminar paciente', 'error');
    }
}

function mostrarMensaje(containerId, html) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = html;
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

