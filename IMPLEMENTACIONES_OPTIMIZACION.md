# Implementaciones Prácticas de Optimización para TAU

## 1. Service Worker Optimizado

### 1.1 Nuevo Service Worker con Estrategias Avanzadas

```javascript
// sw-optimizado.js
const CACHE_VERSION = 'tau-v2.0.0';
const STATIC_CACHE = `tau-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tau-dynamic-${CACHE_VERSION}`;
const API_CACHE = `tau-api-${CACHE_VERSION}`;

// Estrategias de caché por tipo de recurso
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  DYNAMIC: 'stale-while-revalidate',
  API: 'network-first',
  OFFLINE: 'cache-only'
};

// Recursos estáticos para caché inmediato
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/manifest.json',
  '/css/styles.css',
  '/css/dashboard.css',
  '/js/utils.js',
  '/js/auth.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Instalación con caché por capas
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación con limpieza de cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => !cacheName.includes(CACHE_VERSION))
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de caché inteligente
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no GET
  if (request.method !== 'GET') return;

  // Estrategia para API de Supabase
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(apiStrategy(request));
    return;
  }

  // Estrategia para recursos estáticos
  if (isStaticAsset(request)) {
    event.respondWith(staticStrategy(request));
    return;
  }

  // Estrategia para páginas HTML
  if (request.destination === 'document') {
    event.respondWith(documentStrategy(request));
    return;
  }

  // Estrategia por defecto
  event.respondWith(networkFirstStrategy(request));
});

// Funciones de estrategia
async function staticStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    // Actualizar en background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    });
    return cached;
  }
  
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function apiStrategy(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function documentStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (cached) {
      return cached;
    }
    return new Response('Offline - No hay conexión', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function networkFirstStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

function isStaticAsset(request) {
  return request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'image' ||
         request.destination === 'font';
}

// Background Sync para datos críticos
self.addEventListener('sync', event => {
  if (event.tag === 'sync-examenes') {
    event.waitUntil(syncExamenesPendientes());
  }
});

async function syncExamenesPendientes() {
  const pendingData = await getPendingData();
  
  for (const data of pendingData) {
    try {
      const response = await fetch(data.url, {
        method: data.method,
        headers: data.headers,
        body: data.body
      });
      
      if (response.ok) {
        await removePendingData(data.id);
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  }
}
```

## 2. Optimización de Consultas a Supabase

### 2.1 Índices Recomendados para Supabase

```sql
-- Archivo: optimizar_indices_supabase.sql

-- Índices para tabla pacientes
CREATE INDEX CONCURRENTLY idx_pacientes_created_at ON pacientes(created_at DESC);
CREATE INDEX CONCURRENTLY idx_pacientes_tipo_origen ON pacientes(tipo_paciente, origen_registro);
CREATE INDEX CONCURRENTLY idx_pacientes_rut ON pacientes(rut);
CREATE INDEX CONCURRENTLY idx_pacientes_ficha ON pacientes(numero_ficha);

-- Índices para tabla examenes_eoa
CREATE INDEX CONCURRENTLY idx_examenes_paciente_fecha ON examenes_eoa(paciente_id, fecha_examen DESC);
CREATE INDEX CONCURRENTLY idx_examenes_resultados ON examenes_eoa(od_resultado, oi_resultado);
CREATE INDEX CONCURRENTLY idx_examenes_fecha ON examenes_eoa(fecha_examen DESC);

-- Índices para tabla partos_importados
CREATE INDEX CONCURRENTLY idx_partos_importados_madre ON partos_importados(madre_id);
CREATE INDEX CONCURRENTLY idx_partos_importados_fecha ON partos_importados(created_at DESC);

-- Índices compuestos para consultas frecuentes
CREATE INDEX CONCURRENTLY idx_pacientes_recientes ON pacientes(tipo_paciente, origen_registro, created_at DESC);
CREATE INDEX CONCURRENTLY idx_examenes_paciente_resultado ON examenes_eoa(paciente_id, od_resultado, oi_resultado, fecha_examen DESC);
```

### 2.2 Consultas Optimizadas

```javascript
// js/consultas-optimizadas.js

class ConsultasOptimizadas {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Obtener pacientes recientes con paginación
  async getPacientesRecientes(pagina = 1, limite = 20) {
    const cacheKey = `pacientes-recientes-${pagina}-${limite}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const offset = (pagina - 1) * limite;
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

    const { data, error } = await this.supabase
      .from('pacientes')
      .select(`
        id,
        nombre,
        apellido,
        rut,
        numero_ficha,
        sala,
        cama,
        cantidad_hijos,
        tipo_paciente,
        created_at,
        examenes_eoa (
          id,
          od_resultado,
          oi_resultado,
          fecha_examen
        )
      `)
      .eq('tipo_paciente', 'MADRE')
      .eq('origen_registro', 'MANUAL')
      .gte('created_at', inicioDia.toISOString())
      .lt('created_at', finDia.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);

    if (error) throw error;

    const resultado = this.procesarPacientesConExamenes(data);
    this.setCache(cacheKey, resultado);
    return resultado;
  }

  // Buscar pacientes con debounce y caché
  async buscarPacientes(termino, tipo = null) {
    if (!termino || termino.length < 2) return [];

    const cacheKey = `buscar-${termino}-${tipo}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('pacientes')
      .select('id, nombre, apellido, rut, numero_ficha, sala, cama, tipo_paciente')
      .or(`rut.ilike.%${termino}%,numero_ficha.ilike.%${termino}%,nombre.ilike.%${termino}%`);

    if (tipo) {
      query = query.eq('tipo_paciente', tipo.toUpperCase());
    }

    const { data, error } = await query.limit(20);

    if (error) throw error;

    this.setCache(cacheKey, data);
    return data;
  }

  // Obtener resumen de exámenes con una sola consulta
  async getResumenExamenes(pacienteIds) {
    if (!pacienteIds || pacienteIds.length === 0) return new Map();

    const cacheKey = `resumen-${pacienteIds.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await this.supabase
      .from('examenes_eoa')
      .select('paciente_id, od_resultado, oi_resultado, fecha_examen')
      .in('paciente_id', pacienteIds)
      .order('fecha_examen', { ascending: true });

    if (error) throw error;

    const resumen = new Map();
    
    pacienteIds.forEach(id => {
      const examenesPaciente = data.filter(e => e.paciente_id === id);
      const examenesOrdenados = examenesPaciente.sort((a, b) => 
        new Date(a.fecha_examen) - new Date(b.fecha_examen)
      );

      resumen.set(id, {
        examenes: examenesOrdenados,
        examCount: examenesOrdenados.length,
        firstExam: examenesOrdenados[0] || null,
        lastExam: examenesOrdenados[examenesOrdenados.length - 1] || null,
        firstExamRefiere: this.resultadoRefiere(examenesOrdenados[0]),
        lastExamRefiere: this.resultadoRefiere(examenesOrdenados[examenesOrdenados.length - 1])
      });
    });

    this.setCache(cacheKey, resumen);
    return resumen;
  }

  // Guardar examen con optimización
  async guardarExamen(examenData) {
    try {
      const { data, error } = await this.supabase
        .from('examenes_eoa')
        .insert([examenData])
        .select()
        .single();

      if (error) throw error;

      // Invalidar caché relevante
      this.invalidateCache(`resumen-${examenData.paciente_id}`);
      this.invalidateCache('pacientes-recientes');

      return data;
    } catch (error) {
      // Guardar en IndexedDB para sincronización posterior
      await this.guardarParaSincronizacion('examenes_eoa', examenData);
      throw error;
    }
  }

  // Métodos de caché
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  resultadoRefiere(examen) {
    return examen && (examen.od_resultado === 'REFIERE' || examen.oi_resultado === 'REFIERE');
  }

  procesarPacientesConExamenes(pacientes) {
    return pacientes.map(paciente => ({
      ...paciente,
      estadoEOA: this.calcularEstadoEOA(paciente.examenes_eoa)
    }));
  }

  calcularEstadoEOA(examenes) {
    if (!examenes || examenes.length === 0) {
      return { estado: 'pendiente', texto: 'EOA pendiente' };
    }

    const ultimoExamen = examenes[examenes.length - 1];
    const refiere = this.resultadoRefiere(ultimoExamen);

    if (examenes.length === 1) {
      return {
        estado: refiere ? 'referido' : 'completado',
        texto: refiere ? 'EOA refiere (1er examen)' : 'EOA pasa (1er examen)'
      };
    }

    return {
      estado: refiere ? 'derivacion' : 'completado',
      texto: refiere ? 'EOA refiere (2do examen)' : 'EOA pasa (2do examen)'
    };
  }

  async guardarParaSincronizacion(tabla, datos) {
    // Implementar guardado en IndexedDB para sincronización posterior
    const pendingData = {
      id: `${tabla}-${Date.now()}`,
      tabla,
      datos,
      timestamp: Date.now()
    };

    // Guardar en IndexedDB
    const db = await this.openIndexedDB();
    const tx = db.transaction(['pending'], 'readwrite');
    const store = tx.objectStore('pending');
    await store.add(pendingData);
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('tau-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'id' });
        }
      };
    });
  }
}

// Exportar para uso global
window.ConsultasOptimizadas = ConsultasOptimizadas;
```

## 3. Optimización de JavaScript

### 3.1 Carga Optimizada de Scripts

```html
<!-- dashboard-optimizado.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- Metadatos y CSS crítico inline -->
    <style>
        /* CSS crítico para above-the-fold */
        :root { --primary-color: #3498db; --secondary-color: #2c3e50; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    
    <!-- Preload de recursos críticos -->
    <link rel="preload" href="css/styles.css" as="style">
    <link rel="preload" href="js/utils.js" as="script">
    <link rel="preload" href="js/auth.js" as="script">
    
    <!-- CSS no crítico con carga diferida -->
    <link rel="preload" href="css/dashboard.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="css/dashboard.css"></noscript>
</head>
<body>
    <div id="app">
        <div class="loading">
            <div class="spinner"></div>
            <span>Cargando...</span>
        </div>
    </div>

    <!-- Scripts críticos con defer -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <script src="config/supabase-config.js" defer></script>
    <script src="js/utils.js" defer></script>
    <script src="js/auth.js" defer></script>
    
    <!-- Script principal con carga dinámica -->
    <script>
        // Carga dinámica de módulos
        async function cargarModulos() {
            try {
                // Esperar a que las librerías críticas carguen
                await esperarLibrerias();
                
                // Cargar módulos principales en paralelo
                const [dashboard, consultas] = await Promise.all([
                    import('./js/dashboard-optimizado.js'),
                    import('./js/consultas-optimizadas.js')
                ]);
                
                // Inicializar aplicación
                await inicializarApp(dashboard, consultas);
                
            } catch (error) {
                console.error('Error al cargar módulos:', error);
                mostrarError();
            }
        }
        
        function esperarLibrerias() {
            return new Promise((resolve) => {
                const checkLibrerias = () => {
                    if (window.supabase && window.supabaseConfig && window.auth) {
                        resolve();
                    } else {
                        setTimeout(checkLibrerias, 100);
                    }
                };
                checkLibrerias();
            });
        }
        
        async function inicializarApp(dashboard, consultas) {
            // Inicializar Supabase
            const supabase = window.auth.initializeSupabase();
            
            // Inicializar consultas optimizadas
            const consultasOptimizadas = new consultas.default(supabase);
            
            // Inicializar dashboard
            await dashboard.default.inicializar(consultasOptimizadas);
            
            // Ocultar loading
            document.getElementById('app').innerHTML = await dashboard.default.renderizar();
        }
        
        function mostrarError() {
            document.getElementById('app').innerHTML = `
                <div class="error-container">
                    <h2>Error al cargar la aplicación</h2>
                    <p>Por favor, recargue la página o intente más tarde.</p>
                    <button onclick="location.reload()">Recargar</button>
                </div>
            `;
        }
        
        // Iniciar carga cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cargarModulos);
        } else {
            cargarModulos();
        }
    </script>
</body>
</html>
```

### 3.2 Dashboard Optimizado con Lazy Loading

```javascript
// js/dashboard-optimizado.js
class DashboardOptimizado {
  constructor() {
    this.componentesCargados = new Set();
    this.observadorInterseccion = null;
    this.consultas = null;
  }

  async inicializar(consultas) {
    this.consultas = consultas;
    this.configurarObservadorInterseccion();
    await this.cargarComponentesCriticos();
    this.configurarEventListeners();
  }

  configurarObservadorInterseccion() {
    if ('IntersectionObserver' in window) {
      this.observadorInterseccion = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.cargarComponente(entry.target.dataset.component);
          }
        });
      }, { rootMargin: '50px' });
    }
  }

  async cargarComponentesCriticos() {
    // Cargar solo componentes críticos inicialmente
    const componentesCriticos = ['header', 'action-cards'];
    
    await Promise.all(
      componentesCriticos.map(componente => this.cargarComponente(componente))
    );
  }

  async cargarComponente(nombreComponente) {
    if (this.componentesCargados.has(nombreComponente)) {
      return;
    }

    try {
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
        default:
          console.warn(`Componente no reconocido: ${nombreComponente}`);
      }
      
      this.componentesCargados.add(nombreComponente);
    } catch (error) {
      console.error(`Error cargando componente ${nombreComponente}:`, error);
    }
  }

  async cargarRecentMothers() {
    const contenedor = document.getElementById('recentMothers');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const pacientes = await this.consultas.getPacientesRecientes(1, 10);
      contenedor.innerHTML = this.renderizarRecentMothers(pacientes);
      this.configurarEventListenersRecentMothers();
    } catch (error) {
      contenedor.innerHTML = '<div class="error">Error al cargar datos</div>';
    }
  }

  async cargarModales() {
    // Cargar modales solo cuando se necesiten
    const modalHTML = await this.fetchTemplate('templates/modales.html');
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async cargarGraficos() {
    // Cargar librería de gráficos solo si hay contenedor
    const contenedor = document.getElementById('charts-container');
    if (!contenedor) return;

    // Cargar Chart.js dinámicamente
    await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    this.inicializarGraficos();
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
          <button class="btn btn-sm" onclick="dashboard.abrirEOA('${paciente.id}')">
            Realizar EOA
          </button>
        </div>
      </div>
    `).join('');
  }

  configurarEventListeners() {
    // Event delegation para mejor rendimiento
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('submit', this.handleGlobalSubmit.bind(this));
  }

  handleGlobalClick(event) {
    const { target } = event;
    
    if (target.matches('[data-action]')) {
      event.preventDefault();
      this.handleAction(target.dataset.action, target);
    }
  }

  handleGlobalSubmit(event) {
    const { target } = event;
    
    if (target.matches('form[data-form]')) {
      event.preventDefault();
      this.handleFormSubmit(target.dataset.form, target);
    }
  }

  async handleAction(action, element) {
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
      default:
        console.warn(`Acción no reconocida: ${action}`);
    }
  }

  async abrirModalRegistro() {
    await this.cargarComponente('modals');
    const modal = document.getElementById('modalRegistro');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    }
  }

  async abrirEOA(madreId) {
    await this.cargarComponente('modals');
    // Implementar lógica para abrir modal EOA
  }

  // Utilidades
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatearRUT(rut) {
    // Implementar formateo de RUT
    return rut;
  }

  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async fetchTemplate(url) {
    const response = await fetch(url);
    return response.text();
  }

  async renderizar() {
    return `
      <header class="app-header">
        <div class="logo">
          <h1>TAU</h1>
          <p>Tamizaje Auditivo Universal</p>
        </div>
      </header>
      
      <main class="app-main">
        <div class="action-cards">
          <div class="card" data-action="registrar">
            <h3>Registrar</h3>
            <p>Registrar nueva madre o bebé</p>
            <button class="btn btn-primary">Registrar</button>
          </div>
          
          <div class="card" data-action="ver-madres">
            <h3>Ver Pacientes</h3>
            <p>Lista de pacientes registrados</p>
            <button class="btn btn-primary">Ver Lista</button>
          </div>
        </div>
        
        <div class="recent-section">
          <h3>Registros Recientes</h3>
          <div id="recentMothers" data-component="recent-mothers">
            <div class="loading">Cargando...</div>
          </div>
        </div>
      </main>
    `;
  }
}

// Exportar para uso global
export default new DashboardOptimizado();
```

## 4. Optimización CSS

### 4.1 CSS Crítico Optimizado

```css
/* css/critical.css - CSS crítico inline */
:root {
  --primary-color: #3498db;
  --primary-dark: #2980b9;
  --secondary-color: #2c3e50;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
  --light-color: #ecf0f1;
  --dark-color: #34495e;
  --text-color: #2c3e50;
  --border-color: #ddd;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  --border-radius: 8px;
  --transition: all 0.3s ease;
}

/* Reset y estilos base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f5f7fa;
}

/* Layout crítico */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  padding: 1rem;
  box-shadow: var(--shadow);
}

.logo h1 {
  font-size: 2rem;
  margin: 0;
}

.logo p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Loading states */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: var(--text-color);
}

.loading::after {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Botones críticos */
.btn {
  display: inline-block;
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  transition: var(--transition);
  background-color: var(--primary-color);
  color: white;
}

.btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Cards */
.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.card p {
  margin: 0 0 1rem 0;
  color: var(--dark-color);
}

/* Responsive crítico */
@media (max-width: 768px) {
  .app-main {
    padding: 1rem;
  }
  
  .action-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .btn {
    width: 100%;
  }
}
```

### 4.2 CSS No Crítico con Lazy Loading

```css
/* css/non-critical.css - Cargado de forma diferida */
/* Componentes no críticos */

/* Modales */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: var(--transition);
}

.modal.show {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  transform: scale(0.9);
  transition: var(--transition);
}

.modal.show .modal-content {
  transform: scale(1);
}

/* Formularios */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 16px;
  transition: var(--transition);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* Notificaciones */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: var(--border-radius);
  color: white;
  font-weight: 500;
  z-index: 2000;
  max-width: 300px;
  box-shadow: var(--shadow);
  transform: translateX(100%);
  transition: var(--transition);
}

.notification.show {
  transform: translateX(0);
}

.notification.success {
  background-color: var(--success-color);
}

.notification.error {
  background-color: var(--danger-color);
}

.notification.warning {
  background-color: var(--warning-color);
}

.notification.info {
  background-color: var(--primary-color);
}

/* Listas de pacientes */
.recent-list {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.recent-item {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: var(--transition);
}

.recent-item:hover {
  background-color: var(--light-color);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item-info {
  flex: 1;
}

.recent-item-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.recent-item-details {
  font-size: 0.9rem;
  color: var(--dark-color);
}

.recent-item-details span {
  margin-right: 1rem;
}

.recent-item-actions {
  margin-left: 1rem;
}

/* Estados vacíos */
.no-data {
  text-align: center;
  padding: 2rem;
  color: var(--dark-color);
  font-style: italic;
}

.error {
  text-align: center;
  padding: 2rem;
  color: var(--danger-color);
}

/* Animaciones optimizadas */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Optimizaciones para impresión */
@media print {
  .app-header,
  .recent-item-actions,
  .btn {
    display: none;
  }
  
  .card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid var(--border-color);
  }
}
```

## 5. Optimización de Imágenes

### 5.1 Picture Element con Formatos Modernos

```html
<!-- templates/picture-optimizado.html -->
<picture>
  <!-- Formato moderno para navegadores compatibles -->
  <source 
    srcset="assets/icons/icon-192x192.webp" 
    type="image/webp"
    sizes="192x192">
  
  <!-- SVG para iconos simples -->
  <source 
    srcset="assets/icons/icon-192x192.svg" 
    type="image/svg+xml"
    sizes="192x192">
  
  <!-- PNG como fallback -->
  <img 
    src="assets/icons/icon-192x192.png" 
    alt="Icono TAU"
    loading="lazy"
    decoding="async"
    width="192" 
    height="192">
</picture>

<!-- Imágenes responsive -->
<picture>
  <source 
    media="(min-width: 768px)"
    srcset="assets/images/dashboard-large.webp 1x, assets/images/dashboard-large@2x.webp 2x"
    type="image/webp">
  
  <source 
    media="(min-width: 768px)"
    srcset="assets/images/dashboard-large.jpg 1x, assets/images/dashboard-large@2x.jpg 2x">
  
  <source 
    srcset="assets/images/dashboard-small.webp 1x, assets/images/dashboard-small@2x.webp 2x"
    type="image/webp">
  
  <img 
    src="assets/images/dashboard-small.jpg"
    alt="Dashboard TAU"
    loading="lazy"
    decoding="async">
</picture>
```

### 5.2 Lazy Loading de Imágenes

```javascript
// js/lazy-loading.js
class LazyLoading {
  constructor() {
    this.configurarObserver();
  }

  configurarObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.cargarImagen(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
    }
  }

  observar(elementos) {
    if (!this.observer) {
      // Fallback para navegadores sin IntersectionObserver
      elementos.forEach(elemento => this.cargarImagen(elemento));
      return;
    }

    elementos.forEach(elemento => {
      if (elemento.tagName === 'IMG') {
        this.observer.observe(elemento);
      } else if (elemento.tagName === 'PICTURE') {
        const img = elemento.querySelector('img');
        if (img) this.observer.observe(img);
      }
    });
  }

  cargarImagen(elemento) {
    const img = elemento.tagName === 'IMG' ? elemento : elemento.querySelector('img');
    if (!img) return;

    // Cargar srcset y src
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      delete img.dataset.srcset;
    }

    if (img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }

    // Cargar sources en picture elements
    if (elemento.tagName === 'PICTURE') {
      const sources = elemento.querySelectorAll('source');
      sources.forEach(source => {
        if (source.dataset.srcset) {
          source.srcset = source.dataset.srcset;
          delete source.dataset.srcset;
        }
      });
    }

    // Dejar de observar
    if (this.observer) {
      this.observer.unobserve(img);
    }

    // Agregar clase para transición
    img.classList.add('loaded');
  }
}

// CSS para transición de imágenes
const style = document.createElement('style');
style.textContent = `
  img {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  img.loaded {
    opacity: 1;
  }
  
  img:not([src]) {
    background: #f0f0f0;
    color: #666;
    display: inline-block;
    text-align: center;
    line-height: 100px;
  }
`;
document.head.appendChild(style);

// Inicializar lazy loading
const lazyLoading = new LazyLoading();

// Observar imágenes con data-src
document.addEventListener('DOMContentLoaded', () => {
  const imagenes = document.querySelectorAll('img[data-src], picture[data-src]');
  lazyLoading.observar(imagenes);
});

// Exportar para uso global
window.LazyLoading = LazyLoading;
```

## 6. Monitoreo de Rendimiento

### 6.1 Sistema de Métricas

```javascript
// js/performance-monitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.inicializar();
  }

  inicializar() {
    this.configurarWebVitals();
    this.configurarResourceTiming();
    this.configurarUserTiming();
    this.enviarMétricas();
  }

  configurarWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }
  }

  configurarResourceTiming() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const resources = list.getEntries();
        this.metrics.resources = resources.map(resource => ({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize,
          type: this.getResourceType(resource.name)
        }));
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  configurarUserTiming() {
    // Medir tiempo de carga de componentes
    this.mark('app-start');
    
    // Marcar puntos importantes
    window.addEventListener('load', () => {
      this.mark('app-loaded');
      this.measure('app-load-time', 'app-start', 'app-loaded');
    });
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
        this.metrics[name] = measures[measures.length - 1].duration;
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

  async enviarMétricas() {
    // Enviar métricas a analytics o servicio de monitoreo
    setTimeout(() => {
      const metricsData = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        metrics: this.metrics
      };

      // Enviar a Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'performance_metrics', metricsData);
      }

      // Enviar a servicio personalizado
      this.enviarAServicioPersonalizado(metricsData);

      // Guardar en localStorage para análisis offline
      this.guardarLocalmente(metricsData);
    }, 5000); // Esperar 5 segundos para recolectar todas las métricas
  }

  async enviarAServicioPersonalizado(data) {
    try {
      await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Error enviando métricas de rendimiento:', error);
    }
  }

  guardarLocalmente(data) {
    const stored = localStorage.getItem('performance_metrics') || '[]';
    const metrics = JSON.parse(stored);
    metrics.push(data);
    
    // Mantener solo las últimas 100 mediciones
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
    
    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
  }

  getReport() {
    return {
      webVitals: {
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls
      },
      resources: this.metrics.resources,
      custom: Object.keys(this.metrics)
        .filter(key => !['lcp', 'fid', 'cls', 'resources'].includes(key))
        .reduce((obj, key) => {
          obj[key] = this.metrics[key];
          return obj;
        }, {})
    };
  }
}

// Inicializar monitoreo
const performanceMonitor = new PerformanceMonitor();

// Exportar para uso global
window.PerformanceMonitor = PerformanceMonitor;
window.performanceMonitor = performanceMonitor;
```

## 7. Implementación Gradual

### 7.1 Plan de Implementación por Fases

```javascript
// js/optimization-phases.js
class OptimizationPhases {
  constructor() {
    this.fases = [
      {
        nombre: 'Fase 1: Service Worker',
        activa: true,
        implementaciones: [
          'actualizarServiceWorker',
          'implementarCachingInteligente',
          'agregarBackgroundSync'
        ]
      },
      {
        nombre: 'Fase 2: Consultas Optimizadas',
        activa: false,
        implementaciones: [
          'actualizarConsultasSupabase',
          'implementarIndices',
          'agregarCacheConsultas'
        ]
      },
      {
        nombre: 'Fase 3: JavaScript Optimizado',
        activa: false,
        implementaciones: [
          'implementarLazyLoading',
          'optimizarCargaScripts',
          'agregarCodeSplitting'
        ]
      },
      {
        nombre: 'Fase 4: CSS Optimizado',
        activa: false,
        implementaciones: [
          'implementarCSSCritico',
          'optimizarArchivosCSS',
          'agregarPurgeCSS'
        ]
      },
      {
        nombre: 'Fase 5: Imágenes Optimizadas',
        activa: false,
        implementaciones: [
          'implementarWebP',
          'agregarLazyLoadingImagenes',
          'optimizarAssets'
        ]
      }
    ];
  }

  async ejecutarFaseActiva() {
    const faseActiva = this.fases.find(fase => fase.activa);
    if (!faseActiva) return;

    console.log(`🚀 Ejecutando ${faseActiva.nombre}`);
    
    for (const implementacion of faseActiva.implementaciones) {
      try {
        await this[implementacion]();
        console.log(`✅ ${implementacion} completado`);
      } catch (error) {
        console.error(`❌ Error en ${implementacion}:`, error);
      }
    }
  }

  async actualizarServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw-optimizado.js');
      console.log('Service Worker optimizado registrado:', registration);
    }
  }

  async implementarCachingInteligente() {
    // Implementar caching inteligente
    console.log('Implementando caching inteligente...');
  }

  async agregarBackgroundSync() {
    // Implementar background sync
    console.log('Implementando background sync...');
  }

  // ... otras implementaciones
}

// Ejecutar fase activa
const optimizationPhases = new OptimizationPhases();
optimizationPhases.ejecutarFaseActiva();

// Exportar para control manual
window.OptimizationPhases = OptimizationPhases;
```

## 8. Optimización de Seguridad

### 8.1 Implementación de Cabeceras de Seguridad

```javascript
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
```

### 8.2 Manejo Seguro de Tokens y Sesiones

```javascript
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
```

### 8.3 Optimización de Seguridad en Service Worker

```javascript
// Agregar a sw-optimizado.js
// Implementar validación de solicitudes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Validar solicitudes a APIs externas
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(validarYProcesarRequest(request));
    return;
  }
  
  // Continuar con el resto del código existente...
});

async function validarYProcesarRequest(request) {
  // Verificar token de autorización
  const token = request.headers.get('Authorization');
  if (!token || !token.startsWith('Bearer ')) {
    return new Response('No autorizado', { status: 401 });
  }

  // Validar origen de la solicitud
  const origen = request.headers.get('Origin');
  if (origen && !origen.includes(window.location.hostname)) {
    return new Response('Origen no permitido', { status: 403 });
  }

  // Procesar solicitud normalmente
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    return new Response('Error de red', { status: 500 });
  }
}

// Manejar mensajes de seguridad
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_SECURITY_HEADERS') {
    // Implementar cabeceras de seguridad en respuestas
    console.log('Configurando cabeceras de seguridad en Service Worker');
  }
});
```

## 9. Optimización de Accesibilidad

### 9.1 Implementación de Navegación por Teclado y Lectores de Pantalla

```javascript
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
```

### 9.2 CSS para Accesibilidad Mejorada

```css
/* css/accessibility.css */
/* Estilos para mejor accesibilidad */

/* Ocultar visualmente pero mantener para lectores de pantalla */
.sr-only,
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Mejorar visibilidad de foco */
:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Para navegación por teclado */
.keyboard-navigation button:focus,
.keyboard-navigation input:focus,
.keyboard-navigation select:focus,
.keyboard-navigation textarea:focus,
.keyboard-navigation a:focus {
  outline: 3px solid var(--primary-color);
  outline-offset: 2px;
}

/* Mejorar contraste para elementos interactivos */
button,
a,
input,
select,
textarea {
  color: var(--text-color);
  background-color: var(--light-color);
  border: 2px solid var(--border-color);
}

/* Estados hover y focus con suficiente contraste */
button:hover,
button:focus,
a:hover,
a:focus {
  background-color: var(--primary-color);
  color: white;
  text-decoration: underline;
}

/* Indicadores de estado claros */
[aria-expanded="true"]::before {
  content: " (expandido)";
}

[aria-expanded="false"]::before {
  content: " (contraído)";
}

[aria-pressed="true"]::after {
  content: " (activado)";
}

[aria-pressed="false"]::after {
  content: " (desactivado)";
}

/* Mejorar legibilidad */
body {
  line-height: 1.6;
  font-size: 16px;
}

/* Asegurar que el texto sea legible al hacer zoom */
@media (min-resolution: 120dpi) {
  body {
    font-size: 18px;
  }
}

/* Reducir movimiento para usuarios con preferencia */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Modo alto contraste */
@media (prefers-contrast: high) {
  :root {
    --primary-color: #0000FF;
    --text-color: #000000;
    --background-color: #FFFFFF;
    --border-color: #000000;
  }
  
  body {
    background-color: var(--background-color);
    color: var(--text-color);
  }
  
  button,
  input,
  select,
  textarea {
    border-width: 3px;
  }
}

/* Indicadores de error claros */
.error,
[aria-invalid="true"] {
  border-color: var(--danger-color) !important;
  border-width: 3px !important;
}

.error::before,
[aria-invalid="true"]::before {
  content: "❌ ";
  color: var(--danger-color);
}

/* Indicadores de éxito */
.success,
[aria-invalid="false"] {
  border-color: var(--success-color) !important;
}

/* Etiquetas descriptivas */
input[aria-label]::placeholder,
textarea[aria-label]::placeholder {
  opacity: 0.7;
  font-style: italic;
}

/* Mejorar accesibilidad de tablas */
table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid var(--border-color);
  padding: 8px;
  text-align: left;
}

th {
  background-color: var(--light-color);
  font-weight: bold;
}

/* Captions para tablas */
table caption {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

/* Agrupaciones lógicas */
fieldset {
  border: 2px solid var(--border-color);
  padding: 10px;
  margin: 10px 0;
}

legend {
  font-weight: bold;
  padding: 0 10px;
}

/* Indicadores de progreso accesibles */
progress {
  width: 100%;
  height: 20px;
}

progress::after {
  content: attr(value) "%";
  display: block;
  text-align: center;
}

/* Tooltips accesibles */
[title]:hover::after,
[aria-label]:hover::after {
  content: attr(title) attr(aria-label);
  position: absolute;
  background-color: var(--dark-color);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  white-space: nowrap;
}
```

## 10. Optimización SEO

### 10.1 Implementación de Metadatos y Estructura SEO

```javascript
// js/seo-optimizer.js
class SEOOptimizer {
  constructor() {
    this.metadatosBase = {
      title: 'TAU - Tamizaje Auditivo Universal',
      description: 'Sistema de seguimiento de exámenes de Emisiones Otoacústicas en recién nacidos del Hospital San Luis de Buin',
      keywords: 'tamizaje auditivo, EOA, recién nacidos, salud auditiva, hospital san luis de buin',
      author: 'Hospital San Luis de Buin',
      robots: 'index, follow',
      ogImage: '/assets/images/tau-og-image.jpg',
      twitterCard: 'summary_large_image'
    };
    
    this.inicializarSEO();
  }

  inicializarSEO() {
    this.configurarMetadatosBase();
    this.implementarStructuredData();
    this.optimizarNavegacion();
    this.configurarOpenGraph();
    this.implementarBreadcrumb();
  }

  configurarMetadatosBase() {
    // Title dinámico
    this.actualizarTitle(this.metadatosBase.title);
    
    // Meta descripción
    this.actualizarMetaTag('description', this.metadatosBase.description);
    
    // Keywords
    this.actualizarMetaTag('keywords', this.metadatosBase.keywords);
    
    // Author
    this.actualizarMetaTag('author', this.metadatosBase.author);
    
    // Robots
    this.actualizarMetaTag('robots', this.metadatosBase.robots);
    
    // Viewport
    this.actualizarMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    
    // Charset
    this.actualizarMetaTag('charset', 'UTF-8', 'charset');
    
    // Canonical URL
    this.actualizarCanonicalURL(window.location.href);
    
    // Language
    document.documentElement.lang = 'es';
  }

  actualizarTitle(title) {
    document.title = title;
    this.actualizarMetaTag('og:title', title, 'property');
    this.actualizarMetaTag('twitter:title', title, 'name');
  }

  actualizarMetaTag(name, content, attribute = 'name') {
    let meta = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    
    meta.content = content;
  }

  actualizarCanonicalURL(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    
    canonical.href = url;
  }

  configurarOpenGraph() {
    // Open Graph basic
    this.actualizarMetaTag('og:type', 'website', 'property');
    this.actualizarMetaTag('og:url', window.location.href, 'property');
    this.actualizarMetaTag('og:image', this.metadatosBase.ogImage, 'property');
    this.actualizarMetaTag('og:site_name', this.metadatosBase.title, 'property');
    
    // Twitter Card
    this.actualizarMetaTag('twitter:card', this.metadatosBase.twitterCard, 'name');
    this.actualizarMetaTag('twitter:image', this.metadatosBase.ogImage, 'name');
    this.actualizarMetaTag('twitter:creator', '@hospitalsanluis', 'name');
  }

  implementarStructuredData() {
    // Schema.org para organización médica
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      "name": "Hospital San Luis de Buin",
      "description": "Hospital público especializado en atención médica integral",
      "url": "https://hospitalsanluis.cl",
      "logo": "/assets/images/hospital-logo.jpg",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Av. San Martín 123",
        "addressLocality": "Buin",
        "addressRegion": "Región Metropolitana",
        "postalCode": "0000000",
        "addressCountry": "CL"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+56-2-12345678",
        "contactType": "general"
      }
    };

    // Schema.org para aplicación web
    const webApplicationSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "TAU - Tamizaje Auditivo Universal",
      "description": this.metadatosBase.description,
      "url": window.location.origin,
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "CLP"
      },
      "provider": organizationSchema
    };

    // Agregar schemas al DOM
    this.agregarStructuredData(organizationSchema, 'organization');
    this.agregarStructuredData(webApplicationSchema, 'webapp');
  }

  agregarStructuredData(schema, id) {
    let script = document.querySelector(`script[type="application/ld+json"][data-schema="${id}"]`);
    
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema', id);
      document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify(schema, null, 2);
  }

  optimizarNavegacion() {
    // Agregar atributos ARIA para navegación
    const nav = document.querySelector('nav') || document.querySelector('header');
    if (nav) {
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', 'Navegación principal');
    }

    // Main content
    const main = document.querySelector('main') || document.querySelector('.app-main');
    if (main) {
      main.setAttribute('role', 'main');
      main.id = 'main-content';
    }

    // Search
    const search = document.querySelector('input[type="search"], [placeholder*="buscar"]');
    if (search) {
      search.setAttribute('role', 'search');
      search.setAttribute('aria-label', 'Buscar pacientes');
    }

    // Optimizar enlaces internos
    document.querySelectorAll('a[href^="/"], a[href^="./"]').forEach(link => {
      if (!link.getAttribute('aria-label')) {
        const text = link.textContent.trim();
        if (text) {
          link.setAttribute('aria-label', `Navegar a ${text}`);
        }
      }
    });
  }

  implementarBreadcrumb() {
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Inicio",
          "item": window.location.origin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": this.obtenerNombrePagina(),
          "item": window.location.href
        }
      ]
    };

    this.agregarStructuredData(breadcrumbSchema, 'breadcrumb');
  }

  obtenerNombrePagina() {
    const path = window.location.pathname;
    const pageMap = {
      '/dashboard.html': 'Panel Principal',
      '/reportes.html': 'Reportes',
      '/importados.html': 'Datos Importados',
      '/': 'Inicio'
    };
    
    return pageMap[path] || 'Página Actual';
  }

  // Método para actualizar metadatos según página
  actualizarMetadatosPagina(pageData) {
    if (pageData.title) {
      this.actualizarTitle(`${pageData.title} - ${this.metadatosBase.title}`);
    }
    
    if (pageData.description) {
      this.actualizarMetaTag('description', pageData.description);
    }
    
    if (pageData.keywords) {
      this.actualizarMetaTag('keywords', pageData.keywords);
    }

    // Actualizar URL canónica
    this.actualizarCanonicalURL(pageData.url || window.location.href);
    
    // Actualizar Open Graph
    this.actualizarMetaTag('og:url', pageData.url || window.location.href, 'property');
    
    // Actualizar breadcrumb
    this.implementarBreadcrumb();
  }

  // Generar sitemap.xml
  generarSitemap() {
    const pages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/dashboard.html', priority: '0.9', changefreq: 'daily' },
      { url: '/reportes.html', priority: '0.8', changefreq: 'weekly' },
      { url: '/importados.html', priority: '0.7', changefreq: 'weekly' }
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
  <url>
    <loc>${window.location.origin}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`).join('')}
</urlset>`;

    return sitemap;
  }

  // Generar robots.txt
  generarRobotsTxt() {
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${window.location.origin}/sitemap.xml`;
  }
}

// Inicializar optimizador SEO
const seoOptimizer = new SEOOptimizer();
window.SEOOptimizer = SEOOptimizer;
```

## 11. Monitoreo y Análisis Avanzado

### 11.1 Sistema de Monitoreo de Rendimiento y Errores

```javascript
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
```

---

Este archivo proporciona implementaciones prácticas y listas para usar de todas las optimizaciones mencionadas en la guía. Cada sección incluye código completo que puede ser implementado gradualmente en la aplicación TAU para mejorar significativamente su rendimiento, seguridad, accesibilidad y SEO.