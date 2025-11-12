# 🔄 Guía de Actualización - PWA TAU

## 📋 Resumen Rápido

**Sí, los cambios se reflejan casi inmediatamente** en la PWA, pero con algunas consideraciones importantes sobre el Service Worker y el caché.

## 🚀 Proceso de Actualización

### 1. Hacer Cambios en el Código

Simplemente edita los archivos en tu repositorio local:
- Modificar HTML, CSS, JavaScript
- Actualizar estilos o funcionalidades
- Cambiar textos o imágenes
- Actualizar versión del Service Worker

### 2. Subir Cambios a GitHub

```bash
git add .
git commit -m "Actualización: descripción de los cambios"
git push origin master
```

### 3. GitHub Pages Actualiza Automáticamente

**⏱️ Tiempo de actualización:** 1-10 minutos
- GitHub Pages detecta los cambios automáticamente
- Reconstruye el sitio
- Publica la nueva versión

## 🔄 Cómo se Reflejan los Cambios en la PWA

### Escenario 1: Cambios en Contenido (HTML, CSS, JS)

**✅ Se reflejan inmediatamente** (1-10 minutos):
- Textos actualizados
- Estilos modificados
- Nueva funcionalidad
- Imágenes cambiadas

### Escenario 2: Cambios en Service Worker

**⏳ Requiere actualización del SW** (hasta 24 horas):
- El Service Worker tiene un ciclo de vida
- Los usuarios deben cerrar y reabrir la app
- O esperar a la próxima visita

### Escenario 3: Cambios en Manifest.json

**🔄 Requiere reinstalación**:
- Nombre de la app
- Iconos
- Colores
- Orientación

## 🎯 Control de Versiones Automático

Tu Service Worker ya está configurado para manejar actualizaciones:

```javascript
// En sw.js - Línea 3
const CACHE_NAME = 'tau-v1.0.8';

// Sistema de actualización automática
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Eliminar caché antigua automáticamente
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
```

## 📱 Experiencia del Usuario con Actualizaciones

### Usuario con la App Abierta
1. **Detecta nueva versión** automáticamente
2. **Muestra notificación** (si está implementado)
3. **Puede actualizar** recargando la app

### Usuario con la App Cerrada
1. **Abre la app** → obtiene la última versión
2. **Service Worker se actualiza** en segundo plano
3. **Nuevas características** disponibles inmediatamente

### Usuario Offline
1. **Usa versión cacheada** hasta que tenga conexión
2. **Al volver a internet** → descarga actualizaciones
3. **Sincroniza datos** pendientes

## 🔧 Forzar Actualización Inmediata

### Método 1: Actualizar Versión del SW

Edita `sw.js` línea 3:
```javascript
const CACHE_NAME = 'tau-v1.0.9'; // Cambia el número
```

### Método 2: Limpiar Caché Manualmente

Agrega este botón temporalmente para desarrollo:
```javascript
// En dashboard.html - agregar botón de desarrollo
<button onclick="limpiarCache()" style="position:fixed;bottom:10px;right:10px;z-index:9999;">
    Limpiar Caché
</button>

<script>
function limpiarCache() {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
    window.location.reload();
}
</script>
```

### Método 3: Actualización Programada

Tu Service Worker ya verifica actualizaciones cada minuto:
```javascript
// En sw.js - Línea 391
setInterval(() => {
    registration.update().catch(error => {
        console.warn('⚠️ Error al actualizar Service Worker:', error);
    });
}, 60000); // Cada minuto
```

## 📊 Tipos de Cambios y sus Efectos

| Tipo de Cambio | Tiempo de Reflejo | ¿Requiere Acción del Usuario? |
|----------------|-------------------|----------------------------|
| Textos/Contenido | 1-10 minutos | No |
| Estilos CSS | 1-10 minutos | No |
| Lógica JavaScript | 1-10 minutos | No |
| Imágenes | 1-10 minutos | No |
| Service Worker | 1-24 horas | Recomendado recargar |
| Manifest.json | 1-24 horas | Reinstalar app |
| Estructura HTML | 1-10 minutos | No |

## 🧪 Testing de Actualizaciones

### 1. Verificar Despliegue
```bash
# Verificar que GitHub Pages actualizó
curl -I https://arielefilm95.github.io/TAU-HSLB
```

### 2. Probar en Navegador
1. **Abrir la app** en modo incógnito
2. **Verificar cambios** aplicados
3. **Probar funcionalidad** completa

### 3. Probar en PWA Instalada
1. **Abrir desde el ícono** en tu iPhone
2. **Forzar recarga** (cerrar y reabrir)
3. **Verificar nueva versión**

## 🚨 Problemas Comunes y Soluciones

### "No veo los cambios"
- **Solución:** Limpia caché del navegador
- **Alternativa:** Espera 10 minutos por GitHub Pages

### "La PWA sigue con versión antigua"
- **Solución:** Cierra completamente la app y vuelve a abrir
- **Alternativa:** Actualiza el número de versión en sw.js

### "Los cambios se ven intermitentes"
- **Solución:** Verifica que no haya errores en consola
- **Causa:** Service Worker mezclando cachés

## 🔄 Flujo de Actualización Recomendado

### Para Cambios Pequeños (diarios)
```bash
# 1. Hacer cambios
git add .
git commit -m "Fix: corrección de texto en formulario"
git push origin master

# 2. Esperar 5-10 minutos
# 3. Probar en navegador
# 4. Listo ✅
```

### Para Cambios Grandes (semanales)
```bash
# 1. Actualizar versión del Service Worker
# Editar sw.js línea 3: tau-v1.0.9

# 2. Hacer cambios
git add .
git commit -m "Feature: nueva funcionalidad de reportes"
git push origin master

# 3. Esperar 10 minutos
# 4. Probar completamente
# 5. Anunciar a usuarios si es necesario
```

### Para Cambios Críticos (urgentemente)
```bash
# 1. Forzar actualización inmediata
# Editar sw.js línea 3: tau-v1.0.EMERGENCY

# 2. Subir cambios
git add .
git commit -m "HOTFIX: error crítico corregido"
git push origin master

# 3. Notificar a usuarios
# 4. Pedir que recarguen la app
```

## 📱 Notificación a Usuarios

Para cambios importantes, puedes agregar notificaciones:

```javascript
// En dashboard.html - detectar actualización
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        showNotification('La aplicación se ha actualizado. Recarga para ver los cambios.');
    });
}
```

## ✅ Checklist de Actualización

- [ ] Cambios probados localmente
- [ ] Commits con mensajes claros
- [ ] Push a master completado
- [ ] Esperar despliegue de GitHub Pages
- [ ] Probar en navegador
- [ ] Probar en PWA instalada
- [ ] Verificar funcionalidad offline
- [ ] Documentar cambios si es necesario

## 🎯 Resumen Final

**✅ Cambios simples:** Se reflejan en 1-10 minutos automáticamente  
**✅ Service Worker:** Se actualiza automáticamente al abrir la app  
**✅ Usuarios:** No necesitan hacer nada, solo usar la app normalmente  
**✅ GitHub Pages:** Maneja todo el proceso automáticamente  

**Tu PWA TAU se actualiza sola como una app moderna, sin intervención manual de los usuarios.** 🚀