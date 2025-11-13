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