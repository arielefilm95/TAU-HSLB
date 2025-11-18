// Funcionalidad del Dashboard

// Variables globales
let recentPatients = [];
const pacientesResumenExamen = new Map();
const pacienteEvolucionCache = new Map();
let pacientesTablaActual = [];
let midnightCleanupInterval = null;
let activeActionMenu = null;

function resultadoRefiere(examen) {
    if (!examen) {
        return false;
    }
    return examen.od_resultado === 'REFIERE' || examen.oi_resultado === 'REFIERE';
}

function mergeResumenExamenes(resumenMap) {
    if (!(resumenMap instanceof Map)) {
        return;
    }
    resumenMap.forEach((resumen, pacienteId) => {
        pacientesResumenExamen.set(pacienteId, resumen);
    });
}

async function obtenerResumenExamenes(pacienteIds = []) {
    if (!Array.isArray(pacienteIds) || pacienteIds.length === 0) {
        return new Map();
    }

    if (!window.supabaseClient) {
        return new Map();
    }

    const uniqueIds = [...new Set(pacienteIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return new Map();
    }

    const { data, error } = await window.supabaseClient
        .from('examenes_eoa')
        .select('id,paciente_id,od_resultado,oi_resultado,fecha_examen')
        .in('paciente_id', uniqueIds)
        .order('fecha_examen', { ascending: true });

    if (error) {
        throw error;
    }

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
        if (lista.length === 0) {
            resumenMap.set(id, {
                examenes: [],
                examCount: 0,
                firstExam: null,
                lastExam: null,
                firstExamRefiere: false,
                lastExamRefiere: false
            });
        } else {
            const sorted = lista.slice().sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
            const firstExam = sorted[0];
            const lastExam = sorted[sorted.length - 1];
            resumenMap.set(id, {
                examenes: sorted,
                examCount: sorted.length,
                firstExam,
                lastExam,
                firstExamRefiere: resultadoRefiere(firstExam),
                lastExamRefiere: resultadoRefiere(lastExam)
            });
        }
    });

    return resumenMap;
}

// Función para inicializar el dashboard
async function initDashboard() {
    try {
        // Cargar registros recientes
        await loadRecentPatients();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar PWA si está disponible
        setupPWA();
        
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        utils.showNotification('Error al cargar el dashboard', 'error');
    }
}


// Función para cargar registros recientes
async function loadRecentPatients() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            const recentPatientsElement = document.getElementById('recentMothers');
            if (recentPatientsElement) {
                recentPatientsElement.innerHTML = '<p class="no-data">Error de conexión</p>';
            }
            return;
        }
        
        // Obtener fecha actual en formato ISO (inicio y fin del día)
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        // Convertir a formato ISO para Supabase
        const startOfDayISO = startOfDay.toISOString();
        const endOfDayISO = endOfDay.toISOString();
        
        console.log('📅 Cargando registros recientes del día:', {
            startOfDay: startOfDayISO,
            endOfDay: endOfDayISO
        });
        
        // Consultar solo registros manuales del día actual (solo madres)
        // Usamos el campo origen_registro para filtrar más eficientemente
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('tipo_paciente', 'MADRE') // Solo madres para mantener compatibilidad
            .eq('origen_registro', 'MANUAL') // Solo registros manuales
            .gte('created_at', startOfDayISO)
            .lt('created_at', endOfDayISO)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error en consulta principal:', error);
            // Si falla la consulta con origen_registro, intentar con el método anterior
            const { data: fallbackData, error: fallbackError } = await window.supabaseClient
                .from('pacientes')
                .select('*')
                .eq('tipo_paciente', 'MADRE') // Solo madres
                .gte('created_at', startOfDayISO)
                .lt('created_at', endOfDayISO)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (fallbackError) {
                throw fallbackError;
            }
            
            // Filtrar manualmente los que no son importados (método de respaldo)
            const pacientesIds = fallbackData.map(p => p.id);
            const { data: importadosData } = await window.supabaseClient
                .from('partos_importados')
                .select('madre_id')
                .in('madre_id', pacientesIds);
            
            const importadosIds = new Set((importadosData || []).map(i => i.madre_id));
            const pacientesData = (fallbackData || []).filter(paciente =>
                !importadosIds.has(paciente.id) && paciente.origen_registro !== 'IMPORTADO'
            );
            
            const resumenMap = await obtenerResumenExamenes(pacientesData.map(paciente => paciente.id));
            mergeResumenExamenes(resumenMap);
            
            recentPatients = pacientesData.slice();
            displayRecentPatients();
            return;
        }
        
        const pacientesData = data || [];
        try {
            const resumenMap = await obtenerResumenExamenes(pacientesData.map(paciente => paciente.id));
            mergeResumenExamenes(resumenMap);
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes EOA para recientes:', statusError);
        }

        recentPatients = pacientesData.slice();
        displayRecentPatients();
        
    } catch (error) {
        console.error('Error al cargar registros recientes:', error);
        const recentPatientsElement = document.getElementById('recentMothers');
        if (recentPatientsElement) {
            recentPatientsElement.innerHTML = '<p class="no-data">Error al cargar registros</p>';
        }
    }
}

// Función para mostrar registros recientes
function displayRecentPatients() {
    const recentPatientsElement = document.getElementById('recentMothers');
    
    if (!recentPatientsElement) return;
    
    if (recentPatients.length === 0) {
        recentPatientsElement.innerHTML = '<p class="no-data">No hay registros recientes</p>';
        return;
    }
    
    const html = recentPatients.map(paciente => {
        const nombreCompleto = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ');
        const estado = obtenerEstadoEOAVisual(paciente.id);
        const itemClasses = ['recent-item'];
        if (estado.containerClass) {
            itemClasses.push(estado.containerClass);
        }
        const statusClass = `status-pill ${estado.pillTheme}`;
        const statusText = estado.pillText;
        
        return `
        <div class="${itemClasses.join(' ')}" data-madre-id="${paciente.id}">
            <div class="recent-item-info">
                <div class="recent-item-basic">
                    <div class="recent-item-name">${utils.escapeHTML(nombreCompleto)}</div>
                    <div class="recent-item-sala-cama">
                        <div class="recent-item-sala">Sala: ${utils.escapeHTML(paciente.sala)}</div>
                        <div class="recent-item-cama">Cama: ${utils.escapeHTML(paciente.cama)}</div>
                    </div>
                </div>
                <div class="recent-item-expand">▼</div>
                <div class="recent-item-details">
                    <div><strong>RUT:</strong> ${utils.escapeHTML(utils.formatearRUT(paciente.rut))}</div>
                    <div><strong>Ficha:</strong> ${utils.escapeHTML(paciente.numero_ficha)}</div>
                    <div><strong>Tipo:</strong> ${utils.escapeHTML(paciente.tipo_paciente || 'MADRE')}</div>
                    ${paciente.tipo_paciente === 'MADRE' ? `<div><strong>Hijos:</strong> ${utils.escapeHTML((paciente.cantidad_hijos ?? 'N/A').toString())}</div>` : ''}
                    <div><strong>Registro:</strong> ${utils.formatearFecha(paciente.created_at)}</div>
                    <div class="recent-item-status">
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="recent-item-date">
                    ${utils.formatearFecha(paciente.created_at)}
                </div>
            </div>
            <div class="recent-item-actions">
                <button class="btn btn-secondary btn-sm btn-small" data-action="abrir-eoa" data-madre-id="${paciente.id}">
                    Realizar EOA
                </button>
                <button class="btn btn-outline btn-sm btn-small" data-action="mostrar-evolucion" data-madre-id="${paciente.id}">
                    Mostrar evolución
                </button>
            </div>
            <div class="recent-item-evolucion" data-evolucion-container aria-hidden="true">
                <p class="evolucion-status">Presiona "Mostrar evolución" para ver los detalles del examen.</p>
            </div>
        </div>
    `;
    }).join('');
    
    recentPatientsElement.innerHTML = html;
    
    // Agregar listeners para abrir el formulario EOA (sin expansión)
    const recentItems = recentPatientsElement.querySelectorAll('.recent-item');
    recentItems.forEach(item => {
        const pacienteId = item.getAttribute('data-madre-id');
        if (!pacienteId) return;
        
        // Listener para abrir el formulario EOA
        const actionButton = item.querySelector('button[data-action="abrir-eoa"]');
        if (actionButton) {
            actionButton.addEventListener('click', async function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (window.dashboard && typeof window.dashboard.selectMadre === 'function') {
                    await window.dashboard.selectMadre(pacienteId);
                }
            });
        }

        const evolucionButton = item.querySelector('button[data-action="mostrar-evolucion"]');
        if (evolucionButton) {
            evolucionButton.addEventListener('click', async function(e) {
                e.stopPropagation();
                e.preventDefault();
                await toggleEvolucionReciente(pacienteId, item, evolucionButton);
            });
        }
    });
}

async function toggleEvolucionReciente(pacienteId, itemElement, triggerButton) {
    if (!pacienteId || !itemElement) {
        return;
    }

    const evolucionContainer = itemElement.querySelector('.recent-item-evolucion');
    if (!evolucionContainer) {
        return;
    }

    const isVisible = evolucionContainer.classList.contains('show');
    if (isVisible) {
        evolucionContainer.classList.remove('show');
        evolucionContainer.setAttribute('aria-hidden', 'true');
        if (triggerButton) {
            triggerButton.textContent = 'Mostrar evolución';
        }
        return;
    }

    evolucionContainer.classList.add('show');
    evolucionContainer.setAttribute('aria-hidden', 'false');
    if (triggerButton) {
        triggerButton.textContent = 'Ocultar evolución';
    }

    if (evolucionContainer.dataset.loaded === 'true') {
        return;
    }

    evolucionContainer.innerHTML = '<p class="evolucion-status">Cargando evolución...</p>';

    try {
        const examenes = await obtenerEvolucionesPaciente(pacienteId);
        evolucionContainer.innerHTML = renderEvolucionPreview(examenes);
        evolucionContainer.dataset.loaded = 'true';
    } catch (error) {
        console.error('Error al cargar evolución:', error);
        evolucionContainer.innerHTML = '<p class="evolucion-status error">No se pudo cargar la evolución. Intenta nuevamente.</p>';
        evolucionContainer.dataset.loaded = 'false';
        if (triggerButton) {
            triggerButton.textContent = 'Mostrar evolución';
        }
        evolucionContainer.classList.remove('show');
        evolucionContainer.setAttribute('aria-hidden', 'true');
    }
}

async function obtenerEvolucionesPaciente(pacienteId) {
    if (!pacienteId) {
        throw new Error('Paciente inválido');
    }

    if (pacienteEvolucionCache.has(pacienteId)) {
        return pacienteEvolucionCache.get(pacienteId);
    }

    if (typeof obtenerExamenesPaciente !== 'function') {
        throw new Error('Función de exámenes no disponible');
    }

    const result = await obtenerExamenesPaciente(pacienteId, 5);
    if (!result.success) {
        throw new Error(result.error || 'No se pudo obtener la evolución');
    }

    const examenesOrdenados = (result.data || []).slice().sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
    pacienteEvolucionCache.set(pacienteId, examenesOrdenados);
    return examenesOrdenados;
}

function renderEvolucionPreview(examenes) {
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return '<p class="evolucion-status">Este paciente aún no tiene exámenes registrados.</p>';
    }

    const contenido = examenes.map((examen, index) => {
        const numeroExamen = index + 1;
        const fechaTexto = examen.fecha_examen ? utils.formatearFecha(examen.fecha_examen) : 'Fecha no registrada';
        const textoEvolucion = typeof generarTextoEvolucion === 'function'
            ? generarTextoEvolucion(examen, numeroExamen)
            : generarTextoEvolucionResumida(examen, numeroExamen);

        return `
            <div class="evolucion-entry">
                <div class="evolucion-entry-header">
                    <span>Examen ${numeroExamen} - ${utils.escapeHTML(fechaTexto)}</span>
                    <span class="evolucion-entry-status">OD: ${utils.escapeHTML(examen.od_resultado || 'N/A')} | OI: ${utils.escapeHTML(examen.oi_resultado || 'N/A')}</span>
                </div>
                <pre class="evolucion-entry-text">${utils.escapeHTML(textoEvolucion)}</pre>
            </div>
        `;
    }).join('');

    return contenido;
}

function generarTextoEvolucionResumida(examenData, numeroExamen) {
    const fecha = examenData.fecha_examen ? utils.formatearFecha(examenData.fecha_examen) : 'Sin fecha';
    const observacionesTexto = window.eoa && (typeof window.eoa.observacionesATextoPlano === 'function')
        ? window.eoa.observacionesATextoPlano(examenData.observaciones)
        : (examenData.observaciones || 'Sin observaciones');
    return `Evoluci��n ${numeroExamen} (${fecha})
OD: ${examenData.od_resultado || 'N/A'}
OI: ${examenData.oi_resultado || 'N/A'}
Observaciones: ${observacionesTexto || 'Sin observaciones'}`;
}


function obtenerEstadoEOAVisual(pacienteId) {
    const resumen = pacientesResumenExamen.get(pacienteId);
    if (!resumen || resumen.examCount === 0) {
        return {
            containerClass: '',
            pillTheme: 'pending',
            pillText: 'EOA pendiente'
        };
    }

    if (resumen.examCount === 1) {
        if (resumen.firstExamRefiere) {
            return {
                containerClass: 'referido',
                pillTheme: 'warning',
                pillText: 'EOA refiere (1er examen)'
            };
        }

        return {
            containerClass: 'completed',
            pillTheme: 'success',
            pillText: 'EOA pasa (1er examen)'
        };
    }

    if (resumen.lastExamRefiere) {
        return {
            containerClass: 'derivacion',
            pillTheme: 'danger',
            pillText: 'EOA refiere (2do examen)'
        };
    }

    return {
        containerClass: 'completed',
        pillTheme: 'success',
        pillText: 'EOA pasa (2do examen)'
    };
}

// Función para configurar event listeners
function setupEventListeners() {
    // Event listeners configurados manualmente en dashboard.html
    // Esta función se mantiene por compatibilidad pero está vacía
    console.log('Event listeners configurados manualmente en dashboard.html');
}

function bindReportesButton() {
    const btn = document.getElementById('reportesBtn');
    if (!btn) {
        setTimeout(bindReportesButton, 200);
        return;
    }
    if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            window.location.href = 'reportes.html';
        });
    }
}

// Función para abrir modal de registrar madre
function openMadreModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Limpiar formulario
        utils.limpiarFormulario('madreForm');
        
        // Enfocar primer campo
        setTimeout(() => {
            const rutInput = document.getElementById('rut');
            if (rutInput) {
                rutInput.focus();
            }
        }, 100);
    }
}

// Función para abrir modal de ver madres
async function openMadresModal() {
    const modal = document.getElementById('madresModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Cargar lista de madres
        await loadMadresList();
    }
}

// Función para cargar lista de pacientes
async function loadPacientesList(searchTerm = '', tipoPaciente = null) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            const pacientesListElement = document.getElementById('madresList');
            if (pacientesListElement) {
                pacientesListElement.innerHTML = '<p class="loading">Error de conexión</p>';
            }
            return;
        }
        
        let query = window.supabaseClient
            .from('pacientes')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Filtrar por tipo de paciente si se especifica
        if (tipoPaciente) {
            query = query.eq('tipo_paciente', tipoPaciente.toUpperCase());
        }
        
        // Aplicar filtro de búsqueda si existe
        if (searchTerm) {
            query = query.or(`rut.ilike.%${searchTerm}%,numero_ficha.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        const pacientesData = data || [];
        try {
            const resumenMap = await obtenerResumenExamenes(pacientesData.map(paciente => paciente.id));
            mergeResumenExamenes(resumenMap);
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes para la lista completa:', statusError);
        }
        
        displayPacientesList(pacientesData);
        
    } catch (error) {
        console.error('Error al cargar lista de pacientes:', error);
        const pacientesListElement = document.getElementById('madresList');
        if (pacientesListElement) {
            pacientesListElement.innerHTML = '<p class="loading">Error al cargar datos</p>';
        }
    }
}

// Función para cargar lista de madres (mantener compatibilidad)
async function loadMadresList(searchTerm = '') {
    return loadPacientesList(searchTerm, 'MADRE');
}

// Función para mostrar lista de pacientes
function displayPacientesList(pacientes) {
    const pacientesListElement = document.getElementById('madresList');
    
    if (!pacientesListElement) return;
    closeAllActionMenus();
    if (!pacientes || pacientes.length === 0) {
        pacientesTablaActual = [];
        pacientesListElement.innerHTML = '<p class="no-data">No se encontraron registros</p>';
        return;
    }
    
    pacientesTablaActual = pacientes.slice();
    
    const rowsHtml = pacientes.map(paciente => crearFilaPacienteTabla(paciente)).join('');
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
    
    pacientesListElement.innerHTML = `
        <div class="madres-table-wrapper">
            <table class="madres-table">
                <thead>${headHtml}</thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
    
    bindEventosTablaPacientes(pacientesListElement);
}

// Función para mostrar lista de madres (mantener compatibilidad)
function displayMadresList(madres) {
    return displayPacientesList(madres);
}

function crearFilaPacienteTabla(paciente) {
    const nombreCompleto = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado';
    const rutFormateado = utils.formatearRUT ? utils.formatearRUT(paciente.rut) : paciente.rut;
    const fechaParto = paciente.fecha_parto || paciente.fecha_nacimiento || paciente.created_at;
    const fechaPartoTexto = fechaParto ? utils.formatearFecha(fechaParto) : 'Sin registro';
    const examenes = obtenerExamenesDePaciente(paciente.id);
    const primerExamen = examenes[0] || null;
    const segundoExamen = examenes[1] || null;
    const primerFecha = primerExamen ? utils.formatearFecha(primerExamen.fecha_examen) : 'Sin registro';
    const segundoFecha = segundoExamen ? utils.formatearFecha(segundoExamen.fecha_examen) : 'Sin registro';
    const primerResultado = formatearResultadoExamen(primerExamen);
    const segundoResultado = formatearResultadoExamen(segundoExamen);
    const observacionesTexto = obtenerObservacionesPlanoTabla(examenes);
    const nombreConfirm = nombreCompleto.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    
    return `
        <tr data-madre-id="${paciente.id}">
            <td>${utils.escapeHTML(nombreCompleto)}</td>
            <td>${utils.escapeHTML(rutFormateado)}</td>
            <td>${utils.escapeHTML(paciente.numero_ficha || 'Sin ficha')}</td>
            <td>${utils.escapeHTML(fechaPartoTexto)}</td>
            <td>${utils.escapeHTML(primerFecha)}</td>
            <td class="resultado-col">${utils.escapeHTML(primerResultado)}</td>
            <td>${utils.escapeHTML(segundoFecha)}</td>
            <td class="resultado-col">${utils.escapeHTML(segundoResultado)}</td>
            <td class="observaciones-col">${utils.escapeHTML(observacionesTexto)}</td>
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

function obtenerExamenesDePaciente(pacienteId) {
    if (!pacienteId) {
        return [];
    }
    const resumen = pacientesResumenExamen.get(pacienteId);
    return resumen && Array.isArray(resumen.examenes) ? resumen.examenes : [];
}

function formatearResultadoExamen(examen) {
    if (!examen) {
        return 'Sin resultado';
    }
    const od = examen.od_resultado || 'N/A';
    const oi = examen.oi_resultado || 'N/A';
    return `OD: ${od} | OI: ${oi}`;
}

function obtenerObservacionesPlanoTabla(examenes = []) {
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return 'Sin observaciones';
    }
    const ultimoConObservaciones = [...examenes].reverse().find(examen => examen && examen.observaciones);
    if (!ultimoConObservaciones) {
        return 'Sin observaciones';
    }
    if (window.eoa && typeof window.eoa.observacionesATextoPlano === 'function') {
        return window.eoa.observacionesATextoPlano(ultimoConObservaciones.observaciones) || 'Sin observaciones';
    }
    return ultimoConObservaciones.observaciones || 'Sin observaciones';
}

function bindEventosTablaPacientes(container) {
    const filas = container.querySelectorAll('.madres-table tbody tr');
    filas.forEach(fila => {
        fila.addEventListener('click', async function() {
            const madreId = this.dataset.madreId;
            if (!madreId) return;
            try {
                if (window.dashboard && typeof window.dashboard.selectMadre === 'function') {
                    await window.dashboard.selectMadre(madreId);
                } else if (typeof selectMadre === 'function') {
                    await selectMadre(madreId);
                }
            } catch (error) {
                console.error('Error al abrir EOA desde la tabla:', error);
            }
        });
    });
    
    const actionButtons = container.querySelectorAll('.table-actions-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleActionsMenu(this);
        });
    });
    
    const actionMenuButtons = container.querySelectorAll('.table-actions-menu button');
    actionMenuButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const action = this.dataset.menuAction;
            const madreId = this.dataset.madreId;
            const nombreMadre = this.dataset.nombreMadre || '';
            closeAllActionMenus();
            if (!madreId) return;
            if (action === 'editar') {
                iniciarEdicionMadre(madreId);
            } else if (action === 'eliminar') {
                confirmarEliminacionMadre(madreId, nombreMadre);
            }
        });
    });
    
    const actionMenus = container.querySelectorAll('.table-actions-menu');
    actionMenus.forEach(menu => {
        menu.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
}

function toggleActionsMenu(button) {
    const menu = button.nextElementSibling;
    if (!menu) {
        return;
    }
    if (menu === activeActionMenu) {
        menu.classList.remove('open');
        activeActionMenu = null;
        return;
    }
    closeAllActionMenus();
    menu.classList.add('open');
    activeActionMenu = menu;
}

function closeAllActionMenus() {
    const menus = document.querySelectorAll('.table-actions-menu.open');
    menus.forEach(menu => menu.classList.remove('open'));
    activeActionMenu = null;
}

async function iniciarEdicionMadre(madreId) {
    if (!madreId) {
        return;
    }
    try {
        let paciente = pacientesTablaActual.find(item => item.id === madreId);
        if (!paciente && window.supabaseClient) {
            const { data, error } = await window.supabaseClient
                .from('pacientes')
                .select('*')
                .eq('id', madreId)
                .single();
            if (error) {
                throw error;
            }
            paciente = data;
        }
        if (!paciente) {
            throw new Error('Paciente no encontrado');
        }
        prepararFormularioMadreParaEdicion(paciente);
    } catch (error) {
        console.error('Error al iniciar edición de madre:', error);
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification('No se pudieron cargar los datos de la madre', 'error');
        }
    }
}

function prepararFormularioMadreParaEdicion(paciente) {
    if (!paciente) {
        return;
    }
    if (typeof resetModalState === 'function') {
        resetModalState();
    } else if (typeof utils !== 'undefined' && utils.limpiarFormulario) {
        utils.limpiarFormulario('madreForm');
    }
    
    const selector = document.getElementById('tipoRegistroSelector');
    if (selector) {
        selector.style.display = 'none';
    }
    
    const madreContainer = document.getElementById('madreFormContainer');
    const bebeContainer = document.getElementById('bebeFormContainer');
    if (madreContainer) {
        madreContainer.style.display = 'block';
    }
    if (bebeContainer) {
        bebeContainer.style.display = 'none';
    }
    
    const tituloModal = document.getElementById('modalTitle');
    if (tituloModal) {
        tituloModal.textContent = 'Editar Madre';
    }
    
    const modeInput = document.getElementById('madreFormMode');
    const editIdInput = document.getElementById('madreEditId');
    if (modeInput) {
        modeInput.value = 'edit';
    }
    if (editIdInput) {
        editIdInput.value = paciente.id;
    }
    const btnText = document.querySelector('#guardarMadreBtn .btn-text');
    if (btnText) {
        btnText.textContent = 'Actualizar Madre';
    }
    
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.value = utils.formatearRUT ? utils.formatearRUT(paciente.rut) : paciente.rut;
    }
    const nombreInput = document.getElementById('nombreMadre');
    if (nombreInput) {
        nombreInput.value = paciente.nombre || '';
    }
    const apellidoInput = document.getElementById('apellidoMadre');
    if (apellidoInput) {
        apellidoInput.value = paciente.apellido || '';
    }
    const fichaInput = document.getElementById('numeroFicha');
    if (fichaInput) {
        fichaInput.value = paciente.numero_ficha || '';
    }
    const salaInput = document.getElementById('sala');
    if (salaInput) {
        salaInput.value = paciente.sala || '';
    }
    const camaInput = document.getElementById('cama');
    if (camaInput) {
        camaInput.value = paciente.cama || '';
    }
    const hijosInput = document.getElementById('cantidadHijos');
    if (hijosInput) {
        hijosInput.value = paciente.cantidad_hijos ?? '';
    }
    
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    setTimeout(() => {
        if (nombreInput) {
            nombreInput.focus();
        }
    }, 200);
}

function actualizarEstadoVisualMadre(madreId) {
    if (!madreId) {
        return;
    }

    const estado = obtenerEstadoEOAVisual(madreId);

    const recentItem = document.querySelector(`.recent-item[data-madre-id="${madreId}"]`);
    if (recentItem) {
        recentItem.classList.remove('completed', 'referido');
        if (estado.containerClass) {
            recentItem.classList.add(estado.containerClass);
        }
        const pill = recentItem.querySelector('.recent-item-status .status-pill');
        if (pill) {
            pill.textContent = estado.pillText;
            pill.classList.remove('success', 'warning', 'pending');
            pill.classList.add(estado.pillTheme);
        } else {
            const statusContainer = recentItem.querySelector('.recent-item-status');
            if (statusContainer) {
                statusContainer.innerHTML = `<span class="status-pill ${estado.pillTheme}">${estado.pillText}</span>`;
            }
        }
    }

    const madreItem = document.querySelector(`.madre-item[data-madre-id="${madreId}"]`);
    if (madreItem) {
        madreItem.classList.remove('completed', 'referido');
        if (estado.containerClass) {
            madreItem.classList.add(estado.containerClass);
        }
        const pill = madreItem.querySelector('.madre-item-status .status-pill');
        if (pill) {
            pill.textContent = estado.pillText;
            pill.classList.remove('success', 'warning', 'pending');
            pill.classList.add(estado.pillTheme);
        } else {
            const statusContainer = madreItem.querySelector('.madre-item-status');
            if (statusContainer) {
                statusContainer.innerHTML = `<span class="status-pill ${estado.pillTheme}">${estado.pillText}</span>`;
            }
        }
    }
}

function markMadreConExamen(pacienteId, examenData = null) {
    if (!pacienteId) {
        return;
    }

    if (examenData) {
        let resumen = pacientesResumenExamen.get(pacienteId);
        if (!resumen) {
            resumen = {
                examenes: [],
                examCount: 0,
                firstExam: null,
                lastExam: null,
                firstExamRefiere: false,
                lastExamRefiere: false
            };
        }
        resumen.examenes.push(examenData);
        resumen.examenes.sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
        resumen.examCount = resumen.examenes.length;
        resumen.firstExam = resumen.examenes[0];
        resumen.lastExam = resumen.examenes[resumen.examenes.length - 1];
        resumen.firstExamRefiere = resultadoRefiere(resumen.firstExam);
        resumen.lastExamRefiere = resultadoRefiere(resumen.lastExam);
        pacientesResumenExamen.set(pacienteId, resumen);
    }

    pacienteEvolucionCache.delete(pacienteId);
    recentPatients = recentPatients.map(paciente => paciente.id === pacienteId ? { ...paciente } : paciente);
    actualizarEstadoVisualMadre(pacienteId);
}

async function confirmarEliminacionMadre(madreId, madreNombre = '') {
    if (!madreId) {
        return;
    }

    const nombreMostrar = madreNombre || 'esta madre';
    const confirmMessage = `¿Eliminar el registro de ${nombreMostrar}? Esta acción no se puede deshacer.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
        return;
    }

    try {
        if (!window.madres || typeof window.madres.eliminarMadre !== 'function') {
            throw new Error('Función de eliminación no disponible');
        }

        utils.showNotification('Eliminando registro...', 'info');
        const result = await window.madres.eliminarMadre(madreId);

        if (!result.success) {
            throw new Error(result.error || 'No se pudo eliminar el registro');
        }

        utils.showNotification('Madre eliminada correctamente', 'success');
        const searchMadresInput = document.getElementById('searchMadres');
        const currentSearch = searchMadresInput ? searchMadresInput.value : '';
        await loadMadresList(currentSearch);
        await loadRecentMothers();
    } catch (error) {
        console.error('Error al eliminar madre:', error);
        utils.showNotification(error.message || 'Error al eliminar madre', 'error');
    }
}

// Función para seleccionar un paciente
async function selectMadre(pacienteId) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            utils.showNotification('Error de conexión con la base de datos', 'error');
            return;
        }
        
        // Cargar datos del paciente
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .single();
        
        if (error) {
            throw error;
        }
        
        // Cerrar modal de madres
        closeMadresModal();
        
        // Abrir modal de EOA con los datos del paciente
        openEoaModal(data);
        
    } catch (error) {
        console.error('Error al seleccionar paciente:', error);
        utils.showNotification('Error al cargar datos del paciente', 'error');
    }
}

// Función para manejar submit del formulario de madre
async function handleMadreFormSubmit(e) {
    e.preventDefault();
    
    // Esta función está manejada por el código en dashboard.html
    console.log('Formulario manejado por dashboard.html');
}

// Función para cerrar modal
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    if (typeof resetModalState === 'function') {
        resetModalState();
    }
}

// Función para cerrar modal de madres
function closeMadresModal() {
    const modal = document.getElementById('madresModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Función para configurar PWA
async function setupPWA() {
    // Configurar service worker para GitHub Pages
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './'
            });
            console.log('Service Worker registrado para GitHub Pages:', registration);
            
            // No inicializar comunicación para evitar errores en GitHub Pages
            console.log('Comunicación con Service Worker deshabilitada para GitHub Pages');
            
        } catch (error) {
            console.warn('Error al registrar Service Worker en GitHub Pages:', error);
        }
    }
    
    // Detectar si es PWA instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Aplicación ejecutándose como PWA');
    }
}

// Función para buscar madres (debounced)
const searchMadres = utils.debounce(async function(searchTerm) {
    await loadMadresList(searchTerm);
}, 300);

// Función para configurar limpieza automática a medianoche
function setupMidnightCleanup() {
    console.log('🕐 Configurando limpieza automática a medianoche...');
    
    // Función para verificar si es medianoche y limpiar registros recientes
    function checkAndCleanup() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Verificar si es medianoche (00:00:00)
        if (hours === 0 && minutes === 0 && seconds < 5) {
            console.log('🌙 Es medianoche, limpiando registros recientes...');
            clearRecentMothersDisplay();
        }
    }
    
    // Verificar cada minuto
    midnightCleanupInterval = setInterval(checkAndCleanup, 60000); // 60 segundos
    
    // También verificar inmediatamente
    checkAndCleanup();
}

// Función para limpiar la visualización de registros recientes
function clearRecentMothersDisplay() {
    const recentPatientsElement = document.getElementById('recentMothers');
    if (recentPatientsElement) {
        recentPatientsElement.innerHTML = '<p class="no-data">No hay registros recientes del día</p>';
        console.log('✅ Visualización de registros recientes limpiada');
    }
    
    // Limpiar también el array de datos
    recentPatients = [];
    pacientesResumenExamen.clear();
}

// Función para detener la limpieza automática (útil para pruebas)
function stopMidnightCleanup() {
    if (midnightCleanupInterval) {
        clearInterval(midnightCleanupInterval);
        midnightCleanupInterval = null;
        console.log('⏹️ Limpieza automática detenida');
    }
}


document.addEventListener('click', function(event) {
    if (!event.target.closest('.table-actions')) {
        closeAllActionMenus();
    }
});


// Event listeners globales
document.addEventListener('DOMContentLoaded', function() {
    // Configurar búsqueda de madres
    const searchMadresInput = document.getElementById('searchMadres');
    if (searchMadresInput) {
        searchMadresInput.addEventListener('input', function(e) {
            searchMadres(e.target.value);
        });
    }

    // Configurar limpieza automática a medianoche
    setupMidnightCleanup();

    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeMadresModal();
            if (typeof closeEoaModal === 'function') {
                closeEoaModal();
            }
        }
    });
    
    // Cerrar modales haciendo clic fuera
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
            setTimeout(() => {
                e.target.style.display = 'none';
            }, 300);
        }
    });
});

bindReportesButton();

// Exportar funciones para uso en otros módulos
window.dashboard = {
    initDashboard,
    loadRecentPatients,
    loadPacientesList,
    loadRecentMothers: loadRecentPatients, // Mantener compatibilidad
    loadMadresList,    // Mantener compatibilidad
    openMadreModal,
    openMadresModal,
    selectMadre,
    closeModal,
    closeMadresModal,
    markMadreConExamen,
    confirmarEliminacionMadre,
    startEditarMadre: iniciarEdicionMadre,
    setupMidnightCleanup,
    stopMidnightCleanup,
    clearRecentMothersDisplay
};
