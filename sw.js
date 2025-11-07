// Service Worker para TAU - Tamizaje Auditivo Universal

const CACHE_NAME = 'tau-v1.0.7';

// URLs relativas para funcionar en cualquier dominio o subdirectorio
const urlsToCache = [
    './',
    './index.html',
    './signup.html',
    './dashboard.html',
    './test-auth-flow.html',
    './css/styles.css',
    './css/auth.css',
    './css/dashboard.css',
    './js/utils.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/madres.js',
    './js/eoa.js',
    './js/service-worker-comms.js',
    './manifest.json',
    './assets/icons/icon-72x72.png',
    './assets/icons/icon-96x96.png',
    './assets/icons/icon-128x128.png',
    './assets/icons/icon-144x144.png',
    './assets/icons/icon-152x152.png',
    './assets/icons/icon-192x192.png',
    './assets/icons/icon-384x384.png',
    './assets/icons/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: Cacheando archivos');
                return cache.addAll(urlsToCache);
            })
            .then(function() {
                console.log('Service Worker: Instalación completada');
                return self.skipWaiting();
            })
            .catch(function(error) {
                console.error('Service Worker: Error en instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Eliminar caches antiguas
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando cache antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(function() {
            console.log('Service Worker: Activación completada');
            return self.clients.claim();
        })
    );
});

// Estrategia de cache simplificada para GitHub Pages
self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    
    // Ignorar peticiones a Supabase (API) - ir directamente a red
    if (requestUrl.hostname.includes('supabase.co')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Evitar cachear scripts y estilos para obtener siempre la versión más reciente
    if (event.request.destination === 'script' || event.request.destination === 'style') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Estrategia network-first para documentos (HTML) y navigation
    if (event.request.destination === 'document' || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
    
    // Solo cachear peticiones GET del mismo origen
    if (event.request.method === 'GET' && requestUrl.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request)
                .then(function(response) {
                    // Devolver de cache si existe
                    if (response) {
                        return response;
                    }
                    
                    // Si no, hacer petición de red y cachear
                    return fetch(event.request).then(function(response) {
                        // Solo cachear respuestas exitosas
                        if (response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return response;
                    });
                })
                .catch(function() {
                    // Si falla todo, devolver página principal para navegación
                    if (event.request.destination === 'document') {
                        return caches.match('./dashboard.html');
                    }
                })
        );
    } else {
        // Para todo lo demás, ir directamente a red
        event.respondWith(fetch(event.request));
    }
});

// Sincronización en background
self.addEventListener('sync', function(event) {
    console.log('Service Worker: Evento de sincronización:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Función para sincronización en background
async function doBackgroundSync() {
    try {
        // Obtener datos pendientes de IndexedDB
        const pendingData = await getPendingData();
        
        if (pendingData.length > 0) {
            console.log('Service Worker: Sincronizando', pendingData.length, 'elementos pendientes');
            
            for (const data of pendingData) {
                try {
                    // Reintentar la petición
                    const response = await fetch(data.url, {
                        method: data.method,
                        headers: data.headers,
                        body: data.body
                    });
                    
                    if (response.ok) {
                        // Si fue exitoso, eliminar de pendientes
                        await removePendingData(data.id);
                        console.log('Service Worker: Dato sincronizado exitosamente');
                    } else {
                        console.error('Service Worker: Error en sincronización:', response.status);
                    }
                } catch (error) {
                    console.error('Service Worker: Error sincronizando dato:', error);
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Error en sincronización background:', error);
    }
}

// Funciones para manejar IndexedDB (datos pendientes)
async function getPendingData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('tau-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pending'], 'readonly');
            const store = transaction.objectStore('pending');
            const getAllRequest = store.getAll();
            
            getAllRequest.onerror = () => reject(getAllRequest.error);
            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pending')) {
                db.createObjectStore('pending', { keyPath: 'id' });
            }
        };
    });
}

async function removePendingData(id) {
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
self.addEventListener('push', function(event) {
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
self.addEventListener('notificationclick', function(event) {
    console.log('Service Worker: Clic en notificación');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // Abrir la aplicación
        event.waitUntil(
            clients.openWindow('./')
        );
    } else if (event.action === 'close') {
        // Cerrar notificación (ya se cerró arriba)
        console.log('Service Worker: Notificación cerrada');
    } else {
        // Acción por defecto: abrir la aplicación
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', function(event) {
    console.log('Service Worker: Mensaje recibido:', event.data);
    
    // Función para responder de forma segura
    function safeResponse(response) {
        try {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage(response);
            }
        } catch (error) {
            console.error('Service Worker: Error al enviar respuesta:', error);
        }
    }
    
    // Responder inmediatamente que se recibió el mensaje
    safeResponse({ status: 'received', type: event.data?.type });
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        event.waitUntil(
            self.skipWaiting().then(() => {
                safeResponse({ status: 'skipped' });
            }).catch(error => {
                safeResponse({ status: 'error', error: error.message });
            })
        );
    }
    
    if (event.data && event.data.type === 'INIT') {
        console.log('Service Worker: Inicialización recibida');
        safeResponse({
            status: 'initialized',
            timestamp: Date.now()
        });
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(function(cache) {
                    return cache.addAll(event.data.urls);
                })
                .then(function() {
                    console.log('Service Worker: URLs cacheadas exitosamente');
                    safeResponse({ status: 'cached' });
                })
                .catch(function(error) {
                    console.error('Service Worker: Error al cachear URLs:', error);
                    safeResponse({ status: 'error', error: error.message });
                })
        );
    }
});

// Función para limpiar cache antigua
async function deleteOldCaches() {
    const cacheNames = await caches.keys();
    const deletions = cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => caches.delete(name));
    
    return Promise.all(deletions);
}

console.log('Service Worker: Cargado correctamente');
