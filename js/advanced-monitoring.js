// js/advanced-monitoring.js
class AdvancedMonitoring {
  constructor() {
    this.metrics = {
      performance: {},
      errors: [],
      userInteractions: [],
      networkRequests: []
    };
    
    this.configuracion = {
      endpoint: '/api/analytics',
      maxErrors: 50,
      maxInteractions: 100,
      enviarIntervalo: 30000 // 30 segundos
    };
    
    this.inicializarMonitoreo();
  }

  inicializarMonitoreo() {
    this.configurarPerformanceObserver();
    this.configurarManejoErrores();
    this.configurarSeguimientoInteracciones();
    this.configurarMonitoreoRed();
    this.iniciarEnvioPeriodico();
  }

  configurarPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    // Core Web Vitals
    this.configurarWebVitals();
    
    // Resource Timing
    this.configurarResourceTiming();
    
    // User Timing
    this.configurarUserTiming();
    
    // Long Tasks
    this.configurarLongTasks();
  }

  configurarWebVitals() {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.performance.lcp = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics.performance.fid = entry.processingStart - entry.startTime;
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.performance.cls = clsValue;
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  configurarResourceTiming() {
    const resourceObserver = new PerformanceObserver((list) => {
      const resources = list.getEntries();
      resources.forEach(resource => {
        this.metrics.networkRequests.push({
          name: resource.name,
          type: this.getResourceType(resource.name),
          duration: resource.duration,
          size: resource.transferSize,
          timestamp: resource.startTime
        });
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  configurarUserTiming() {
    // Marcar puntos importantes del ciclo de vida
    this.mark('app-start');
    
    window.addEventListener('load', () => {
      this.mark('app-loaded');
      this.measure('app-load-time', 'app-start', 'app-loaded');
    });

    // Medir tiempo de renderizado
    document.addEventListener('DOMContentLoaded', () => {
      this.mark('dom-ready');
      this.measure('dom-parse-time', 'app-start', 'dom-ready');
    });
  }

  configurarLongTasks() {
    if ('PerformanceLongTaskTiming' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.metrics.performance.longTask = {
            duration: entry.duration,
            startTime: entry.startTime
          };
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  }

  configurarManejoErrores() {
    // Errores de JavaScript
    window.addEventListener('error', (event) => {
      this.registrarError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    // Promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', (event) => {
      this.registrarError({
        type: 'promise-rejection',
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });

    // Errores de recursos
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.registrarError({
          type: 'resource',
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          timestamp: Date.now()
        });
      }
    }, true);
  }

  configurarSeguimientoInteracciones() {
    // Clicks en elementos importantes
    document.addEventListener('click', (event) => {
      const target = event.target;
      const elementoInfo = this.obtenerInformacionElemento(target);
      
      if (elementoInfo.importante) {
        this.metrics.userInteractions.push({
          type: 'click',
          element: elementoInfo,
          timestamp: Date.now(),
          coordinates: { x: event.clientX, y: event.clientY }
        });
      }
    });

    // Envíos de formulario
    document.addEventListener('submit', (event) => {
      const form = event.target;
      this.metrics.userInteractions.push({
        type: 'form-submit',
        formId: form.id,
        formAction: form.action,
        timestamp: Date.now()
      });
    });

    // Tiempo en página
    this.tiempoInicioPagina = Date.now();
    window.addEventListener('beforeunload', () => {
      this.metrics.userInteractions.push({
        type: 'page-time',
        duration: Date.now() - this.tiempoInicioPagina,
        timestamp: Date.now()
      });
    });
  }

  configurarMonitoreoRed() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.metrics.networkRequests.push({
          url: args[0],
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          timestamp: Date.now()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.metrics.networkRequests.push({
          url: args[0],
          method: args[1]?.method || 'GET',
          error: error.message,
          duration,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }

  obtenerInformacionElemento(element) {
    const info = {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 50),
      importante: false
    };

    // Determinar si es un elemento importante para seguir
    if (element.matches('button, a, input[type="submit"], [data-track]')) {
      info.importante = true;
    }

    // Agregar información específica según el tipo
    if (element.tagName === 'BUTTON') {
      info.action = element.textContent.trim() || element.getAttribute('aria-label');
    } else if (element.tagName === 'A') {
      info.href = element.href;
    } else if (element.tagName === 'INPUT') {
      info.type = element.type;
      info.name = element.name;
    }

    return info;
  }

  registrarError(error) {
    this.metrics.errors.push(error);
    
    // Mantener solo los errores más recientes
    if (this.metrics.errors.length > this.configuracion.maxErrors) {
      this.metrics.errors = this.metrics.errors.slice(-this.configuracion.maxErrors);
    }

    // Enviar errores críticos inmediatamente
    if (error.type === 'javascript' || error.type === 'promise-rejection') {
      this.enviarDatos({ errors: [error] }, true);
    }
  }

  mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name);
      if (measures.length > 0) {
        this.metrics.performance[name] = measures[measures.length - 1].duration;
      }
    }
  }

  getResourceType(url) {
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.js')) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.includes('supabase')) return 'api';
    return 'other';
  }

  iniciarEnvioPeriodico() {
    setInterval(() => {
      this.enviarDatos();
    }, this.configuracion.enviarIntervalo);
  }

  async enviarDatos(datosEspecificos = null, inmediato = false) {
    const datosAEnviar = datosEspecificos || {
      performance: this.metrics.performance,
      errors: this.metrics.errors.slice(-10), // Últimos 10 errores
      userInteractions: this.metrics.userInteractions.slice(-20), // Últimas 20 interacciones
      networkRequests: this.metrics.networkRequests.slice(-15), // Últimas 15 peticiones
      sessionId: this.obtenerSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };

    try {
      const response = await fetch(this.configuracion.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosAEnviar)
      });

      if (response.ok && !datosEspecificos) {
        // Limpiar métricas enviadas exitosamente
        this.limpiarMetricasEnviadas();
      }
    } catch (error) {
      console.warn('Error enviando métricas:', error);
      
      // Guardar en localStorage para envío posterior
      this.guardarLocalmente(datosAEnviar);
    }
  }

  obtenerSessionId() {
    let sessionId = sessionStorage.getItem('tau-session-id');
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tau-session-id', sessionId);
    }
    return sessionId;
  }

  limpiarMetricasEnviadas() {
    this.metrics.errors = [];
    this.metrics.userInteractions = this.metrics.userInteractions.slice(-10);
    this.metrics.networkRequests = this.metrics.networkRequests.slice(-10);
  }

  guardarLocalmente(datos) {
    const almacenados = localStorage.getItem('tau-metrics-pending') || '[]';
    const pendientes = JSON.parse(almacenados);
    pendientes.push(datos);
    
    // Mantener solo los últimos 50 registros
    if (pendientes.length > 50) {
      pendientes.splice(0, pendientes.length - 50);
    }
    
    localStorage.setItem('tau-metrics-pending', JSON.stringify(pendientes));
  }

  // Método público para obtener reporte
  getReport() {
    return {
      performance: this.metrics.performance,
      errors: this.metrics.errors,
      userInteractions: this.metrics.userInteractions,
      networkRequests: this.metrics.networkRequests,
      summary: this.generarResumen()
    };
  }

  generarResumen() {
    return {
      totalErrors: this.metrics.errors.length,
      totalInteractions: this.metrics.userInteractions.length,
      totalRequests: this.metrics.networkRequests.length,
      avgResponseTime: this.calcularTiempoRespuestaPromedio(),
      errorRate: this.calcularTasaError(),
      performanceScore: this.calcularPuntuacionRendimiento()
    };
  }

  calcularTiempoRespuestaPromedio() {
    const requests = this.metrics.networkRequests.filter(r => r.duration);
    if (requests.length === 0) return 0;
    
    const total = requests.reduce((sum, r) => sum + r.duration, 0);
    return total / requests.length;
  }

  calcularTasaError() {
    const requests = this.metrics.networkRequests;
    if (requests.length === 0) return 0;
    
    const errores = requests.filter(r => r.status >= 400 || r.error).length;
    return (errores / requests.length) * 100;
  }

  calcularPuntuacionRendimiento() {
    const { lcp, fid, cls } = this.metrics.performance;
    
    let score = 100;
    
    // LCP
    if (lcp > 4000) score -= 30;
    else if (lcp > 2500) score -= 15;
    
    // FID
    if (fid > 300) score -= 30;
    else if (fid > 100) score -= 15;
    
    // CLS
    if (cls > 0.25) score -= 30;
    else if (cls > 0.1) score -= 15;
    
    return Math.max(0, score);
  }
}

// Inicializar monitoreo avanzado
const advancedMonitoring = new AdvancedMonitoring();
window.AdvancedMonitoring = AdvancedMonitoring;