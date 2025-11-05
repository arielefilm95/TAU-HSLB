// Service Worker para TAU - Tamizaje Auditivo Universal

const CACHE_NAME = 'tau-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/signup.html',
    '/dashboard.html',
    '/css/styles.css',
    '/css/auth.css',
    '/css/dashboard.css',
    '/js/utils.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/madres.js',
    '/js/eoa.js',
    '/manifest.json',
    '/assets/icons/icon-72x72.png',
    '/assets/icons/icon-96x96.png',
    '/assets/icons/icon-128x128.png',
    '/assets/icons/icon-144x144.png',
    '/assets/icons/icon-152x152.png',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-384x384.png',
    '/assets/icons/icon-512x512.png'
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

// Estrategia de cache: Stale While Revalidate
self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    
    // Ignorar peticiones a Supabase (API)
    if (requestUrl.hostname.includes('supabase.co')) {
        event.respondWith(
            fetch(event.request).catch(function(error) {
                console.log('Service Worker: Error de red con Supabase:', error);
                // Para peticiones críticas, podríamos devolver una respuesta offline
                if (event.request.method === 'GET') {
                    return new Response(
                        JSON.stringify({ 
                            error: 'Sin conexión a internet', 
                            offline: true 
                        }), 
                        { 
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                }
            })
        );
        return;
    }
    
    // Para peticiones GET, usar estrategia Stale While Revalidate
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then(function(cache) {
                return cache.match(event.request)
                    .then(function(response) {
                        // Si encontramos en cache, devolverlo
                        if (response) {
                            // Actualizar en background
                            fetch(event.request).then(function(fetchResponse) {
                                if (fetchResponse && fetchResponse.status === 200) {
                                    cache.put(event.request, fetchResponse.clone());
                                }
                            }).catch(function(error) {
                                console.log('Service Worker: Error actualizando cache:', error);
                            });
                            
                            return response;
                        }
                        
                        // Si no está en cache, hacer petición de red
                        return fetch(event.request).then(function(response) {
                            // Verificar si la respuesta es válida
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            // Clonar respuesta y guardar en cache
                            const responseToCache = response.clone();
                            cache.put(event.request, responseToCache);
                            
                            return response;
                        }).catch(function(error) {
                            console.log('Service Worker: Error en petición de red:', error);
                            
                            // Para páginas HTML, devolver página offline
                            if (event.request.destination === 'document') {
                                return caches.match('/index.html');
                            }
                            
                            // Para otros recursos, devolver error
                            return new Response('Sin conexión a internet', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                    });
            })
        );
    } else {
        // Para peticiones POST, PUT, DELETE, ir directamente a red
        event.respondWith(
            fetch(event.request).catch(function(error) {
                console.log('Service Worker: Error en petición POST/PUT/DELETE:', error);
                
                // Devolver respuesta de error para peticiones que no son GET
                return new Response(
                    JSON.stringify({ 
                        error: 'Sin conexión a internet. Los datos se guardarán cuando se restablezca la conexión.', 
                        offline: true 
                    }), 
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
        );
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
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Abrir TAU',
                icon: '/assets/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/assets/icons/icon-96x96.png'
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
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Cerrar notificación (ya se cerró arriba)
        console.log('Service Worker: Notificación cerrada');
    } else {
        // Acción por defecto: abrir la aplicación
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', function(event) {
    console.log('Service Worker: Mensaje recibido:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(function(cache) {
                    return cache.addAll(event.data.urls);
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