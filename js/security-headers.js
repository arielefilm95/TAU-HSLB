// js/security-headers.js
class SecurityHeaders {
  constructor() {
    this.configurarCabeceras();
    this.implementarCSP();
    this.protegerContraXSS();
  }

  configurarCabeceras() {
    // Configurar cabeceras de seguridad via Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'SET_SECURITY_HEADERS'
        });
      });
    }
  }

  implementarCSP() {
    // Política de Contenido de Seguridad
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      document.head.appendChild(cspMeta);
    }
  }

  protegerContraXSS() {
    // Escapar HTML dinámicamente
    const escapeHTML = (str) => {
      return str.replace(/[&<>"']/g, (match) => {
        const escape = {
          '&': '&',
          '<': '<',
          '>': '>',
          '"': '"',
          "'": '''
        };
        return escape[match];
      });
    };

    // Hacer disponible globalmente
    window.escapeHTML = escapeHTML;

    // Sanitizar entradas de formulario
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.tagName === 'FORM') {
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          if (input.type !== 'password') {
            input.value = input.value.trim();
          }
        });
      }
    });
  }

  // Implementar detección de ataques
  detectarPatronesSospechosos() {
    const patronesSospechosos = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    const limpiarEntrada = (entrada) => {
      let limpio = entrada;
      patronesSospechosos.forEach(patron => {
        limpio = limpio.replace(patron, '');
      });
      return limpio;
    };

    // Sobrescribir métodos de entrada
    const originalGetElementById = document.getElementById;
    document.getElementById = function(id) {
      const element = originalGetElementById.call(this, id);
      if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
        const originalValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        Object.defineProperty(element, 'value', {
          get: function() {
            return originalValue.get.call(this);
          },
          set: function(newValue) {
            originalValue.set.call(this, limpiarEntrada(newValue));
          }
        });
      }
      return element;
    };
  }
}

// Inicializar seguridad
const securityHeaders = new SecurityHeaders();
window.SecurityHeaders = SecurityHeaders;