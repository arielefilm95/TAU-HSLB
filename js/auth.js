// Configuración de Supabase (deberás reemplazar con tus datos reales)
const SUPABASE_URL = 'https://oywepfjbzvnzvcnqtlnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95d2VwZmpienZuenZjbnF0bG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTg0NzgsImV4cCI6MjA3NzkzNDQ3OH0.nnJ3tbgoWdu1-qcnpZwDK6W_WQSDmVFU_Hf-5XCpDo4';

// NOTA: Debes configurar tus credenciales reales de Supabase aquí
// Ve a tu proyecto de Supabase > Settings > API para obtener estos datos

// Inicializar Supabase - esperar a que la librería esté disponible
let supabase;

function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase inicializado correctamente');
        
        // Escuchar cambios en la autenticación
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Cambio en estado de autenticación:', event);
            
            if (event === 'SIGNED_IN') {
                currentUser = session.user;
                console.log('Usuario inició sesión:', currentUser);
                
                // Solo redirigir si estamos en login/signup y el usuario no estaba ya autenticado
                // Evitar bucles de redirección
                const pathname = window.location.pathname;
                const isAuthPage = pathname.includes('signup.html') || pathname.includes('index.html');
                
                if (isAuthPage && !window.authRedirecting) {
                    console.log('🔄 Redirigiendo a dashboard desde onAuthStateChange...');
                    window.authRedirecting = true; // Marcar que estamos redirigiendo
                    setTimeout(() => {
                        console.log('🚀 Ejecutando redirección a dashboard...');
                        window.location.href = 'dashboard.html';
                    }, 500);
                } else {
                    // Solo mostrar log si estamos en dashboard para evitar spam en consola
                    if (pathname.includes('dashboard.html')) {
                        console.log('✅ Usuario ya está en dashboard, no se redirige');
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                window.authRedirecting = false; // Resetear flag al cerrar sesión
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
    // Evitar bucle de redirección
    if (window.authRedirecting) {
        console.log('🔄 Ya se está redirigiendo, evitando bucle...');
        return false;
    }
    
    const user = await checkAuth();
    
    if (user) {
        currentUser = user;
        console.log('🔄 Usuario ya autenticado, redirigiendo a dashboard...');
        window.authRedirecting = true; // Marcar que estamos redirigiendo
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
    console.log('Iniciando proceso de registro...');
    
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return { success: false, error: 'Error de conexión con la base de datos' };
    }
    
    try {
        console.log('Registrando usuario en Supabase Auth...');
        console.log('Email:', email);
        console.log('Nombre:', nombre);
        
        // Primero registrar el usuario en Supabase Auth con auto-confirmación
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre: nombre
                },
                // Deshabilitar confirmación por email para pruebas
                emailRedirectTo: undefined
            }
        });
        
        console.log('Respuesta de Supabase Auth:', { data, error });
        
        if (error) {
            console.error('Error en Supabase Auth:', error);
            throw error;
        }
        
        console.log('Usuario creado en Auth:', data.user);
        
        // Si el registro es exitoso, crear el perfil manualmente
        if (data.user) {
            console.log('Intentando crear perfil en tabla perfiles...');
            
            // Esperar un momento antes de crear el perfil
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: profileData, error: profileError } = await supabase
                .from('perfiles')
                .insert([
                    {
                        id: data.user.id,
                        nombre_usuario: nombre
                    }
                ])
                .select(); // Agregar .select() para obtener datos de respuesta
            
            console.log('Respuesta de inserción de perfil:', { profileData, profileError });
            
            if (profileError) {
                console.error('Error al crear perfil:', profileError);
                // No retornar error aquí, ya que el usuario ya fue creado en Auth
                // Solo registrar el problema
                return {
                    success: true,
                    user: data.user,
                    message: 'Usuario registrado correctamente. Hubo un problema al crear el perfil, pero puedes continuar.',
                    profileError: profileError.message
                };
            }
            
            console.log('Perfil creado exitosamente');
            
            // Iniciar sesión automáticamente después del registro
            console.log('Iniciando sesión automáticamente...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (signInError) {
                console.error('Error al iniciar sesión automáticamente:', signInError);
                return {
                    success: true,
                    user: data.user,
                    message: 'Usuario registrado correctamente. Por favor inicia sesión manualmente.',
                    requiresManualLogin: true
                };
            } else {
                console.log('Sesión iniciada automáticamente:', signInData.user);
                currentUser = signInData.user;
            }
        }
        
        return {
            success: true,
            user: data.user,
            message: '¡Registro exitoso! Usuario creado y sesión iniciada.'
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
        console.log('🔄 Iniciando proceso de cierre de sesión...');
        
        // Mostrar notificación de cierre de sesión
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification('Cerrando sesión...', 'info');
        }
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        currentUser = null;
        window.authRedirecting = false; // Resetear flag al cerrar sesión
        console.log('✅ Sesión cerrada exitosamente, redirigiendo a index.html...');
        
        // Forzar redirección inmediata después del logout
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error en logout:', error);
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification('Error al cerrar sesión', 'error');
        }
        
        // Forzar redirección incluso si hay error
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
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
        console.log('📝 Formulario de registro encontrado, agregando event listener');
        signupForm.addEventListener('submit', async function(e) {
            console.log('🚀 Formulario de registro enviado');
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            console.log('📊 Datos del formulario:', {
                nombre: nombre,
                email: email,
                passwordLength: password.length,
                confirmPasswordLength: confirmPassword.length
            });
            
            // Validar formulario
            console.log('🔍 Validando formulario...');
            if (!utils.validarFormulario('signupForm')) {
                console.log('❌ Validación de formulario falló');
                return;
            }
            console.log('✅ Validación de formulario exitosa');
            
            // Validar longitud de contraseña
            if (password.length < 6) {
                console.log('❌ Contraseña demasiado corta');
                document.getElementById('password').classList.add('error');
                document.getElementById('passwordError').textContent = 'La contraseña debe tener al menos 6 caracteres';
                return;
            }
            
            // Validar que las contraseñas coincidan
            if (password !== confirmPassword) {
                console.log('❌ Las contraseñas no coinciden');
                document.getElementById('confirmPassword').classList.add('error');
                document.getElementById('confirmPasswordError').textContent = 'Las contraseñas no coinciden';
                return;
            }
            
            console.log('✅ Todas las validaciones pasaron, iniciando registro...');
            
            // Mostrar loader
            utils.toggleButtonLoader('signupBtn', true);
            
            try {
                console.log('📡 Llamando a función signup()...');
                const result = await signup(nombre, email, password);
                console.log('📥 Resultado del signup:', result);
                
                if (result.success) {
                    console.log('✅ Registro exitoso:', result);
                    utils.showNotification(result.message, 'success');
                    setTimeout(() => {
                        console.log('🔄 Redirigiendo a dashboard.html...');
                        window.location.href = 'dashboard.html';
                    }, 2000);
                } else {
                    console.log('❌ Registro fallido:', result.error);
                    utils.showNotification(result.error, 'error');
                }
            } catch (error) {
                console.error('💥 Error inesperado en registro:', error);
                utils.showNotification('Error al registrar usuario: ' + error.message, 'error');
            } finally {
                console.log('🔄 Ocultando loader...');
                utils.toggleButtonLoader('signupBtn', false);
            }
        });
    } else {
        console.log('❌ No se encontró el formulario de registro signupForm');
    }
    
    // Logout button - se configurará en dashboard.js para asegurar que el DOM esté listo
    
    // Verificar autenticación en páginas protegidas
    if (window.location.pathname.includes('dashboard.html')) {
        requireAuth();
    }
    
    // Redirigir si ya está autenticado en página de login y signup
    if (window.location.pathname.includes('index.html') ||
        window.location.pathname.includes('signup.html') ||
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