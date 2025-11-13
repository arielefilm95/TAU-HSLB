// js/secure-auth.js
class SecureAuth {
  constructor() {
    this.tokenRefreshInterval = null;
    this.sessionTimeout = null;
    this.inicializarSeguridadSesion();
  }

  inicializarSeguridadSesion() {
    this.configurarTimeoutSesion();
    this.implementarRotacionTokens();
    this.protegerAlmacenamiento();
  }

  configurarTimeoutSesion() {
    // Cerrar sesión después de inactividad
    const TIMEOUT_SESION = 30 * 60 * 1000; // 30 minutos

    const resetearTimeout = () => {
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }
      
      this.sessionTimeout = setTimeout(() => {
        this.cerrarSesionPorInactividad();
      }, TIMEOUT_SESION);
    };

    // Eventos que resetean el timeout
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetearTimeout, true);
    });

    resetearTimeout();
  }

  implementarRotacionTokens() {
    // Rotar tokens cada 15 minutos
    const ROTACION_TOKEN = 15 * 60 * 1000;

    this.tokenRefreshInterval = setInterval(async () => {
      try {
        await this.rotarToken();
      } catch (error) {
        console.error('Error rotando token:', error);
        this.cerrarSesionPorError();
      }
    }, ROTACION_TOKEN);
  }

  async rotarToken() {
    const tokenActual = localStorage.getItem('supabase.auth.token');
    if (!tokenActual) return;

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenActual}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('supabase.auth.token', token);
    } else {
      throw new Error('No se pudo refrescar el token');
    }
  }

  protegerAlmacenamiento() {
    // Usar sessionStorage en lugar de localStorage para datos sensibles
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;

    localStorage.setItem = function(key, value) {
      if (key.includes('token') || key.includes('password') || key.includes('auth')) {
        sessionStorage.setItem(key, value);
        console.warn('Datos sensibles movidos a sessionStorage');
      } else {
        originalSetItem.call(this, key, value);
      }
    };

    localStorage.getItem = function(key) {
      if (key.includes('token') || key.includes('password') || key.includes('auth')) {
        return sessionStorage.getItem(key);
      }
      return originalGetItem.call(this, key);
    };
  }

  async cerrarSesionPorInactividad() {
    console.warn('Sesión cerrada por inactividad');
    await this.cerrarSesion('Su sesión ha expirado por inactividad');
  }

  async cerrarSesionPorError() {
    console.error('Sesión cerrada por error de autenticación');
    await this.cerrarSesion('Ha ocurrido un error de seguridad. Por favor, inicie sesión nuevamente');
  }

  async cerrarSesion(mensaje) {
    // Limpiar intervalos
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Limpiar almacenamiento
    sessionStorage.clear();
    Object.keys(localStorage).forEach(key => {
      if (key.includes('auth') || key.includes('token')) {
        localStorage.removeItem(key);
      }
    });

    // Mostrar mensaje y redirigir
    if (mensaje) {
      alert(mensaje);
    }
    
    window.location.href = '/index.html';
  }

  // Validar integridad de datos
  validarIntegridadDatos(datos) {
    // Implementar checksum o hash para verificar integridad
    const calcularHash = (data) => {
      return btoa(JSON.stringify(data)).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
    };

    const hashRecibido = datos.hash;
    delete datos.hash;
    const hashCalculado = calcularHash(datos);

    return hashRecibido === hashCalculado;
  }
}

// Inicializar autenticación segura
const secureAuth = new SecureAuth();
window.SecureAuth = SecureAuth;