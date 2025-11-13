// Funcionalidad del Dashboard

// Variables globales
let recentPatients = [];
const pacientesResumenExamen = new Map();
let midnightCleanupInterval = null;

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
    });
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
    
    if (pacientes.length === 0) {
        pacientesListElement.innerHTML = '<p class="no-data">No se encontraron registros</p>';
        return;
    }
    
    const html = pacientes.map(paciente => {
        const estado = obtenerEstadoEOAVisual(paciente.id);
        const itemClasses = ['madre-item-simple'];
        if (estado.containerClass) {
            itemClasses.push(estado.containerClass);
        }
        const statusClass = `status-pill ${estado.pillTheme}`;
        const statusText = estado.pillText;
        const nombreCompletoPlano = [paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado';
        const nombreConfirm = nombreCompletoPlano.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');

        return `
        <div class="${itemClasses.join(' ')}" data-madre-id="${paciente.id}" onclick="selectMadre('${paciente.id}')">
            <div class="madre-item-main">
                <div class="madre-item-info">
                    <div class="madre-item-nombre">${utils.escapeHTML([paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Nombre no registrado')}</div>
                    <div class="madre-item-rut">${utils.escapeHTML(utils.formatearRUT(paciente.rut))}</div>
                </div>
                <div class="madre-item-ubicacion">
                    <span class="ubicacion-badge">${utils.escapeHTML(paciente.sala || 'Sala')}</span>
                    <span class="ubicacion-badge">${utils.escapeHTML(paciente.cama || 'Cama')}</span>
                </div>
                <div class="madre-item-estado">
                    <span class="${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="madre-item-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectMadre('${paciente.id}')">
                    Realizar EOA
                </button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); dashboard.confirmarEliminacionMadre('${paciente.id}', '${nombreConfirm}')">
                    Eliminar
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    pacientesListElement.innerHTML = html;
}

// Función para mostrar lista de madres (mantener compatibilidad)
function displayMadresList(madres) {
    return displayPacientesList(madres);
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
    setupMidnightCleanup,
    stopMidnightCleanup,
    clearRecentMothersDisplay
};
