// Lazy Loading Optimizado para TAU - Tamizaje Auditivo Universal
// Implementa lazy loading de imágenes con formatos modernos y responsive images

class LazyLoading {
  constructor() {
    this.configurarObserver();
    this.configurarStyles();
  }

  configurarObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver no soportado, cargando imágenes inmediatamente');
      this.loadAllImages();
      return;
    }

    // Configurar observer con márgenes para mejor experiencia
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

  configurarStyles() {
    // Agregar estilos para transición suave
    const style = document.createElement('style');
    style.textContent = `
      .lazy-image {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .lazy-image.loaded {
        opacity: 1;
      }
      
      .lazy-image:not([src]) {
        background: linear-gradient(45deg, #f0f0f0 25%, #e0e0e0 25%, #e0e0e0 50%, #f0f0f0 50%, #f0f0f0 75%, #e0e0e0 75%, #e0e0e0);
        background-size: 20px 20px;
        color: #666;
        display: inline-block;
        text-align: center;
        line-height: 100px;
        font-size: 14px;
      }
      
      .picture-container {
        position: relative;
        overflow: hidden;
      }
      
      .picture-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, #f0f0f0 25%, #e0e0e0 25%, #e0e0e0 50%, #f0f0f0 50%, #f0f0f0 75%, #e0e0e0 75%, #e0e0e0);
        background-size: 20px 20px;
        z-index: 1;
      }
      
      .picture-container.loaded::before {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  observar(elementos) {
    if (!this.observer) {
      // Fallback para navegadores sin IntersectionObserver
      elementos.forEach(elemento => this.cargarImagen(elemento));
      return;
    }

    elementos.forEach(elemento => {
      if (elemento.tagName === 'IMG') {
        elemento.classList.add('lazy-image');
        this.observer.observe(elemento);
      } else if (elemento.tagName === 'PICTURE') {
        const img = elemento.querySelector('img');
        if (img) {
          img.classList.add('lazy-image');
          elemento.classList.add('picture-container');
          this.observer.observe(img);
        }
      }
    });
  }

  async cargarImagen(elemento) {
    const img = elemento.tagName === 'IMG' ? elemento : elemento.querySelector('img');
    if (!img) return;

    // Marcar como cargando
    img.classList.add('loading');

    try {
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

      // Esperar a que la imagen cargue
      await this.waitForImageLoad(img);

      // Marcar como cargado
      img.classList.remove('loading');
      img.classList.add('loaded');
      if (elemento.tagName === 'PICTURE') {
        elemento.classList.add('loaded');
      }

      // Dejar de observar
      if (this.observer) {
        this.observer.unobserve(img);
      }

    } catch (error) {
      console.error('Error cargando imagen:', error);
      img.classList.remove('loading');
      img.classList.add('error');
    }
  }

  waitForImageLoad(img) {
    return new Promise((resolve, reject) => {
      if (img.complete && img.naturalHeight !== 0) {
        resolve(img);
        return;
      }

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      
      // Timeout por si la imagen nunca carga
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error('Timeout cargando imagen'));
        }
      }, 10000);
    });
  }

  loadAllImages() {
    document.querySelectorAll('img[data-src], picture[data-src]').forEach(img => {
      this.cargarImagen(img);
    });
  }

  // Generar picture element optimizado
  static createOptimizedPicture(options = {}) {
    const {
      src,
      alt = '',
      sizes = [],
      className = '',
      loading = 'lazy'
    } = options;

    const picture = document.createElement('picture');
    picture.className = `picture-container ${className}`;

    // Generar sources para diferentes formatos y tamaños
    if (sizes.length > 0) {
      sizes.forEach(size => {
        // WebP source
        if (size.webp) {
          const webpSource = document.createElement('source');
          webpSource.srcset = size.webp;
          if (size.media) webpSource.media = size.media;
          if (size.sizes) webpSource.sizes = size.sizes;
          picture.appendChild(webpSource);
        }

        // AVIF source
        if (size.avif) {
          const avifSource = document.createElement('source');
          avifSource.srcset = size.avif;
          avifSource.type = 'image/avif';
          if (size.media) avifSource.media = size.media;
          if (size.sizes) avifSource.sizes = size.sizes;
          picture.appendChild(avifSource);
        }
      });
    }

    // Imagen fallback
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = loading;
    img.className = 'lazy-image';

    if (src) {
      img.dataset.src = src;
    }

    picture.appendChild(img);
    return picture;
  }

  // Optimizar imágenes existentes en el documento
  static optimizeExistingImages() {
    const lazyLoading = new LazyLoading();
    
    // Encontrar todas las imágenes sin lazy loading
    const images = document.querySelectorAll('img:not([loading])');
    
    images.forEach(img => {
      // Solo optimizar imágenes que no sean demasiado pequeñas
      if (img.width > 100 && img.height > 100) {
        // Convertir a lazy loading
        if (img.src && !img.dataset.src) {
          img.dataset.src = img.src;
          img.src = '';
          img.loading = 'lazy';
        }
      }
    });

    // Observar imágenes con data-src
    const lazyImages = document.querySelectorAll('img[data-src], picture[data-src]');
    lazyLoading.observar(lazyImages);
  }

  // Precargar imágenes críticas
  static preloadCriticalImages(urls = []) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      
      // Determinar el tipo de imagen
      if (url.includes('.webp')) {
        link.type = 'image/webp';
      } else if (url.includes('.avif')) {
        link.type = 'image/avif';
      } else if (url.includes('.png')) {
        link.type = 'image/png';
      } else if (url.includes('.jpg') || url.includes('.jpeg')) {
        link.type = 'image/jpeg';
      }
      
      document.head.appendChild(link);
    });
  }

  // Generar srcset responsivo
  static generateSrcset(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
    return widths
      .map(width => `${baseUrl.replace('{width}', width)} ${width}w`)
      .join(', ');
  }

  // Detectar soporte de formatos modernos
  static async checkFormatSupport() {
    const formats = {
      webp: false,
      avif: false
    };

    // Verificar WebP
    if (self.createImageBitmap) {
      try {
        const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAkA+JQAAgAAAGAAABAAEgLiAAKAAIABAAKAZAADAAQAAABAAABAAEgLiAAKAAIABAAKAZAADAAQAAABAAABAAEgLiAAKAAIABAAKAZAADAAQAAABAAABAAEgLiAAKAAIABAAKAZAADAAQAAABAA';
        const blob = await fetch(webpData).then(r => r.blob());
        await createImageBitmap(blob);
        formats.webp = true;
      } catch (e) {
        formats.webp = false;
      }
    }

    // Verificar AVIF
    if (self.createImageBitmap) {
      try {
        const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        const blob = await fetch(avifData).then(r => r.blob());
        await createImageBitmap(blob);
        formats.avif = true;
      } catch (e) {
        formats.avif = false;
      }
    }

    return formats;
  }
}

// Utilidad para crear imágenes responsive
class ResponsiveImage {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.formats = options.formats || ['webp', 'avif', 'jpg'];
    this.widths = options.widths || [320, 640, 960, 1280, 1920];
    this.quality = options.quality || 80;
  }

  generatePictureElement(options = {}) {
    const {
      filename,
      alt = '',
      className = '',
      sizes = '',
      loading = 'lazy'
    } = options;

    const picture = document.createElement('picture');
    picture.className = `picture-container ${className}`;

    // Generar sources para cada formato
    this.formats.forEach(format => {
      const source = document.createElement('source');
      const srcset = this.generateSrcset(filename, format);
      
      source.srcset = srcset;
      source.type = this.getMimeType(format);
      
      if (sizes) {
        source.sizes = sizes;
      }
      
      picture.appendChild(source);
    });

    // Imagen fallback
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = loading;
    img.className = 'lazy-image';
    img.dataset.src = `${this.baseUrl}${filename}`;
    
    if (sizes) {
      img.sizes = sizes;
    }

    picture.appendChild(img);
    return picture;
  }

  generateSrcset(filename, format) {
    return this.widths
      .map(width => {
        const formattedFilename = filename.replace(/\.(jpg|jpeg|png)$/i, `_${width}w.${format}`);
        return `${this.baseUrl}${formattedFilename} ${width}w`;
      })
      .join(', ');
  }

  getMimeType(format) {
    const mimeTypes = {
      'webp': 'image/webp',
      'avif': 'image/avif',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[format] || 'image/jpeg';
  }
}

// Inicializar lazy loading cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar lazy loading
  const lazyLoading = new LazyLoading();
  
  // Optimizar imágenes existentes
  LazyLoading.optimizeExistingImages();
  
  // Precargar imágenes críticas
  const criticalImages = [
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png'
  ];
  LazyLoading.preloadCriticalImages(criticalImages);
  
  // Detectar soporte de formatos modernos
  LazyLoading.checkFormatSupport().then(support => {
    console.log('Soporte de formatos de imagen:', support);
    
    // Guardar en localStorage para uso futuro
    localStorage.setItem('imageFormatSupport', JSON.stringify(support));
  });
  
  // Hacer disponible globalmente
  window.LazyLoading = LazyLoading;
  window.ResponsiveImage = ResponsiveImage;
  window.lazyLoading = lazyLoading;
});

// Exportar para uso en módulos
export { LazyLoading, ResponsiveImage };