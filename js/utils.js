// Utilidades generales de la aplicación

// Validación de RUT chileno (solo formato xxxxxxxx-x)
function validarRUT(rut) {
    return /^\d{8}-[0-9kK]{1}$/.test(rut);
}

// Formatear RUT chileno (formato xxxxxxxx-x)
function formatearRUT(rut) {
    // Eliminar puntos y guión
    rut = rut.replace(/\./g, '').replace('-', '');
    
    if (rut.length < 2) return rut;
    
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Asegurar que el número tenga 8 dígitos (rellenar con ceros si es necesario)
    const numero8Digitos = numero.padStart(8, '0');
    
    return numero8Digitos + '-' + dv;
}

// Formatear RUT mientras el usuario escribe (formato xxxxxxxx-x)
function formatearRUTInput(input) {
    let value = input.value.replace(/\./g, '').replace('-', '');
    
    // Limitar a 9 caracteres (8 dígitos + 1 dígito verificador)
    if (value.length > 9) {
        value = value.slice(0, 9);
    }
    
    // Si hay exactamente 8 dígitos, agregar automáticamente el guión
    if (value.length === 8) {
        input.value = value + '-';
    } else if (value.length >= 9) {
        // Si hay 9 caracteres (8 dígitos + dígito verificador), formatear como xxxxxxxx-x
        const numero = value.slice(0, 8);
        const dv = value.slice(8, 9);
        input.value = numero + '-' + dv.toUpperCase();
    } else if (value.length > 0) {
        // Si aún no está completo, mostrar lo que hay sin formato
        input.value = value;
    }
}

// Validar email
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (!notification || !notificationMessage) {
        console.warn('Elementos de notificación no encontrados');
        return;
    }
    
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Forzar reflow para activar la animación
    notification.offsetHeight;
    notification.classList.add('show');
    
    // Auto ocultar después de 5 segundos
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

// Ocultar notificación
function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }
}

// Formatear fecha y hora
function formatearFechaHora(fecha) {
    const date = new Date(fecha);
    const opciones = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleString('es-CL', opciones);
}

// Formatear fecha solo
function formatearFecha(fecha) {
    const date = new Date(fecha);
    const opciones = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    return date.toLocaleDateString('es-CL', opciones);
}

// Validar formulario
function validarFormulario(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        const value = input.value.trim();
        const errorElement = document.getElementById(input.name + 'Error');
        
        // Limpiar errores anteriores
        input.classList.remove('error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        // Validar campo requerido
        if (!value) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Este campo es obligatorio';
            }
            isValid = false;
            return;
        }
        
        if (input.name === 'cantidadHijos') {
            const numericValue = parseInt(value, 10);
            if (!Number.isInteger(numericValue) || numericValue < 1) {
                input.classList.add('error');
                if (errorElement) {
                    errorElement.textContent = 'Ingrese un numero valido (1 o mas)';
                }
                isValid = false;
                return;
            }
        }
        
        // Validaciones específicas
        if (input.type === 'email' && !validarEmail(value)) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Ingrese un email válido';
            }
            isValid = false;
            return;
        }
        
        if (input.name === 'rut' && !validarRUT(value)) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'RUT inválido. Use formato: 12345678-9';
            }
            isValid = false;
            return;
        }
        
        if (input.name === 'confirmPassword') {
            const password = document.getElementById('password').value;
            if (value !== password) {
                input.classList.add('error');
                if (errorElement) {
                    errorElement.textContent = 'Las contraseñas no coinciden';
                }
                isValid = false;
                return;
            }
        }
    });
    
    return isValid;
}

// Limpiar formulario
function limpiarFormulario(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.reset();
    
    // Limpiar errores
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.classList.remove('error');
    });
    
    // Limpiar mensajes de error
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(message => {
        message.textContent = '';
    });
}

// Mostrar/ocultar loader en botones
function toggleButtonLoader(buttonId, show = true) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (show) {
        button.classList.add('loading');
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

// Escape HTML para prevenir XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generar ID único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Copiar al portapapeles
async function copiarAlPortapapeles(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copiado al portapapeles', 'success');
    } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        showNotification('Error al copiar', 'error');
    }
}

// Verificar conexión a internet
function verificarConexion() {
    return navigator.onLine;
}

// Escuchar cambios de conexión
window.addEventListener('online', () => {
    showNotification('Conexión restablecida', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Sin conexión a internet', 'warning');
});

// Función debounce para optimizar búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función throttle para limitar ejecuciones
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Exportar funciones para uso en otros módulos
window.utils = {
    validarRUT,
    formatearRUT,
    formatearRUTInput,
    validarEmail,
    showNotification,
    hideNotification,
    formatearFechaHora,
    formatearFecha,
    validarFormulario,
    limpiarFormulario,
    toggleButtonLoader,
    escapeHTML,
    generarId,
    copiarAlPortapapeles,
    verificarConexion,
    debounce,
    throttle
};
