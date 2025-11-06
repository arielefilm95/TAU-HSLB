// Funcionalidad del Dashboard

// Variables globales
let recentMothers = [];

// Función para inicializar el dashboard
async function initDashboard() {
    try {
        // Verificar autenticación
        const isAuth = await auth.requireAuth();
        if (!isAuth) return;
        
        // Obtener usuario actual
        const user = auth.getCurrentUser();
        
        // Cargar información del usuario
        await loadUserInfo();
        
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

// Función para cargar información del usuario
async function loadUserInfo() {
    try {
        const user = auth.getCurrentUser();
        if (!user) return;
        
        // Obtener perfil del usuario
        const profile = await auth.getUserProfile(user.id);
        
        if (profile) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = profile.nombre_usuario || 'Usuario';
            }
        } else {
            // Si no hay perfil, usar el email
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.email || 'Usuario';
            }
        }
        
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
    }
}

// Función para cargar registros recientes
async function loadRecentMothers() {
    try {
        if (!auth.supabase) {
            console.error('Supabase no está inicializado');
            const recentMothersElement = document.getElementById('recentMothers');
            if (recentMothersElement) {
                recentMothersElement.innerHTML = '<p class="no-data">Error de conexión</p>';
            }
            return;
        }
        
        const { data, error } = await auth.supabase
            .from('madres')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            throw error;
        }
        
        recentMothers = data || [];
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
    
    const html = recentMothers.map(madre => `
        <div class="recent-item">
            <div class="recent-item-info">
                <div class="recent-item-rut">${utils.escapeHTML(utils.formatearRUT(madre.rut))}</div>
                <div class="recent-item-details">
                    Ficha: ${utils.escapeHTML(madre.numero_ficha)} | 
                    Sala: ${utils.escapeHTML(madre.sala)} | 
                    Cama: ${utils.escapeHTML(madre.cama)}
                </div>
            </div>
            <div class="recent-item-date">
                ${utils.formatearFecha(madre.created_at)}
            </div>
        </div>
    `).join('');
    
    recentMothersElement.innerHTML = html;
}

// Función para configurar event listeners
function setupEventListeners() {
    // Botón registrar madre
    const registrarMadreBtn = document.getElementById('registrarMadreBtn');
    if (registrarMadreBtn) {
        registrarMadreBtn.addEventListener('click', openMadreModal);
    }
    
    // Botón ver madres
    const verMadresBtn = document.getElementById('verMadresBtn');
    if (verMadresBtn) {
        verMadresBtn.addEventListener('click', openMadresModal);
    }
    
    // Botón cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', auth.logout);
    }
    
    // Formulario de madre
    const madreForm = document.getElementById('madreForm');
    if (madreForm) {
        madreForm.addEventListener('submit', handleMadreFormSubmit);
    }
    
    // Formatear RUT en tiempo real
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\./g, '').replace('-', '');
            
            // Limitar longitud
            if (value.length > 9) {
                value = value.slice(0, 9);
            }
            
            // Formatear mientras escribe
            if (value.length > 1) {
                const numero = value.slice(0, -1);
                const dv = value.slice(-1);
                
                let numeroFormateado = '';
                let contador = 0;
                
                for (let i = numero.length - 1; i >= 0; i--) {
                    numeroFormateado = numero.charAt(i) + numeroFormateado;
                    contador++;
                    
                    if (contador === 3 && i !== 0) {
                        numeroFormateado = '.' + numeroFormateado;
                        contador = 0;
                    }
                }
                
                e.target.value = numeroFormateado + '-' + dv.toUpperCase();
            } else {
                e.target.value = value.toUpperCase();
            }
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

// Función para cargar lista de madres
async function loadMadresList(searchTerm = '') {
    try {
        if (!auth.supabase) {
            console.error('Supabase no está inicializado');
            const madresListElement = document.getElementById('madresList');
            if (madresListElement) {
                madresListElement.innerHTML = '<p class="loading">Error de conexión</p>';
            }
            return;
        }
        
        let query = auth.supabase
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
        
        displayMadresList(data || []);
        
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
    
    const html = madres.map(madre => `
        <div class="madre-item" onclick="selectMadre('${madre.id}')">
            <div class="madre-item-header">
                <div class="madre-item-rut">${utils.escapeHTML(utils.formatearRUT(madre.rut))}</div>
                <div class="madre-item-ficha">Ficha: ${utils.escapeHTML(madre.numero_ficha)}</div>
            </div>
            <div class="madre-item-details">
                <div class="madre-item-detail">
                    <strong>Sala:</strong> ${utils.escapeHTML(madre.sala)}
                </div>
                <div class="madre-item-detail">
                    <strong>Cama:</strong> ${utils.escapeHTML(madre.cama)}
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
    `).join('');
    
    madresListElement.innerHTML = html;
}

// Función para seleccionar una madre
async function selectMadre(madreId) {
    try {
        if (!auth.supabase) {
            console.error('Supabase no está inicializado');
            utils.showNotification('Error de conexión con la base de datos', 'error');
            return;
        }
        
        // Cargar datos de la madre
        const { data, error } = await auth.supabase
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
    
    // Validar formulario
    if (!utils.validarFormulario('madreForm')) {
        return;
    }
    
    // Obtener datos del formulario
    const formData = {
        rut: document.getElementById('rut').value.replace(/\./g, '').replace('-', ''),
        numero_ficha: document.getElementById('numeroFicha').value.trim(),
        sala: document.getElementById('sala').value.trim(),
        cama: document.getElementById('cama').value.trim(),
        usuario_id: auth.getCurrentUser().id
    };
    
    // Mostrar loader
    utils.toggleButtonLoader('guardarMadreBtn', true);
    
    try {
        if (!auth.supabase) {
            console.error('Supabase no está inicializado');
            utils.showNotification('Error de conexión con la base de datos', 'error');
            return;
        }
        
        // Insertar en Supabase
        const { data, error } = await auth.supabase
            .from('madres')
            .insert([formData])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Éxito
        utils.showNotification('Madre registrada exitosamente', 'success');
        closeModal();
        
        // Recargar registros recientes
        await loadRecentMothers();
        
    } catch (error) {
        console.error('Error al registrar madre:', error);
        
        if (error.code === '23505') {
            utils.showNotification('El RUT ya está registrado', 'error');
        } else {
            utils.showNotification('Error al registrar madre', 'error');
        }
    } finally {
        utils.toggleButtonLoader('guardarMadreBtn', false);
    }
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
    // Registrar service worker si está disponible
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registrado:', registration);
            
            // Inicializar comunicación mejorada
            if (window.swComms) {
                await window.swComms.init();
                
                // Escuchar mensajes del Service Worker a través del módulo
                window.addEventListener('swMessage', event => {
                    console.log('Mensaje recibido del Service Worker:', event.detail);
                });
                
                // Enviar mensaje de inicialización usando el módulo
                await window.swComms.init();
            } else {
                // Fallback si el módulo no está disponible
                navigator.serviceWorker.addEventListener('message', event => {
                    console.log('Mensaje recibido del Service Worker:', event.data);
                });
                
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'INIT',
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.log('Error al registrar Service Worker:', error);
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
    openMadreModal,
    openMadresModal,
    selectMadre,
    closeModal,
    closeMadresModal
};