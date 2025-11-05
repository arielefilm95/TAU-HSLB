// Utilidades generales de la aplicación

// Validación de RUT chileno
function validarRUT(rut) {
    // Eliminar puntos y guión
    rut = rut.replace(/\./g, '').replace('-', '');
    
    // Verificar formato básico
    if (!/^[0-9]+[0-9kK]{1}$/.test(rut)) {
        return false;
    }
    
    // Separar número y dígito verificador
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero.charAt(i)) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    const dvEsperado = 11 - (suma % 11);
    let dvCalculado;
    
    if (dvEsperado === 11) {
        dvCalculado = '0';
    } else if (dvEsperado === 10) {
        dvCalculado = 'K';
    } else {
        dvCalculado = dvEsperado.toString();
    }
    
    return dv === dvCalculado;
}

// Formatear RUT chileno
function formatearRUT(rut) {
    rut = rut.replace(/\./g, '').replace('-', '');
    
    if (rut.length < 2) return rut;
    
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Formatear número con puntos
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
    
    return numeroFormateado + '-' + dv;
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
                errorElement.textContent = 'RUT inválido';
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