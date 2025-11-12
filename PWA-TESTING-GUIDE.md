# Guía de Testing para PWA TAU

## Checklist Completo de Verificación

### 📱 1. Instalación de PWA

#### En Android (Chrome)
- [ ] Abrir la app en Chrome móvil
- [ ] Buscar el banner "Añadir a pantalla de inicio"
- [ ] Click en "Añadir"
- [ ] Verificar que aparezca el ícono en pantalla de inicio
- [ ] Abrir desde el ícono (no desde el navegador)
- [ ] Verificar que se abra en modo standalone (sin barra de direcciones)

#### En iOS (Safari)
- [ ] Abrir la app en Safari
- [ ] Click en el botón de compartir (cuadro con flecha)
- [ ] Seleccionar "Añadir a pantalla de inicio"
- [ ] Verificar que aparezca el nombre correcto "TAU"
- [ ] Abrir desde el ícono en pantalla de inicio
- [ ] Verificar modo standalone

### 🌐 2. Funcionalidad Offline

#### Pruebas básicas
- [ ] Abrir la aplicación con conexión
- [ ] Navegar por diferentes secciones
- [ ] Desactivar conexión a internet
- [ ] Intentar navegar (debe funcionar con páginas cacheadas)
- [ ] Verificar que las páginas se carguen desde caché
- [ ] Reactivar conexión y verificar sincronización

#### Pruebas específicas
- [ ] Probar registro de madres offline (debe guardar localmente)
- [ ] Probar registro de bebés offline
- [ ] Verificar que los datos se sincronicen al volver la conexión
- [ ] Probar importación de archivos (puede fallar offline, es normal)

### 📊 3. Funcionalidad Principal

#### Autenticación
- [ ] Iniciar sesión correctamente
- [ ] Cerrar sesión correctamente
- [ ] Mantener sesión activa al recargar
- [ ] Redirección correcta después de login

#### Registro de Datos
- [ ] Registrar nueva madre
- [ ] Registrar nuevo bebé (NEO)
- [ ] Verificar validación de RUT
- [ ] Verificar guardado en Supabase
- [ ] Verificar que aparezca en lista de recientes

#### Importación
- [ ] Importar archivo Excel de partos
- [ ] Verificar que los datos se procesen correctamente
- [ ] Verificar que aparezcan en sección de importados

#### Reportes
- [ ] Acceder a página de reportes
- [ ] Verificar que se carguen los datos
- [ ] Probar filtros y búsquedas

### 🎨 4. Responsive Design

#### Dispositivos a probar
- [ ] Móvil pequeño (320px - iPhone SE)
- [ ] Móvil mediano (375px - iPhone 12)
- [ ] Móvil grande (414px - iPhone Pro)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1024px+)

#### Elementos a verificar
- [ ] Navegación funcional en todos los tamaños
- [ ] Formularios usables en móvil
- [ ] Botones con tamaño adecuado para toque
- [ ] Texto legible sin zoom
- [ ] No hay scroll horizontal

### ⚡ 5. Performance

#### Métricas a verificar
- [ ] Tiempo de carga inicial < 3 segundos
- [ ] First Contentful Paint < 1.5 segundos
- [ ] Largest Contentful Paint < 2.5 segundos
- [ ] Cumulative Layout Shift < 0.1

#### Herramientas de testing
- [ ] Lighthouse score > 90 en Performance
- [ ] Lighthouse score > 90 en PWA
- [ ] Lighthouse score > 90 en Accessibility
- [ ] Sin errores en consola

### 🔔 6. Notificaciones Push

#### Pruebas
- [ ] Solicitar permiso de notificaciones
- [ ] Enviar notificación de prueba
- [ ] Recibir notificación cuando la app está en background
- [ ] Click en notificación abre la app
- [ ] Acciones de notificación funcionan

### 🔄 7. Service Worker

#### Verificación
- [ ] Service Worker se registra correctamente
- [ ] No hay errores en consola relacionados con SW
- [ ] Caché se actualiza correctamente
- [ ] Estrategia de caché funciona según lo esperado
- [ ] Las actualizaciones se aplican correctamente

### 📱 8. Compatibilidad de Navegadores

#### Navegadores a probar
- [ ] Chrome (última versión)
- [ ] Firefox (última versión)
- [ ] Safari (última versión)
- [ ] Edge (última versión)
- [ ] Chrome Android
- [ ] Safari iOS

## Herramientas de Testing

### 1. Chrome DevTools
- **Pestaña Application**: Verificar Service Worker, Caché, Manifest
- **Pestaña Network**: Analizar solicitudes y caché
- **Pestaña Lighthouse**: Auditoría completa
- **Pestaña Console**: Verificar errores

### 2. Herramientas online
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **WebPageTest**: https://www.webpagetest.org/
- **PageSpeed Insights**: https://pagespeed.web.dev/

### 3. Dispositivos reales
- Probar en al menos 2 dispositivos Android diferentes
- Probar en al menos 1 dispositivo iOS
- Probar en diferentes condiciones de red

## Problemas Comunes y Soluciones

### Service Worker no se actualiza
```javascript
// En consola del navegador
self.skipWaiting();
```

### Caché antiguo causa problemas
```javascript
// Limpiar caché manualmente
caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
});
```

### PWA no se instala
- Verificar que el site esté en HTTPS
- Verificar que el manifest.json sea válido
- Verificar que el service worker esté registrado

### Funcionalidad offline no funciona
- Verificar estrategias de caché en sw.js
- Verificar que los archivos estén en la lista de caché
- Revisar Network tab en DevTools

## Checklist de Lanzamiento

### Antes del lanzamiento
- [ ] Todas las pruebas anteriores pasan
- [ ] No hay errores en consola
- [ ] Performance scores > 90
- [ ] Textos y contenido revisados
- [ ] Funcionalidad completa probada

### Después del despliegue
- [ ] Probar en la URL de producción
- [ ] Verificar instalación como PWA
- [ ] Probar funcionalidad offline
- [ ] Monitorear errores los primeros días
- [ ] Recopilar feedback de usuarios

## Reporte de Testing

Usa este formato para documentar los resultados:

```
Fecha: [fecha]
Tester: [nombre]
Dispositivo: [dispositivo y navegador]
Navegador: [versión]

Resultados:
✅ PWA se instala correctamente
✅ Funcionalidad offline funciona
❌ Notificaciones push no funcionan en iOS
✅ Performance scores > 90

Issues encontrados:
1. [descripción del problema]
   - Severidad: [alta/media/baja]
   - Pasos para reproducir: [pasos]
   - Captura de pantalla: [adjuntar]

Recomendaciones:
1. [recomendación 1]
2. [recomendación 2]
```

## Automatización de Testing

Para testing continuo, considera implementar:

1. **Unit Tests**: Para funciones JavaScript críticas
2. **E2E Tests**: Con Cypress o Playwright
3. **Performance Monitoring**: Con Lighthouse CI
4. **Error Tracking**: Con Sentry o similar
5. **Analytics**: Para monitorear uso real

---

**Nota**: Esta guía debe ejecutarse completamente antes de cada lanzamiento importante de la aplicación.