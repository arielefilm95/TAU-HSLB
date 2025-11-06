// Módulo de comunicación con Service Worker para evitar errores de canal cerrado

class ServiceWorkerComms {
    constructor() {
        this.registration = null;
        this.messageChannel = null;
        this.isReady = false;
        this.pendingMessages = [];
        this.init();
    }

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.ready;
                this.isReady = true;
                console.log('Service Worker Communication: Listo');
                
                // Procesar mensajes pendientes
                this.processPendingMessages();
                
                // Escuchar mensajes del Service Worker
                navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
            } catch (error) {
                console.error('Service Worker Communication: Error al inicializar:', error);
            }
        }
    }

    // Manejar mensajes del Service Worker
    handleMessage(event) {
        console.log('Service Worker Communication: Mensaje recibido:', event.data);
        
        // Emitir evento personalizado para que otros módulos escuchen
        window.dispatchEvent(new CustomEvent('swMessage', {
            detail: event.data
        }));
    }

    // Enviar mensaje al Service Worker con manejo de errores
    async sendMessage(type, data = {}) {
        const message = { type, ...data, timestamp: Date.now() };
        
        if (!this.isReady) {
            console.warn('Service Worker Communication: SW no está listo, guardando mensaje');
            this.pendingMessages.push(message);
            return { success: false, reason: 'SW not ready' };
        }

        try {
            // Verificar que el service worker esté activo
            if (!this.registration.active) {
                throw new Error('Service Worker no está activo');
            }

            // Crear canal de mensaje para respuesta
            this.messageChannel = new MessageChannel();
            
            const promise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout esperando respuesta del Service Worker'));
                }, 3000); // Reducido a 3 segundos

                this.messageChannel.port1.onmessage = (event) => {
                    clearTimeout(timeout);
                    resolve(event.data);
                };

                this.messageChannel.port1.onmessageerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };

                // Manejar cierre del canal
                this.messageChannel.port1.onclose = () => {
                    clearTimeout(timeout);
                    console.warn('Service Worker Communication: Canal cerrado antes de recibir respuesta');
                    resolve({ status: 'channel_closed', fallback: true });
                };
            });

            // Enviar mensaje con canal de respuesta
            this.registration.active.postMessage(message, [this.messageChannel.port2]);
            
            const response = await promise;
            console.log('Service Worker Communication: Respuesta recibida:', response);
            return { success: true, response };

        } catch (error) {
            console.error('Service Worker Communication: Error enviando mensaje:', error);
            
            // Intentar enviar sin canal de respuesta como fallback
            try {
                if (this.registration && this.registration.active) {
                    this.registration.active.postMessage(message);
                    return { success: true, fallback: true, message: 'Enviado sin canal de respuesta' };
                } else {
                    throw new Error('Service Worker no disponible para fallback');
                }
            } catch (fallbackError) {
                console.error('Service Worker Communication: Error en fallback:', fallbackError);
                return { success: false, error: fallbackError.message };
            }
        }
    }

    // Procesar mensajes pendientes cuando el SW está listo
    async processPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            await this.sendMessage(message.type, message);
        }
    }

    // Métodos específicos para operaciones comunes
    async skipWaiting() {
        return await this.sendMessage('SKIP_WAITING');
    }

    async cacheUrls(urls) {
        return await this.sendMessage('CACHE_URLS', { urls });
    }

    async reinit() {
        return await this.sendMessage('INIT');
    }

    // Verificar estado del Service Worker
    getStatus() {
        return {
            isReady: this.isReady,
            hasRegistration: !!this.registration,
            pendingMessages: this.pendingMessages.length,
            registration: this.registration
        };
    }
}

// Crear instancia global
window.swComms = new ServiceWorkerComms();

// La instancia ya está disponible globalmente a través de window.swComms