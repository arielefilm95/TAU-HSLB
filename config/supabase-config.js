// Configuración de Supabase para la aplicación TAU
// Este archivo centraliza las credenciales y configuración de Supabase

// Credenciales de Supabase
const SUPABASE_CONFIG = {
    URL: 'https://oywepfjbzvnzvcnqtlnv.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95d2VwZmpienZuenZjbnF0bG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTg0NzgsImV4cCI6MjA3NzkzNDQ3OH0.nnJ3tbgoWdu1-qcnpZwDK6W_WQSDmVFU_Hf-5XCpDo4',
    
    // Configuración de autenticación
    AUTH: {
        // URLs de redirección para desarrollo y producción
        REDIRECT_URLS: [
            'http://localhost:3000',
            'http://localhost:3000/dashboard.html',
            'https://arielefilm95.github.io/TAU-HSLB',
            'https://arielefilm95.github.io/TAU-HSLB/dashboard.html'
        ],
        
        // Proveedor de autenticación (email por defecto)
        PROVIDER: 'email',
        
        // Opciones de sesión
        SESSION: {
            persistSession: true,
            detectSessionInUrl: true
        }
    },
    
    // Configuración de base de datos
    DATABASE: {
        // Tablas principales
        TABLES: {
            PERFILES: 'perfiles',
            MADRES: 'madres',
            EXAMENES_EOA: 'examenes_eoa',
            PARTOS_IMPORTADOS: 'partos_importados'
        },
        
        // Límites de consultas
        QUERY_LIMITS: {
            DEFAULT: 50,
            MAX: 1000,
            RECENT: 10,
            SEARCH: 20
        }
    },
    
    // Configuración de almacenamiento (opcional)
    STORAGE: {
        BUCKETS: {
            DOCUMENTOS: 'documentos',
            IMAGENES: 'imagenes'
        },
        MAX_FILE_SIZE: '5MB',
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
    }
};

// Función para obtener la configuración
function getSupabaseConfig() {
    return SUPABASE_CONFIG;
}

// Función para obtener la URL del proyecto
function getSupabaseUrl() {
    return SUPABASE_CONFIG.URL;
}

// Función para obtener la clave anónima
function getSupabaseAnonKey() {
    return SUPABASE_CONFIG.ANON_KEY;
}

// Función para verificar si estamos en producción
function isProduction() {
    return window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1';
}

// Función para obtener las URLs de redirección apropiadas
function getRedirectUrls() {
    if (isProduction()) {
        return SUPABASE_CONFIG.AUTH.REDIRECT_URLS.filter(url => 
            url.includes('github.io')
        );
    } else {
        return SUPABASE_CONFIG.AUTH.REDIRECT_URLS.filter(url => 
            url.includes('localhost')
        );
    }
}

// Exportar configuración y funciones útiles
window.supabaseConfig = {
    ...SUPABASE_CONFIG,
    getSupabaseConfig,
    getSupabaseUrl,
    getSupabaseAnonKey,
    isProduction,
    getRedirectUrls
};

// También exportar como módulo para compatibilidad
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        getSupabaseConfig,
        getSupabaseUrl,
        getSupabaseAnonKey,
        isProduction,
        getRedirectUrls
    };
}