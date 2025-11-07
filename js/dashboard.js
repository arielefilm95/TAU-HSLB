// Funcionalidad del Dashboard

// Variables globales
let recentMothers = [];

async function obtenerMadresConExamenes(madreIds = []) {
    if (!Array.isArray(madreIds) || madreIds.length === 0) {
        return new Set();
    }

    if (!window.supabaseClient) {
        return new Set();
    }

    const uniqueIds = [...new Set(madreIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return new Set();
    }

    const { data, error } = await window.supabaseClient
        .from('examenes_eoa')
        .select('madre_id')
        .in('madre_id', uniqueIds);

    if (error) {
        throw error;
    }

    const madresConExamen = new Set();
    (data || []).forEach(item => {
        if (item && item.madre_id) {
            madresConExamen.add(item.madre_id);
        }
    });

    return madresConExamen;
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
        let madresConExamen = new Set();

        try {
            madresConExamen = await obtenerMadresConExamenes(madresData.map(madre => madre.id));
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes EOA para recientes:', statusError);
        }

        recentMothers = madresData.map(madre => ({
            ...madre,
            has_examen_eoa: madresConExamen.has(madre.id)
        }));
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
        const itemClasses = ['recent-item'];
        if (madre.has_examen_eoa) {
            itemClasses.push('completed');
        }
        const statusClass = madre.has_examen_eoa ? 'status-pill success' : 'status-pill warning';
        const statusText = madre.has_examen_eoa ? 'EOA registrado' : 'EOA pendiente';
        
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
        let madresConExamen = new Set();
        try {
            madresConExamen = await obtenerMadresConExamenes(madresData.map(madre => madre.id));
        } catch (statusError) {
            console.warn('No se pudo obtener estado de exámenes para la lista completa:', statusError);
        }
        
        displayMadresList(madresData, madresConExamen);
        
    } catch (error) {
        console.error('Error al cargar lista de madres:', error);
        const madresListElement = document.getElementById('madresList');
        if (madresListElement) {
            madresListElement.innerHTML = '<p class="loading">Error al cargar datos</p>';
        }
    }
}

// Función para mostrar lista de madres
function displayMadresList(madres, madresConExamen = new Set()) {
    const madresListElement = document.getElementById('madresList');
    
    if (!madresListElement) return;
    
    if (madres.length === 0) {
        madresListElement.innerHTML = '<p class="no-data">No se encontraron registros</p>';
        return;
    }
    
    const html = madres.map(madre => {
        const hasExamen = madresConExamen.has(madre.id);
        const itemClasses = ['madre-item'];
        if (hasExamen) {
            itemClasses.push('completed');
        }
        const statusClass = hasExamen ? 'status-pill success' : 'status-pill warning';
        const statusText = hasExamen ? 'EOA registrado' : 'EOA pendiente';

        return `
        <div class="${itemClasses.join(' ')}" onclick="selectMadre('${madre.id}')">
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
            </div>
        </div>
    `;
    }).join('');
    
    madresListElement.innerHTML = html;
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
    closeMadresModal
};
