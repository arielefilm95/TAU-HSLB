// PWA Install Optimizado para TAU - Tamizaje Auditivo Universal
// Implementa experiencia de instalación mejorada con notificaciones personalizadas

class PWAInstall {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.isInstalled = false;
    this.installPromptShown = false;
    this.installPromptKey = 'tau-install-prompt-shown';
    this.installDateKey = 'tau-install-date';
    
    this.init();
  }

  async init() {
    try {
      // Verificar si ya está instalado
      this.checkInstalledStatus();
      
      // Configurar listeners para instalación
      this.setupInstallListeners();
      
      // Configurar listeners para actualizaciones
      this.setupUpdateListeners();
      
      // Mostrar botón de instalación si corresponde
      await this.showInstallButtonIfNeeded();
      
      // Configurar notificaciones push
      this.setupPushNotifications();
      
      console.log('✅ PWA Install inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar PWA Install:', error);
    }
  }

  checkInstalledStatus() {
    // Verificar si está en modo standalone
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true ||
                      document.referrer.includes('android-app://');
    
    if (this.isInstalled) {
      console.log('📱 Aplicación ya está instalada');
      this.recordInstallDate();
    }
  }

  setupInstallListeners() {
    // Escuchar evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('🔔 Evento de instalación detectado');
    });

    // Escuchar evento appinstalled
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.recordInstallDate();
      this.hideInstallButton();
      this.showInstallSuccessNotification();
      console.log('✅ Aplicación instalada exitosamente');
    });
  }

  setupUpdateListeners() {
    // Escuchar cambios en el service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.isInstalled) {
          this.showUpdateNotification();
        }
      });
    }
  }

  async showInstallButtonIfNeeded() {
    // No mostrar si ya está instalado o si ya se mostró el prompt
    if (this.isInstalled || this.installPromptShown) {
      return;
    }

    // Esperar un poco antes de mostrar el botón
    setTimeout(() => {
      this.createInstallButton();
    }, 3000);
  }

  createInstallButton() {
    // Crear botón flotante de instalación
    this.installButton = document.createElement('div');
    this.installButton.className = 'pwa-install-button';
    this.installButton.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div class="pwa-install-text">
          <div class="pwa-install-title">Instalar TAU</div>
          <div class="pwa-install-subtitle">Acceso rápido y offline</div>
        </div>
        <button class="pwa-install-close" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Agregar estilos
    this.addInstallButtonStyles();

    // Agregar al DOM
    document.body.appendChild(this.installButton);

    // Configurar eventos
    this.setupInstallButtonEvents();

    // Animar entrada
    setTimeout(() => {
      this.installButton.classList.add('show');
    }, 100);
  }

  addInstallButtonStyles() {
    if (document.getElementById('pwa-install-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = `
      .pwa-install-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 20px rgba(52, 152, 219, 0.3);
        z-index: 9999;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
      }

      .pwa-install-button.show {
        transform: translateY(0);
        opacity: 1;
      }

      .pwa-install-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(52, 152, 219, 0.4);
      }

      .pwa-install-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pwa-install-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pwa-install-text {
        flex: 1;
      }

      .pwa-install-title {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 2px;
      }

      .pwa-install-subtitle {
        font-size: 13px;
        opacity: 0.9;
      }

      .pwa-install-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
        margin-left: 8px;
      }

      .pwa-install-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }

      /* Responsive */
      @media (max-width: 480px) {
        .pwa-install-button {
          bottom: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }

        .pwa-install-content {
          justify-content: center;
        }

        .pwa-install-close {
          position: absolute;
          top: 8px;
          right: 8px;
          margin-left: 0;
        }
      }

      /* Modo oscuro */
      @media (prefers-color-scheme: dark) {
        .pwa-install-button {
          background: linear-gradient(135deg, #2980b9, #1f5f8b);
        }
      }

      /* Reducir movimiento */
      @media (prefers-reduced-motion: reduce) {
        .pwa-install-button {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupInstallButtonEvents() {
    // Click en el botón principal
    this.installButton.addEventListener('click', (e) => {
      if (e.target.closest('.pwa-install-close')) {
        this.hideInstallButton();
        this.markPromptShown();
      } else {
        this.promptInstall();
      }
    });

    // Auto-ocultar después de 30 segundos
    setTimeout(() => {
      if (this.installButton && this.installButton.classList.contains('show')) {
        this.hideInstallButton();
        this.markPromptShown();
      }
    }, 30000);
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.warn('No hay prompt de instalación disponible');
      return;
    }

    try {
      // Mostrar prompt
      this.deferredPrompt.prompt();

      // Esperar respuesta del usuario
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalar la aplicación');
        this.showInstallingNotification();
      } else {
        console.log('❌ Usuario rechazó instalar la aplicación');
      }

      // Limpiar prompt
      this.deferredPrompt = null;
      this.hideInstallButton();

    } catch (error) {
      console.error('Error al mostrar prompt de instalación:', error);
    }
  }

  hideInstallButton() {
    if (this.installButton) {
      this.installButton.classList.remove('show');
      setTimeout(() => {
        if (this.installButton && this.installButton.parentNode) {
          this.installButton.parentNode.removeChild(this.installButton);
          this.installButton = null;
        }
      }, 300);
    }
  }

  markPromptShown() {
    this.installPromptShown = true;
    localStorage.setItem(this.installPromptKey, 'true');
  }

  recordInstallDate() {
    if (!localStorage.getItem(this.installDateKey)) {
      localStorage.setItem(this.installDateKey, new Date().toISOString());
    }
  }

  showInstallSuccessNotification() {
    this.showNotification({
      title: '¡TAU instalado!',
      body: 'La aplicación ha sido instalada exitosamente. Accede desde tu pantalla principal.',
      icon: '/assets/icons/icon-192x192.png',
      tag: 'install-success'
    });
  }

  showInstallingNotification() {
    this.showNotification({
      title: 'Instalando TAU...',
      body: 'La aplicación se está instalando. Por favor espera un momento.',
      icon: '/assets/icons/icon-192x192.png',
      tag: 'installing',
      requireInteraction: false
    });
  }

  showUpdateNotification() {
    this.showNotification({
      title: 'Nueva versión disponible',
      body: 'Hay una nueva versión de TAU. Actualiza para obtener las últimas mejoras.',
      icon: '/assets/icons/icon-192x192.png',
      tag: 'update-available',
      actions: [
        {
          action: 'update',
          title: 'Actualizar ahora'
        }
      ]
    });
  }

  async setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('📢 Push notifications no soportadas');
      return;
    }

    try {
      // Solicitar permiso para notificaciones
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Permiso para notificaciones concedido');
        
        // Suscribir a notificaciones push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.getVAPIDPublicKey()
        });

        console.log('📢 Suscripción a push notifications:', subscription);
        
        // Guardar suscripción en el servidor
        await this.savePushSubscription(subscription);
      } else {
        console.log('❌ Permiso para notificaciones denegado');
      }
    } catch (error) {
      console.error('Error al configurar push notifications:', error);
    }
  }

  getVAPIDPublicKey() {
    // En producción, esto debería venir del servidor
    return 'BMzFTcS2sYhQqLJx3kYkQpN8r8X2v7n8X3kYkQpN8r8X2v7n8X3kYkQpN8r8X2v7';
  }

  async savePushSubscription(subscription) {
    try {
      // Enviar suscripción al servidor
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Error al guardar suscripción push:', error);
    }
  }

  showNotification(options) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: options.requireInteraction !== false,
        actions: options.actions || []
      });

      // Manejar clic en notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Manejar acciones específicas
        if (options.tag === 'update-available') {
          location.reload();
        }
      };
    } else {
      // Fallback: mostrar notificación en la UI
      this.showUINotification(options);
    }
  }

  showUINotification(options) {
    // Crear notificación en la UI
    const notification = document.createElement('div');
    notification.className = 'pwa-notification';
    notification.innerHTML = `
      <div class="pwa-notification-content">
        <div class="pwa-notification-icon">
          <img src="${options.icon}" alt="${options.title}">
        </div>
        <div class="pwa-notification-text">
          <div class="pwa-notification-title">${options.title}</div>
          <div class="pwa-notification-body">${options.body}</div>
        </div>
        <button class="pwa-notification-close" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Agregar estilos si no existen
    this.addNotificationStyles();

    // Agregar al DOM
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 10);

    // Configurar eventos
    notification.querySelector('.pwa-notification-close').onclick = () => {
      this.hideNotification(notification);
    };

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);
  }

  addNotificationStyles() {
    if (document.getElementById('pwa-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-notification-styles';
    style.textContent = `
      .pwa-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 16px;
        z-index: 10000;
        max-width: 350px;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      .pwa-notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .pwa-notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .pwa-notification-icon img {
        width: 40px;
        height: 40px;
        border-radius: 6px;
      }

      .pwa-notification-text {
        flex: 1;
      }

      .pwa-notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #2c3e50;
      }

      .pwa-notification-body {
        font-size: 14px;
        color: #34495e;
        line-height: 1.4;
      }

      .pwa-notification-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: #7f8c8d;
        transition: all 0.2s;
      }

      .pwa-notification-close:hover {
        background: #f8f9fa;
        color: #2c3e50;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .pwa-notification {
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Métodos públicos
  isAppInstalled() {
    return this.isInstalled;
  }

  getInstallDate() {
    return localStorage.getItem(this.installDateKey);
  }

  async forceUpdate() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstall = new PWAInstall();
});

// Exportar para uso en módulos
export default PWAInstall;