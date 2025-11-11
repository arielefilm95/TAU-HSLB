// Configuración de autenticación con Supabase

// Obtener credenciales desde el archivo de configuración
let SUPABASE_URL, SUPABASE_ANON_KEY;

// Función para cargar configuración de Supabase
function loadSupabaseConfig() {
    try {
        // Intentar obtener desde el archivo de configuración
        if (window.supabaseConfig) {
            SUPABASE_URL = window.supabaseConfig.getSupabaseUrl();
            SUPABASE_ANON_KEY = window.supabaseConfig.getSupabaseAnonKey();
            console.log('✅ Configuración de Supabase cargada desde config/supabase-config.js');
        } else {
            // Valores por defecto (fallback)
            SUPABASE_URL = 'https://oywepfjbzvnzvcnqtlnv.supabase.co';
            SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95d2VwZmpienZuenZjbnF0bG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTg0NzgsImV4cCI6MjA3NzkzNDQ3OH0.nnJ3tbgoWdu1-qcnpZwDK6W_WQSDmVFU_Hf-5XCpDo4';
            console.log('⚠️ Usando configuración por defecto de Supabase');
        }
    } catch (error) {
        console.error('❌ Error al cargar configuración de Supabase:', error);
        // Valores por defecto en caso de error
        SUPABASE_URL = 'https://oywepfjbzvnzvcnqtlnv.supabase.co';
        SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95d2VwZmpienZuenZjbnF0bG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTg0NzgsImV4cCI6MjA3NzkzNDQ3OH0.nnJ3tbgoWdu1-qcnpZwDK6W_WQSDmVFU_Hf-5XCpDo4';
    }
}

// Variable global para el cliente de Supabase
let supabaseClient = null;

// Función para inicializar Supabase
function initializeSupabase() {
    try {
        // Cargar configuración antes de inicializar
        loadSupabaseConfig();
        
        if (typeof window.supabase !== 'undefined') {
            // Obtener opciones de configuración si están disponibles
            const options = window.supabaseConfig ? {
                auth: {
                    persistSession: window.supabaseConfig.AUTH.SESSION.persistSession,
                    detectSessionInUrl: window.supabaseConfig.AUTH.SESSION.detectSessionInUrl,
                    redirectTo: window.supabaseConfig.isProduction()
                        ? 'https://arielefilm95.github.io/TAU-HSLB/dashboard.html'
                        : 'http://localhost:3000/dashboard.html'
                }
            } : {};
            
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
            
            // Hacer disponible globalmente
            window.supabaseClient = supabaseClient;
            
            console.log('✅ Supabase inicializado correctamente');
            console.log('🔗 URL:', SUPABASE_URL);
            return true;
        } else {
            console.error('❌ La librería de Supabase no está cargada');
            return false;
        }
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        return false;
    }
}

// Función para verificar la conexión con Supabase
async function testSupabaseConnection() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        console.log('🔍 Probando conexión con Supabase...');
        
        // Intentar una consulta simple para verificar conexión
        const { data, error } = await supabaseClient
            .from('madres')
            .select('count')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Conexión con Supabase verificada');
        return true;
    } catch (error) {
        console.error('❌ Error al verificar conexión Supabase:', error);
        throw error;
    }
}

// Función para registrar un nuevo usuario
async function signUp(email, password, metadata = {}) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error en registro:', error);
        return { 
            success: false, 
            error: error.message || 'Error al registrar usuario' 
        };
    }
}

// Función para iniciar sesión
async function signIn(email, password) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error en inicio de sesión:', error);
        return { 
            success: false, 
            error: error.message || 'Error al iniciar sesión' 
        };
    }
}

// Función para cerrar sesión
async function signOut() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { 
            success: false, 
            error: error.message || 'Error al cerrar sesión' 
        };
    }
}

// Función para obtener el usuario actual
async function getCurrentUser() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: user };
    } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener usuario actual' 
        };
    }
}

// Función para verificar si el usuario está autenticado
async function isAuthenticated() {
    try {
        const result = await getCurrentUser();
        return result.success && result.data !== null;
    } catch (error) {
        return false;
    }
}

// Función para escuchar cambios en la autenticación
function onAuthStateChange(callback) {
    if (!supabaseClient) {
        console.error('Supabase no está inicializado');
        return null;
    }
    
    return supabaseClient.auth.onAuthStateChange(callback);
}

// Función para restablecer contraseña
async function resetPassword(email) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        return { 
            success: false, 
            error: error.message || 'Error al restablecer contraseña' 
        };
    }
}

// Función para actualizar perfil de usuario
async function updateProfile(updates) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await supabaseClient.auth.updateUser(updates);
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return { 
            success: false, 
            error: error.message || 'Error al actualizar perfil' 
        };
    }
}

// Inicializar Supabase cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco a que la librería de Supabase se cargue
    setTimeout(() => {
        if (!initializeSupabase()) {
            console.warn('⚠️ No se pudo inicializar Supabase, reintentando...');
            // Reintentar después de un segundo
            setTimeout(initializeSupabase, 1000);
        }
    }, 500);
});

// También intentar inicializar inmediatamente por si el DOM ya está cargado
if (document.readyState === 'loading') {
    // El DOM aún está cargando, esperar al evento
} else {
    // El DOM ya está cargado, intentar inicializar ahora
    setTimeout(() => {
        if (!supabaseClient) {
            initializeSupabase();
        }
    }, 100);
}

// Exportar funciones para uso global
window.auth = {
    initializeSupabase,
    testSupabaseConnection,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isAuthenticated,
    onAuthStateChange,
    resetPassword,
    updateProfile,
    getSupabaseClient: () => supabaseClient
};

// También exportar el cliente directamente para compatibilidad
window.supabaseAuth = {
    client: supabaseClient,
    url: SUPABASE_URL,
    initialized: false
};