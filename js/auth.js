// Configuración de Supabase (deberás reemplazar con tus datos reales)
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';

// Inicializar Supabase - esperar a que la librería esté disponible
let supabase;

function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase inicializado correctamente');
        
        // Escuchar cambios en la autenticación
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                currentUser = session.user;
                console.log('Usuario inició sesión:', currentUser);
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                console.log('Usuario cerró sesión');
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refrescado');
            }
        });
    } else {
        console.error('La librería de Supabase no está cargada');
        // Reintentar después de un breve retraso
        setTimeout(initializeSupabase, 100);
    }
}

// La inicialización se manejará desde los archivos HTML

// Variables globales
let currentUser = null;

// Función para verificar si el usuario está autenticado
async function checkAuth() {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return null;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
        console.error('Error al verificar autenticación:', error);
        return null;
    }
    
    return user;
}

// Función para redirigir si no está autenticado
async function requireAuth() {
    const user = await checkAuth();
    
    if (!user) {
        // Si no estamos en la página de login, redirigir
        if (!window.location.pathname.includes('index.html') && 
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
        return false;
    }
    
    currentUser = user;
    return true;
}

// Función para redirigir si ya está autenticado
async function redirectIfAuthenticated() {
    const user = await checkAuth();
    
    if (user) {
        currentUser = user;
        window.location.href = 'dashboard.html';
        return true;
    }
    
    return false;
}

// Función de login
async function login(email, password) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return { success: false, error: 'Error de conexión con la base de datos' };
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        currentUser = data.user;
        return { success: true, user: data.user };
        
    } catch (error) {
        console.error('Error en login:', error);
        return { 
            success: false, 
            error: error.message || 'Error al iniciar sesión' 
        };
    }
}

// Función de registro
async function signup(nombre, email, password) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return { success: false, error: 'Error de conexión con la base de datos' };
    }
    
    try {
        // Primero registrar el usuario en Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre: nombre
                }
            }
        });
        
        if (error) {
            throw error;
        }
        
        // Si el registro es exitoso, crear el perfil
        if (data.user) {
            const { error: profileError } = await supabase
                .from('perfiles')
                .insert([
                    {
                        id: data.user.id,
                        nombre_usuario: nombre
                    }
                ]);
            
            if (profileError) {
                console.error('Error al crear perfil:', profileError);
                // No lanzamos error aquí porque el usuario ya fue creado en Auth
            }
        }
        
        return { 
            success: true, 
            user: data.user,
            message: 'Registro exitoso. Revisa tu correo para confirmar la cuenta.'
        };
        
    } catch (error) {
        console.error('Error en registro:', error);
        return { 
            success: false, 
            error: error.message || 'Error al registrar usuario' 
        };
    }
}

// Función de logout
async function logout() {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        currentUser = null;
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error en logout:', error);
        utils.showNotification('Error al cerrar sesión', 'error');
    }
}

// Función para obtener el perfil del usuario
async function getUserProfile(userId) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
        
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        return null;
    }
}

// Función para actualizar el perfil del usuario
async function updateUserProfile(userId, updates) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return null;
    }
}

// Función para resetear contraseña
async function resetPassword(email) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return { success: false, error: 'Error de conexión con la base de datos' };
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error al resetear contraseña:', error);
        return { 
            success: false, 
            error: error.message || 'Error al enviar correo de recuperación' 
        };
    }
}

// Funciones para el DOM
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            // Validar formulario
            if (!utils.validarFormulario('loginForm')) {
                return;
            }
            
            // Mostrar loader
            utils.toggleButtonLoader('loginBtn', true);
            
            try {
                const result = await login(email, password);
                
                if (result.success) {
                    utils.showNotification('Inicio de sesión exitoso', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    utils.showNotification(result.error, 'error');
                }
            } catch (error) {
                utils.showNotification('Error al iniciar sesión', 'error');
            } finally {
                utils.toggleButtonLoader('loginBtn', false);
            }
        });
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validar formulario
            if (!utils.validarFormulario('signupForm')) {
                return;
            }
            
            // Validar longitud de contraseña
            if (password.length < 6) {
                document.getElementById('password').classList.add('error');
                document.getElementById('passwordError').textContent = 'La contraseña debe tener al menos 6 caracteres';
                return;
            }
            
            // Mostrar loader
            utils.toggleButtonLoader('signupBtn', true);
            
            try {
                const result = await signup(nombre, email, password);
                
                if (result.success) {
                    utils.showNotification(result.message, 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    utils.showNotification(result.error, 'error');
                }
            } catch (error) {
                utils.showNotification('Error al registrar usuario', 'error');
            } finally {
                utils.toggleButtonLoader('signupBtn', false);
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Verificar autenticación en páginas protegidas
    if (window.location.pathname.includes('dashboard.html')) {
        requireAuth();
    }
    
    // Redirigir si ya está autenticado en página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/')) {
        redirectIfAuthenticated();
    }
});

// Exportar funciones para uso en otros módulos
window.auth = {
    initializeSupabase,
    checkAuth,
    requireAuth,
    redirectIfAuthenticated,
    login,
    signup,
    logout,
    getUserProfile,
    updateUserProfile,
    resetPassword,
    getCurrentUser: () => currentUser,
    supabase
};