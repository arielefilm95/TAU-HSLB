# 📱 Guía para Instalar PWA TAU en iPhone

## 🔄 Paso 1: Despliega la aplicación primero

Antes de instalarla en tu iPhone, asegúrate de haber seguido los pasos de [`GUIA-GITHUB-PAGES.md`](GUIA-GITHUB-PAGES.md:1) y que la aplicación esté disponible en:

**URL:** https://arielefilm95.github.io/TAU-HSLB

## 📱 Paso 2: Instalar en iPhone (2 minutos)

### Método 1: Desde Safari (Recomendado)

1. **Abrir Safari** en tu iPhone
2. **Ir a la URL:** `https://arielefilm95.github.io/TAU-HSLB`
3. **Esperar a que cargue** completamente (deberías ver el logo de TAU)
4. **Tocar el botón de compartir** (icono de cuadro con flecha hacia arriba, en la parte inferior)
5. **Desplazar hacia abajo** y seleccionar **"Añadir a pantalla de inicio"**
6. **Verificar el nombre:** debería decir "TAU"
7. **Tocar "Añadir"** (esquina superior derecha)
8. **Esperar** que se instale (aparecerá el ícono en tu pantalla de inicio)

### Método 2: Desde Chrome (si lo usas)

1. **Abrir Chrome** en tu iPhone
2. **Ir a la URL:** `https://arielefilm95.github.io/TAU-HSLB`
3. **Tocar los tres puntos** (menú) en la esquina inferior derecha
4. **Seleccionar "Añadir a pantalla de inicio"**
5. **Tocar "Añadir"**

## ✅ Paso 3: Verificar Instalación

Una vez instalada, deberías ver:

1. **Ícono de TAU** en tu pantalla de inicio (similar a una app nativa)
2. **Abrir la aplicación** tocando el ícono
3. **Verificar que se abra en pantalla completa** (sin barra de direcciones de Safari)
4. **Probar funcionalidad** (registrar una madre, navegar, etc.)

## 🔧 Si no aparece la opción "Añadir a pantalla de inicio"

### Solución 1: Verificar requisitos
- Asegúrate de que la URL sea HTTPS (lo está)
- Espera a que la página cargue completamente
- Intenta recargar la página

### Solución 2: Forzar detección de PWA
1. **Abrir la aplicación** en Safari
2. **Tocar y mantener presionado** el ícono de recarga en la barra de direcciones
3. **Seleccionar "Añadir a pantalla de inicio"** del menú que aparece

### Solución 3: Verificar manifest
1. **Abrir Safari** → **Preferencias** → **Sitios web**
2. **Buscar la URL** de tu aplicación
3. **Asegurarte de que tenga permisos** para mostrar notificaciones

## 🎯 Características de la PWA en iPhone

Una vez instalada, tu aplicación TAU tendrá:

✅ **Icono en pantalla de inicio** como una app nativa  
✅ **Apertura en pantalla completa** (sin navegador)  
✅ **Funcionalidad offline** (puedes usarla sin internet)  
✅ **Notificaciones push** (si las configuras)  
✅ **Actualizaciones automáticas** cuando haya nuevas versiones  

## 🧪 Testing Post-Instalación

### Pruebas básicas (5 minutos)
1. **Abrir desde el ícono** de pantalla de inicio
2. **Verificar modo standalone** (sin barra de direcciones)
3. **Probar registro** de una madre/bebé
4. **Cerrar y reabrir** la aplicación
5. **Verificar que se mantenga** la sesión

### Pruebas offline (5 minutos)
1. **Activar modo avión** o desactivar WiFi/datos
2. **Abrir la aplicación** desde el ícono
3. **Navegar por las páginas** (deberían cargar desde caché)
4. **Intentar registrar** datos (se guardarán localmente)
5. **Reactivar internet** y verificar sincronización

## 🔄 Actualizaciones Automáticas

La PWA se actualizará automáticamente:
- **Cuando la abras** y haya una nueva versión
- **En segundo plano** si usas Background Sync
- **Sin intervención manual** del usuario

## 📱 Compartir la Aplicación

Para que otros en el hospital la instalen:

1. **Comparte la URL:** `https://arielefilm95.github.io/TAU-HSLB`
2. **Diles que sigan** los mismos pasos en sus iPhones
3. **O genera un código QR** con la URL para fácil acceso

## 🚨 Solución de Problemas Comunes

### "No aparece la opción de añadir"
- **Solución:** Asegúrate que la página esté completamente cargada
- **Alternativa:** Toca y mantén presionado el ícono de recarga

### "La app se abre en Safari"
- **Solución:** Esto es normal la primera vez, cierra Safari y abre desde el ícono

### "No funciona offline"
- **Solución:** Asegúrate de haber navegado por todas las páginas con conexión primero

### "Los datos no se guardan"
- **Solución:** Verifica tu conexión a internet y la configuración de Supabase

## 📋 Checklist Final de Instalación

- [ ] Aplicación desplegada en GitHub Pages
- [ ] URL accesible: https://arielefilm95.github.io/TAU-HSLB
- [ ] Ícono aparece en pantalla de inicio
- [ ] Se abre en modo standalone
- [ ] Funcionalidad básica funciona
- [ ] Modo offline funciona
- [ ] Datos se sincronizan con Supabase

## 🎉 ¡Listo!

Tu PWA TAU ahora funciona como una aplicación nativa en tu iPhone, con:
- Acceso directo desde pantalla de inicio
- Funcionalidad completa offline
- Experiencia de app nativa
- Actualizaciones automáticas

**¡Felicidades! Ya tienes TAU como una app profesional en tu iPhone! 🚀**