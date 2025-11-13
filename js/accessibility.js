// js/accessibility.js
class AccessibilityManager {
  constructor() {
    this.focoVisible = false;
    this.ultimoElementoFocado = null;
    this.inicializarAccesibilidad();
  }

  inicializarAccesibilidad() {
    this.configurarNavegacionTeclado();
    this.implementarAriaLabels();
    this.agregarSkipLinks();
    this.mejorarContraste();
    this.configurarLectoresPantalla();
  }

  configurarNavegacionTeclado() {
    // Detectar navegación por teclado
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.focoVisible = true;
        document.body.classList.add('keyboard-navigation');
      }
    });

    // Detectar uso del mouse
    document.addEventListener('mousedown', () => {
      this.focoVisible = false;
      document.body.classList.remove('keyboard-navigation');
    });

    // Manejar trampas de foco en modales
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.cerrarModalActual();
      }

      if (event.key === 'Tab' && document.querySelector('.modal.show')) {
        this.mantenerFocoEnModal(event);
      }
    });
  }

  implementarAriaLabels() {
    // Agregar aria-labels dinámicos
    const agregarAriaLabels = () => {
      // Botones sin texto
      document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
        if (!button.textContent.trim()) {
          const icon = button.querySelector('i, svg, .icon');
          if (icon) {
            const iconClass = icon.className || icon.getAttribute('data-icon');
            button.setAttribute('aria-label', `Botón ${iconClass || 'de acción'}`);
          }
        }
      });

      // Enlaces sin contexto
      document.querySelectorAll('a[href]:not([aria-label])').forEach(link => {
        if (link.textContent.trim().length < 3) {
          const href = link.getAttribute('href');
          link.setAttribute('aria-label', `Enlace a ${href}`);
        }
      });

      // Campos de formulario
      document.querySelectorAll('input, textarea, select').forEach(field => {
        if (!field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')) {
          const label = document.querySelector(`label[for="${field.id}"]`);
          if (label) {
            label.setAttribute('id', `label-${field.id}`);
            field.setAttribute('aria-labelledby', `label-${field.id}`);
          }
        }
      });
    };

    // Ejecutar al cargar y dinámicamente
    agregarAriaLabels();
    const observer = new MutationObserver(agregarAriaLabels);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  agregarSkipLinks() {
    // Crear skip links para navegación rápida
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
      <a href="#navigation" class="skip-link">Saltar a navegación</a>
      <a href="#search" class="skip-link">Saltar a búsqueda</a>
    `;

    document.body.insertBefore(skipLinks, document.body.firstChild);

    // CSS para skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 0;
        z-index: 10000;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 0 0 4px 0;
        transition: top 0.3s;
      }
      
      .skip-link:focus {
        top: 0;
      }
      
      .keyboard-navigation *:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  mejorarContraste() {
    // Función para verificar contraste
    const verificarContraste = (color1, color2) => {
      const getLuminance = (color) => {
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0;
        
        const [r, g, b] = rgb.map(val => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const l1 = getLuminance(color1);
      const l2 = getLuminance(color2);
      const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      
      return contrast;
    };

    // Verificar contraste de elementos importantes
    const verificarContrasteElementos = () => {
      const elementos = document.querySelectorAll('button, a, .card, .notification');
      
      elementos.forEach(elemento => {
        const computedStyle = window.getComputedStyle(elemento);
        const colorFondo = computedStyle.backgroundColor;
        const colorTexto = computedStyle.color;
        
        const contraste = verificarContraste(colorFondo, colorTexto);
        
        if (contraste < 4.5) {
          elemento.setAttribute('data-bajo-contraste', 'true');
          console.warn('Elemento con bajo contraste:', elemento, contraste);
        }
      });
    };

    // Verificar al cargar
    setTimeout(verificarContrasteElementos, 1000);
  }

  configurarLectoresPantalla() {
    // Anunciar cambios dinámicos
    const anunciarCambios = (mensaje, prioridad = 'polite') => {
      let regionExistente = document.querySelector(`[aria-live="${prioridad}"]`);
      
      if (!regionExistente) {
        regionExistente = document.createElement('div');
        regionExistente.setAttribute('aria-live', prioridad);
        regionExistente.setAttribute('aria-atomic', 'true');
        regionExistente.className = 'sr-only';
        regionExistente.style.cssText = `
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        `;
        document.body.appendChild(regionExistente);
      }
      
      regionExistente.textContent = mensaje;
      
      // Limpiar después de un tiempo
      setTimeout(() => {
        regionExistente.textContent = '';
      }, 1000);
    };

    // Hacer disponible globalmente
    window.anunciarCambios = anunciarCambios;

    // Configurar roles y estados para elementos dinámicos
    this.configurarRolesDinamicos();
  }

  configurarRolesDinamicos() {
    // Configurar botones de toggle
    document.querySelectorAll('[data-toggle]').forEach(button => {
      const target = document.querySelector(button.dataset.toggle);
      if (target) {
        const isExpanded = target.style.display !== 'none';
        button.setAttribute('aria-expanded', isExpanded);
        button.setAttribute('aria-controls', target.id || `target-${Math.random().toString(36).substr(2, 9)}`);
        
        if (!target.id) {
          target.id = button.getAttribute('aria-controls');
        }
      }
    });

    // Configurar loaders y spinners
    document.querySelectorAll('.loading, .spinner').forEach(loader => {
      loader.setAttribute('role', 'status');
      loader.setAttribute('aria-label', 'Cargando...');
    });

    // Configurar notificaciones
    document.querySelectorAll('.notification, .alert').forEach(notification => {
      notification.setAttribute('role', 'alert');
      notification.setAttribute('aria-live', 'assertive');
    });
  }

  mantenerFocoEnModal(event) {
    const modal = document.querySelector('.modal.show');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  cerrarModalActual() {
    const modal = document.querySelector('.modal.show');
    if (modal) {
      modal.classList.remove('show');
      // Restaurar foco al elemento que abrió el modal
      if (this.ultimoElementoFocado) {
        this.ultimoElementoFocado.focus();
      }
    }
  }

  // Método para anunciar actualizaciones de contenido
  anunciarActualizacion(contenido, tipo = 'polite') {
    const region = document.createElement('div');
    region.setAttribute('aria-live', tipo);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.textContent = contenido;
    
    document.body.appendChild(region);
    
    setTimeout(() => {
      document.body.removeChild(region);
    }, 1000);
  }
}

// Inicializar gestor de accesibilidad
const accessibilityManager = new AccessibilityManager();
window.AccessibilityManager = AccessibilityManager;