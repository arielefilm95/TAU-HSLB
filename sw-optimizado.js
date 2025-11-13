// Service Worker Optimizado para TAU - Tamizaje Auditivo Universal
// Implementa estrategias avanzadas de caché y sincronización

const CACHE_VERSION = 'tau-v2.0.0';
const STATIC_CACHE = `tau-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tau-dynamic-${CACHE_VERSION}`;
const API_CACHE = `tau-api-${CACHE_VERSION}`;

// Estrategias de caché por tipo de recurso
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',      // Para assets estáticos
  DYNAMIC: 'stale-while-revalidate', // Para contenido dinámico
  API: 'network-first',       // Para llamadas a API
  OFFLINE: 'cache-only'       // Para modo offline
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

// Límites de caché por tipo (en MB)
const CACHE_LIMITS = {
  STATIC: 10,    // 10MB para recursos estáticos
  DYNAMIC: 50,   // 50MB para contenido dinámico
  API: 5         // 5MB para respuestas de API
};

// Instalación con caché por capas
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando versión optimizada...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Error en instalación:', error);
        // No fallar completamente si algunos recursos no se cachean
        return self.skipWaiting();
      })
  );
});

// Activación con limpieza de cachés antiguos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando versión optimizada...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => !cacheName.includes(CACHE_VERSION))
            .map(cacheName => {
              console.log('Service Worker: Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Activación completada');
        return self.clients.claim();
      })
      .then(() => {
        // Limpiar cachés que exceden los límites
        return Promise.all([
          cleanCache(STATIC_CACHE, CACHE_LIMITS.STATIC),
          cleanCache(DYNAMIC_CACHE, CACHE_LIMITS.DYNAMIC),
          cleanCache(API_CACHE, CACHE_LIMITS.API)
        ]);
      })
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
    }).catch(() => {
      // Ignorar errores de actualización
    });
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('Service Worker: Error cargando recurso estático:', error);
    throw error;
  }
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
    console.warn('Service Worker: Error de red, intentando caché para API:', error);
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
    // Página offline si no hay caché
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - TAU</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline">
            <div class="icon">📱</div>
            <h1>Modo Offline</h1>
            <p>No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
      </html>
    `, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
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

// Función para limpiar caché por tamaño
async function cleanCache(cacheName, maxSizeMB) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  let totalSize = 0;
  const entries = [];
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const size = await getResponseSize(response);
      totalSize += size;
      entries.push({ request, response, size });
    }
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (totalSize > maxSizeBytes) {
    console.log(`Service Worker: Limpiando caché ${cacheName}, tamaño actual: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Ordenar por antigüedad (más viejos primero)
    entries.sort((a, b) => {
      const dateA = a.response.headers.get('date');
      const dateB = b.response.headers.get('date');
      return new Date(dateA) - new Date(dateB);
    });
    
    // Eliminar entradas hasta alcanzar el límite
    let currentSize = totalSize;
    for (const entry of entries) {
      if (currentSize <= maxSizeBytes * 0.8) break; // Dejar 20% de margen
      
      await cache.delete(entry.request);
      currentSize -= entry.size;
    }
    
    console.log(`Service Worker: Caché ${cacheName} limpiado, nuevo tamaño: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
  }
}

// Función para obtener tamaño de respuesta
async function getResponseSize(response) {
  const clone = response.clone();
  const buffer = await clone.arrayBuffer();
  return buffer.byteLength;
}

// Background Sync para datos críticos
self.addEventListener('sync', event => {
  console.log('Service Worker: Evento de sincronización:', event.tag);
  
  if (event.tag === 'sync-examenes') {
    event.waitUntil(syncExamenesPendientes());
  }
  
  if (event.tag === 'sync-pacientes') {
    event.waitUntil(syncPacientesPendientes());
  }
});

// Sincronizar exámenes pendientes
async function syncExamenesPendientes() {
  try {
    const pendingData = await getPendingData('examenes');
    
    if (pendingData.length > 0) {
      console.log(`Service Worker: Sincronizando ${pendingData.length} exámenes pendientes`);
      
      for (const data of pendingData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body
          });
          
          if (response.ok) {
            await removePendingData(data.id, 'examenes');
            console.log('Service Worker: Examen sincronizado exitosamente');
          } else {
            console.error('Service Worker: Error en sincronización de examen:', response.status);
          }
        } catch (error) {
          console.error('Service Worker: Error sincronizando examen:', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Error en sincronización de exámenes:', error);
  }
}

// Sincronizar pacientes pendientes
async function syncPacientesPendientes() {
  try {
    const pendingData = await getPendingData('pacientes');
    
    if (pendingData.length > 0) {
      console.log(`Service Worker: Sincronizando ${pendingData.length} pacientes pendientes`);
      
      for (const data of pendingData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body
          });
          
          if (response.ok) {
            await removePendingData(data.id, 'pacientes');
            console.log('Service Worker: Paciente sincronizado exitosamente');
          } else {
            console.error('Service Worker: Error en sincronización de paciente:', response.status);
          }
        } catch (error) {
          console.error('Service Worker: Error sincronizando paciente:', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Error en sincronización de pacientes:', error);
  }
}

// Funciones para manejar IndexedDB (datos pendientes)
async function getPendingData(type = null) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tau-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readonly');
      const store = transaction.objectStore('pending');
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => {
        const allData = getAllRequest.result || [];
        if (type) {
          resolve(allData.filter(item => item.type === type));
        } else {
          resolve(allData);
        }
      };
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
    };
  });
}

async function removePendingData(id, type = null) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tau-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending'], 'readwrite');
      const store = transaction.objectStore('pending');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    };
  });
}

// Manejo de notificaciones push
self.addEventListener('push', event => {
  console.log('Service Worker: Recibida notificación push');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de TAU',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir TAU',
        icon: './assets/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: './assets/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TAU - Tamizaje Auditivo Universal', options)
  );
});

// Manejo de clic en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Clic en notificación');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./dashboard.html')
    );
  } else if (event.action === 'close') {
    console.log('Service Worker: Notificación cerrada');
  } else {
    event.waitUntil(
      clients.openWindow('./dashboard.html')
    );
  }
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', event => {
  console.log('Service Worker: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(
      self.skipWaiting().then(() => {
        console.log('Service Worker: Skip waiting completado');
      })
    );
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
        .then(() => {
          console.log('Service Worker: URLs cacheadas exitosamente');
        })
    );
  }
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(
      Promise.all([
        syncExamenesPendientes(),
        syncPacientesPendientes()
      ])
    );
  }
});

console.log('Service Worker optimizado cargado correctamente');