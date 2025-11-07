// Funcionalidad del Dashboard

// Variables globales
let recentMothers = [];
const madresResumenExamen = new Map();

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
    resumenMap.forEach((resumen, madreId) => {
        madresResumenExamen.set(madreId, resumen);
    });
}

async function obtenerResumenExamenes(madreIds = []) {
    if (!Array.isArray(madreIds) || madreIds.length === 0) {
        return new Map();
    }

    if (!window.supabaseClient) {
        return new Map();
    }

    const uniqueIds = [...new Set(madreIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return new Map();
    }

    const { data, error } = await window.supabaseClient
        .from('examenes_eoa')
        .select('id,madre_id,od_resultado,oi_resultado,fecha_examen')
        .in('madre_id', uniqueIds)
        .order('fecha_examen', { ascending: true });

    if (error) {
        throw error;
    }

    const agrupados = new Map();
    (data || []).forEach(examen => {
        if (!agrupados.has(examen.madre_id)) {
            agrupados.set(examen.madre_id, []);
        }
        agrupados.get(examen.madre_id).push(examen);
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
        await loadRecentMothers();
        
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
async function loadRecentMothers() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            const recentMothersElement = document.getElementById('recentMothers');
            if (recentMothersElement) {
                recentMothersElement.innerHTML = '<p class="no-data">Error de conexión</p>';
            }
            return;
        }
        
        const { data, error } = await window.supabaseClient
            .from('madres')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            throw error;
        }
        
        const madresData = data || [];
        try {
            const resumenMap = await obtenerResumenExamenes(madresData.map(madre => madre.id));
            mergeResumenExamenes(resumenMap);
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes EOA para recientes:', statusError);
        }

        recentMothers = madresData.slice();
        displayRecentMothers();
        
    } catch (error) {
        console.error('Error al cargar registros recientes:', error);
        const recentMothersElement = document.getElementById('recentMothers');
        if (recentMothersElement) {
            recentMothersElement.innerHTML = '<p class="no-data">Error al cargar registros</p>';
        }
    }
}

// Función para mostrar registros recientes
function displayRecentMothers() {
    const recentMothersElement = document.getElementById('recentMothers');
    
    if (!recentMothersElement) return;
    
    if (recentMothers.length === 0) {
        recentMothersElement.innerHTML = '<p class="no-data">No hay registros recientes</p>';
        return;
    }
    
    const html = recentMothers.map(madre => {
        const nombreCompleto = [madre.nombre, madre.apellido].filter(Boolean).join(' ');
        const titulo = nombreCompleto ? nombreCompleto.toUpperCase() : utils.formatearRUT(madre.rut);
        const subtitulo = nombreCompleto ? utils.formatearRUT(madre.rut) : '';
        const estado = obtenerEstadoEOAVisual(madre.id);
        const itemClasses = ['recent-item'];
        if (estado.containerClass) {
            itemClasses.push(estado.containerClass);
        }
        const statusClass = `status-pill ${estado.pillTheme}`;
        const statusText = estado.pillText;
        
        return `
        <div class="${itemClasses.join(' ')}" data-madre-id="${madre.id}">
            <div class="recent-item-info">
                <div class="recent-item-rut">${utils.escapeHTML(titulo)}</div>
                ${subtitulo ? `<div class="recent-item-subtitle">${utils.escapeHTML(subtitulo)}</div>` : ''}
                <div class="recent-item-details">
                    Ficha: ${utils.escapeHTML(madre.numero_ficha)} |
                    Sala: ${utils.escapeHTML(madre.sala)} |
                    Cama: ${utils.escapeHTML(madre.cama)} |
                    Hijos: ${utils.escapeHTML((madre.cantidad_hijos ?? 'N/A').toString())}
                </div>
                <div class="recent-item-status">
                    <span class="${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="recent-item-date">
                ${utils.formatearFecha(madre.created_at)}
            </div>
            <div class="recent-item-actions">
                <button class="btn btn-secondary btn-sm" data-action="abrir-eoa" data-madre-id="${madre.id}">
                    Ver plantilla EOA
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    recentMothersElement.innerHTML = html;
    
    // Agregar listeners para abrir la plantilla EOA
    const recentItems = recentMothersElement.querySelectorAll('.recent-item');
    recentItems.forEach(item => {
        const madreId = item.getAttribute('data-madre-id');
        if (!madreId) return;
        
        const openMadre = async (event) => {
            if (event) {
                event.preventDefault();
            }
            if (window.dashboard && typeof window.dashboard.selectMadre === 'function') {
                await window.dashboard.selectMadre(madreId);
            }
        };
        
        item.addEventListener('click', openMadre);
        
        const actionButton = item.querySelector('button[data-action="abrir-eoa"]');
        if (actionButton) {
            actionButton.addEventListener('click', async function(e) {
                e.stopPropagation();
                e.preventDefault();
                await openMadre(e);
            });
        }
    });
}

function obtenerEstadoEOAVisual(madreId) {
    const resumen = madresResumenExamen.get(madreId);
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

function describirExamenParaReporte(examen) {
    if (!examen) {
        return '';
    }

    const partes = [
        `OD: ${examen.od_resultado || '-'}`,
        `OI: ${examen.oi_resultado || '-'}`
    ];

    if (examen.fecha_examen) {
        partes.push(utils.formatearFecha(examen.fecha_examen));
    }

    return partes.join(' | ');
}

function compilarObservaciones(firstExam, secondExam) {
    const observaciones = [];
    if (firstExam && firstExam.observaciones) {
        observaciones.push(`1er: ${firstExam.observaciones}`);
    }
    if (secondExam && secondExam.observaciones) {
        observaciones.push(`2do: ${secondExam.observaciones}`);
    }
    return observaciones.join(' | ');
}

// Función para configurar event listeners
function setupEventListeners() {
    // Event listeners configurados manualmente en dashboard.html
    // Esta función se mantiene por compatibilidad pero está vacía
    console.log('Event listeners configurados manualmente en dashboard.html');
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

// Función para cargar lista de madres
async function loadMadresList(searchTerm = '') {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            const madresListElement = document.getElementById('madresList');
            if (madresListElement) {
                madresListElement.innerHTML = '<p class="loading">Error de conexión</p>';
            }
            return;
        }
        
        let query = window.supabaseClient
            .from('madres')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Aplicar filtro de búsqueda si existe
        if (searchTerm) {
            query = query.or(`rut.ilike.%${searchTerm}%,numero_ficha.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        const madresData = data || [];
        try {
            const resumenMap = await obtenerResumenExamenes(madresData.map(madre => madre.id));
            mergeResumenExamenes(resumenMap);
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes para la lista completa:', statusError);
        }
        
        displayMadresList(madresData);
        
    } catch (error) {
        console.error('Error al cargar lista de madres:', error);
        const madresListElement = document.getElementById('madresList');
        if (madresListElement) {
            madresListElement.innerHTML = '<p class="loading">Error al cargar datos</p>';
        }
    }
}

// Función para mostrar lista de madres
function displayMadresList(madres) {
    const madresListElement = document.getElementById('madresList');
    
    if (!madresListElement) return;
    
    if (madres.length === 0) {
        madresListElement.innerHTML = '<p class="no-data">No se encontraron registros</p>';
        return;
    }
    
    const html = madres.map(madre => {
        const estado = obtenerEstadoEOAVisual(madre.id);
        const itemClasses = ['madre-item'];
        if (estado.containerClass) {
            itemClasses.push(estado.containerClass);
        }
        const statusClass = `status-pill ${estado.pillTheme}`;
        const statusText = estado.pillText;
        const nombreCompletoPlano = [madre.nombre, madre.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado';
        const nombreConfirm = nombreCompletoPlano.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');

        return `
        <div class="${itemClasses.join(' ')}" data-madre-id="${madre.id}" onclick="selectMadre('${madre.id}')">
            <div class="madre-item-header">
                <div class="madre-item-rut">${utils.escapeHTML([madre.nombre, madre.apellido].filter(Boolean).join(' ') || 'Nombre no registrado')}</div>
                <div class="madre-item-identificacion">${utils.escapeHTML(utils.formatearRUT(madre.rut))}</div>
                <div class="madre-item-ficha">Ficha: ${utils.escapeHTML(madre.numero_ficha)}</div>
            </div>
            <div class="madre-item-status">
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="madre-item-details">
                <div class="madre-item-detail">
                    <strong>Sala:</strong> ${utils.escapeHTML(madre.sala)}
                </div>
                <div class="madre-item-detail">
                    <strong>Cama:</strong> ${utils.escapeHTML(madre.cama)}
                </div>
                <div class="madre-item-detail">
                    <strong>Hijos:</strong> ${utils.escapeHTML((madre.cantidad_hijos ?? 'N/A').toString())}
                </div>
                <div class="madre-item-detail">
                    <strong>Registro:</strong> ${utils.formatearFecha(madre.created_at)}
                </div>
            </div>
            <div class="madre-item-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectMadre('${madre.id}')">
                    Realizar EOA
                </button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); dashboard.confirmarEliminacionMadre('${madre.id}', '${nombreConfirm}')">
                    Eliminar
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    madresListElement.innerHTML = html;
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

function markMadreConExamen(madreId, examenData = null) {
    if (!madreId) {
        return;
    }

    if (examenData) {
        let resumen = madresResumenExamen.get(madreId);
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
        madresResumenExamen.set(madreId, resumen);
    }

    recentMothers = recentMothers.map(madre => madre.id === madreId ? { ...madre } : madre);
    actualizarEstadoVisualMadre(madreId);
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

async function exportarReporteEOAExcel() {
    const buttonId = 'exportExcelBtn';
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        if (typeof XLSX === 'undefined') {
            throw new Error('Librería XLSX no disponible');
        }

        utils.toggleButtonLoader(buttonId, true);

        const { data, error } = await window.supabaseClient
            .from('madres')
            .select(`
                id,
                nombre,
                apellido,
                rut,
                numero_ficha,
                examenes_eoa (
                    od_resultado,
                    oi_resultado,
                    observaciones,
                    fecha_examen
                )
            `)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        const headers = ['N° Ficha', 'RUT', 'Nombre de la Madre', 'Primer Examen', 'Segundo Examen', 'Observaciones'];
        const rows = (data || []).map(madre => {
            const examenesOrdenados = (madre.examenes_eoa || []).slice().sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
            const primerExamen = examenesOrdenados[0] || null;
            const segundoExamen = examenesOrdenados[1] || null;

            return [
                madre.numero_ficha || '',
                utils.formatearRUT(madre.rut),
                [madre.nombre, madre.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado',
                describirExamenParaReporte(primerExamen),
                describirExamenParaReporte(segundoExamen),
                compilarObservaciones(primerExamen, segundoExamen)
            ];
        });

        const aoaData = [headers, ...rows];
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte EOA');

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `reporte_eoa_${today}.xlsx`);
        utils.showNotification('Reporte Excel generado correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar reporte EOA:', error);
        utils.showNotification(error.message || 'Error al exportar reporte', 'error');
    } finally {
        utils.toggleButtonLoader(buttonId, false);
    }
}

// Función para seleccionar una madre
async function selectMadre(madreId) {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase no está inicializado');
            utils.showNotification('Error de conexión con la base de datos', 'error');
            return;
        }
        
        // Cargar datos de la madre
        const { data, error } = await window.supabaseClient
            .from('madres')
            .select('*')
            .eq('id', madreId)
            .single();
        
        if (error) {
            throw error;
        }
        
        // Cerrar modal de madres
        closeMadresModal();
        
        // Abrir modal de EOA con los datos de la madre
        openEoaModal(data);
        
    } catch (error) {
        console.error('Error al seleccionar madre:', error);
        utils.showNotification('Error al cargar datos de la madre', 'error');
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

// Event listeners globales
document.addEventListener('DOMContentLoaded', function() {
    // Configurar búsqueda de madres
    const searchMadresInput = document.getElementById('searchMadres');
    if (searchMadresInput) {
        searchMadresInput.addEventListener('input', function(e) {
            searchMadres(e.target.value);
        });
    }

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportarReporteEOAExcel();
        });
    }
    
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

// Exportar funciones para uso en otros módulos
window.dashboard = {
    initDashboard,
    loadRecentMothers,
    loadMadresList,
    openMadreModal,
    openMadresModal,
    selectMadre,
    closeModal,
    closeMadresModal,
    markMadreConExamen,
    confirmarEliminacionMadre,
    exportarReporteEOAExcel
};
