// Dashboard Optimizado para TAU - Tamizaje Auditivo Universal
// Implementa lazy loading, delegación de eventos y optimizaciones

class DashboardOptimizado {
  constructor() {
    this.componentesCargados = new Set();
    this.observadorInterseccion = null;
    this.consultas = null;
    this.eventListeners = new Map();
    this.debounceTimers = new Map();
  }

  async inicializar(consultas) {
    try {
      console.log('🚀 Inicializando dashboard optimizado...');
      
      this.consultas = consultas;
      this.configurarObservadorInterseccion();
      await this.cargarComponentesCriticos();
      this.configurarEventListeners();
      this.configurarAtajosDeTeclado();
      
      console.log('✅ Dashboard optimizado inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar dashboard:', error);
      throw error;
    }
  }

  configurarObservadorInterseccion() {
    if ('IntersectionObserver' in window) {
      this.observadorInterseccion = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.cargarComponente(entry.target.dataset.component);
          }
        });
      }, { 
        rootMargin: '50px',
        threshold: 0.1
      });
    }
  }

  async cargarComponentesCriticos() {
    // Cargar solo componentes críticos inicialmente
    const componentesCriticos = ['recent-mothers'];
    
    await Promise.all(
      componentesCriticos.map(componente => this.cargarComponente(componente))
    );
  }

  async cargarComponente(nombreComponente) {
    if (this.componentesCargados.has(nombreComponente)) {
      return;
    }

    try {
      console.log(`📦 Cargando componente: ${nombreComponente}`);
      
      switch (nombreComponente) {
        case 'recent-mothers':
          await this.cargarRecentMothers();
          break;
        case 'modals':
          await this.cargarModales();
          break;
        case 'charts':
          await this.cargarGraficos();
          break;
        case 'search':
          await this.cargarBusqueda();
          break;
        default:
          console.warn(`⚠️ Componente no reconocido: ${nombreComponente}`);
      }
      
      this.componentesCargados.add(nombreComponente);
      console.log(`✅ Componente cargado: ${nombreComponente}`);
    } catch (error) {
      console.error(`❌ Error cargando componente ${nombreComponente}:`, error);
    }
  }

  async cargarRecentMothers() {
    const contenedor = document.getElementById('recentMothers');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading">Cargando registros recientes...</div>';

    try {
      const pacientes = await this.consultas.getPacientesRecientes(1, 10);
      contenedor.innerHTML = this.renderizarRecentMothers(pacientes);
      this.configurarEventListenersRecentMothers();
    } catch (error) {
      console.error('Error al cargar pacientes recientes:', error);
      contenedor.innerHTML = '<div class="error">Error al cargar datos</div>';
    }
  }

  async cargarModales() {
    // Cargar modales solo cuando se necesiten
    const modalHTML = await this.fetchTemplate('templates/modales.html');
    if (modalHTML) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.configurarEventListenersModales();
    }
  }

  async cargarGraficos() {
    // Cargar librería de gráficos solo si hay contenedor
    const contenedor = document.getElementById('charts-container');
    if (!contenedor) return;

    // Cargar Chart.js dinámicamente
    await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    this.inicializarGraficos();
  }

  async cargarBusqueda() {
    // Configurar búsqueda con debounce
    const searchInput = document.getElementById('searchMadres');
    if (searchInput) {
      this.addListener(searchInput, 'input', this.debounce(async (e) => {
        const termino = e.target.value;
        if (termino.length >= 2) {
          await this.realizarBusqueda(termino);
        }
      }, 300));
    }
  }

  renderizarRecentMothers(pacientes) {
    if (!pacientes || pacientes.length === 0) {
      return '<p class="no-data">No hay registros recientes</p>';
    }

    return pacientes.map(paciente => `
      <div class="recent-item" data-madre-id="${paciente.id}">
        <div class="recent-item-info">
          <div class="recent-item-name">${this.escapeHTML(paciente.nombre)} ${this.escapeHTML(paciente.apellido)}</div>
          <div class="recent-item-details">
            <span>RUT: ${this.formatearRUT(paciente.rut)}</span>
            <span>Sala: ${this.escapeHTML(paciente.sala)}</span>
            <span>Cama: ${this.escapeHTML(paciente.cama)}</span>
          </div>
        </div>
        <div class="recent-item-actions">
          <button class="btn btn-sm" data-action="abrir-eoa" data-madre-id="${paciente.id}">
            Realizar EOA
          </button>
        </div>
      </div>
    `).join('');
  }

  configurarEventListeners() {
    // Usar delegación de eventos en el documento
    this.addListener(document, 'click', this.handleGlobalClick.bind(this));
    this.addListener(document, 'submit', this.handleGlobalSubmit.bind(this));
    this.addListener(document, 'keydown', this.handleGlobalKeydown.bind(this));
  }

  configurarEventListenersRecentMothers() {
    // Los event listeners se manejan mediante delegación global
    // No se necesitan listeners individuales
  }

  configurarEventListenersModales() {
    // Los event listeners se manejan mediante delegación global
    // No se necesitan listeners individuales
  }

  handleGlobalClick(event) {
    const { target } = event;
    
    // Buscar el elemento con data-action más cercano
    const actionElement = target.closest('[data-action]');
    if (actionElement) {
      const action = actionElement.dataset.action;
      this.handleAction(action, actionElement, event);
    }
  }

  handleGlobalSubmit(event) {
    const { target } = event;
    
    if (target.dataset.form) {
      const formAction = target.dataset.form;
      this.handleFormSubmit(formAction, target, event);
    }
  }

  handleGlobalKeydown(event) {
    // Manejar atajos de teclado
    if (event.key === 'Escape') {
      this.cerrarModales();
    }
  }

  async handleAction(action, element, event) {
    try {
      switch (action) {
        case 'registrar':
          await this.abrirModalRegistro();
          break;
        case 'ver-madres':
          await this.abrirModalMadres();
          break;
        case 'abrir-eoa':
          await this.abrirEOA(element.dataset.madreId);
          break;
        case 'importar':
          this.handleImportar();
          break;
        case 'ver-importados':
          this.redirectTo('importados.html');
          break;
        case 'ver-reportes':
          this.redirectTo('reportes.html');
          break;
        default:
          console.warn(`⚠️ Acción no reconocida: ${action}`);
      }
    } catch (error) {
      console.error(`❌ Error en acción ${action}:`, error);
      this.mostrarError(`Error al ejecutar acción: ${action}`);
    }
  }

  async handleFormSubmit(formAction, form, event) {
    try {
      switch (formAction) {
        case 'madre':
          await this.guardarMadre(form);
          break;
        case 'bebe':
          await this.guardarBebe(form);
          break;
        case 'eoa':
          await this.guardarEOA(form);
          break;
        default:
          console.warn(`⚠️ Formulario no reconocido: ${formAction}`);
      }
    } catch (error) {
      console.error(`❌ Error en formulario ${formAction}:`, error);
      this.mostrarError(`Error al guardar formulario: ${formAction}`);
    }
  }

  async abrirModalRegistro() {
    await this.cargarComponente('modals');
    const modal = document.getElementById('modalRegistro');
    if (modal) {
      this.mostrarModal(modal);
    }
  }

  async abrirModalMadres() {
    await this.cargarComponente('modals');
    const modal = document.getElementById('modalMadres');
    if (modal) {
      this.mostrarModal(modal);
      await this.cargarListaMadres();
    }
  }

  async abrirEOA(madreId) {
    await this.cargarComponente('modals');
    const modal = document.getElementById('modalEOA');
    if (modal) {
      this.mostrarModal(modal);
      await this.cargarDatosEOA(madreId);
    }
  }

  handleImportar() {
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  async cargarListaMadres() {
    const contenedor = document.getElementById('madresList');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading">Cargando lista de madres...</div>';

    try {
      const resultado = await this.consultas.buscarPacientes('', 'MADRE');
      contenedor.innerHTML = this.renderizarListaMadres(resultado.data);
    } catch (error) {
      console.error('Error al cargar lista de madres:', error);
      contenedor.innerHTML = '<div class="error">Error al cargar datos</div>';
    }
  }

  renderizarListaMadres(madres) {
    if (!madres || madres.length === 0) {
      return '<p class="no-data">No hay madres registradas</p>';
    }

    return madres.map(madre => `
      <div class="madre-item" data-madre-id="${madre.id}">
        <div class="madre-item-info">
          <div class="madre-item-name">${this.escapeHTML(madre.nombre)} ${this.escapeHTML(madre.apellido)}</div>
          <div class="madre-item-details">
            <span>RUT: ${this.formatearRUT(madre.rut)}</span>
            <span>Ficha: ${this.escapeHTML(madre.numero_ficha)}</span>
            <span>Sala: ${this.escapeHTML(madre.sala)}</span>
          </div>
        </div>
        <div class="madre-item-actions">
          <button class="btn btn-sm" data-action="abrir-eoa" data-madre-id="${madre.id}">
            Realizar EOA
          </button>
        </div>
      </div>
    `).join('');
  }

  async realizarBusqueda(termino) {
    const contenedor = document.getElementById('madresList');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading">Buscando...</div>';

    try {
      const resultado = await this.consultas.buscarPacientes(termino);
      contenedor.innerHTML = this.renderizarListaMadres(resultado.data);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      contenedor.innerHTML = '<div class="error">Error en búsqueda</div>';
    }
  }

  // Utilidades
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatearRUT(rut) {
    if (!rut) return '';
    // Implementar formateo de RUT
    return rut.replace(/^(\d{1,2})(\d{3})(\d{3})(\w{1})$/, '$1.$2.$3-$4');
  }

  mostrarModal(modal) {
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    }
  }

  cerrarModal(modal) {
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 300);
    }
  }

  cerrarModales() {
    document.querySelectorAll('.modal.show').forEach(modal => {
      this.cerrarModal(modal);
    });
  }

  redirectTo(url) {
    window.location.href = url;
  }

  mostrarError(mensaje) {
    if (window.utils && window.utils.showNotification) {
      window.utils.showNotification(mensaje, 'error');
    } else {
      alert(mensaje); // Fallback
    }
  }

  // Sistema de event listeners optimizado
  addListener(element, event, handler, options = {}) {
    const key = `${element.constructor.name}-${event}`;
    
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    
    // Remover listener anterior si existe
    const existingListeners = this.eventListeners.get(key);
    existingListeners.forEach(({ element: el, handler: h }) => {
      if (el === element) {
        element.removeEventListener(event, h);
      }
    });
    
    // Agregar nuevo listener
    element.addEventListener(event, handler, options);
    this.eventListeners.get(key).push({ element, handler });
  }

  // Sistema de debounce optimizado
  debounce(func, wait) {
    const key = func.toString();
    
    return (...args) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }
      
      const timer = setTimeout(() => {
        func.apply(this, args);
        this.debounceTimers.delete(key);
      }, wait);
      
      this.debounceTimers.set(key, timer);
    };
  }

  // Lazy loading de scripts
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      // Verificar si ya está cargado
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Cargar plantillas
  async fetchTemplate(url) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`No se pudo cargar plantilla: ${url}`, error);
    }
    return null;
  }

  // Configurar atajos de teclado
  configurarAtajosDeTeclado() {
    this.addListener(document, 'keydown', (event) => {
      // Ctrl/Cmd + K para búsqueda
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('searchMadres');
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl/Cmd + N para nuevo registro
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        this.abrirModalRegistro();
      }
    });
  }

  // Inicializar gráficos
  inicializarGraficos() {
    const ctx = document.getElementById('estadisticasChart');
    if (ctx) {
      // Implementar gráfico de estadísticas
      console.log('📊 Inicializando gráficos...');
    }
  }

  // Limpiar recursos
  destroy() {
    // Limpiar event listeners
    this.eventListeners.forEach((listeners) => {
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
    });
    this.eventListeners.clear();

    // Limpiar debounce timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Limpiar intersection observer
    if (this.observadorInterseccion) {
      this.observadorInterseccion.disconnect();
    }

    // Limpiar componentes cargados
    this.componentesCargados.clear();
  }
}

// Exportar para uso global
export default new DashboardOptimizado();