// Lógica para la vista completa de pacientes

let pacientesListado = [];
const resumenPacientes = new Map();
let activeMenu = null;

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
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const pacienteId = document.getElementById('editPacienteId').value;
        if (!pacienteId) return;

        const payload = {
            nombre: document.getElementById('editNombre').value.trim(),
            apellido: document.getElementById('editApellido').value.trim(),
            rut: document.getElementById('editRut').value.trim().replace(/\./g, '').replace('-', ''),
            numero_ficha: document.getElementById('editFicha').value.trim(),
            sala: document.getElementById('editSala').value.trim(),
            cama: document.getElementById('editCama').value.trim(),
            cantidad_hijos: parseInt(document.getElementById('editHijos').value, 10)
        };

        if (!payload.nombre || !payload.apellido || !payload.rut) {
            utils?.showNotification('Completa todos los campos obligatorios', 'error');
            return;
        }
        if (Number.isNaN(payload.cantidad_hijos) || payload.cantidad_hijos < 1) {
            utils?.showNotification('La cantidad de hijos debe ser un número válido', 'error');
            return;
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
            <th>Nombre</th>
            <th>RUT</th>
            <th>N° de Ficha</th>
            <th>Fecha de Parto</th>
            <th>1er examen</th>
            <th class="resultado-col">Resultado</th>
            <th>2do examen</th>
            <th class="resultado-col">Resultado</th>
            <th class="observaciones-col">Observaciones</th>
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
    const fechaPartoTexto = fechaParto ? utils.formatearFecha(fechaParto) : 'Sin registro';
    const observaciones = obtenerObservacionesPlano(examenes);
    const nombreConfirm = nombreCompleto.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');

    return `
        <tr data-madre-id="${paciente.id}">
            <td>${utils.escapeHTML(nombreCompleto)}</td>
            <td>${utils.escapeHTML(rutFormateado || 'Sin registro')}</td>
            <td>${utils.escapeHTML(paciente.numero_ficha || 'Sin ficha')}</td>
            <td>${utils.escapeHTML(fechaPartoTexto)}</td>
            <td>${utils.escapeHTML(primerExamen ? utils.formatearFecha(primerExamen.fecha_examen) : 'Sin registro')}</td>
            <td class="resultado-col">${utils.escapeHTML(formatearResultado(primerExamen))}</td>
            <td>${utils.escapeHTML(segundoExamen ? utils.formatearFecha(segundoExamen.fecha_examen) : 'Sin registro')}</td>
            <td class="resultado-col">${utils.escapeHTML(formatearResultado(segundoExamen))}</td>
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
        utils?.showNotification('No se encontró el paciente seleccionado', 'error');
        return;
    }

    document.getElementById('editPacienteId').value = paciente.id;
    document.getElementById('editNombre').value = paciente.nombre || '';
    document.getElementById('editApellido').value = paciente.apellido || '';
    document.getElementById('editRut').value = utils.formatearRUT ? utils.formatearRUT(paciente.rut) : paciente.rut;
    document.getElementById('editFicha').value = paciente.numero_ficha || '';
    document.getElementById('editSala').value = paciente.sala || '';
    document.getElementById('editCama').value = paciente.cama || '';
    document.getElementById('editHijos').value = paciente.cantidad_hijos ?? 1;

    const modal = document.getElementById('editPacienteModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeEditPacienteModal() {
    const modal = document.getElementById('editPacienteModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    document.getElementById('editPacienteForm').reset();
}

async function eliminarPaciente(madreId, nombreMadre = '') {
    if (!madreId) return;
    const nombreMostrar = nombreMadre ? nombreMadre.replace(/\\'/g, '\'') : 'este registro';
    const confirmado = window.confirm(`¿Eliminar el registro de ${nombreMostrar}? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
        const result = await window.madres.eliminarMadre(madreId);
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
