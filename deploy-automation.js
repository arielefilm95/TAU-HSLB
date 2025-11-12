// Script de automatización para despliegue de TAU PWA
// Uso: node deploy-automation.js [vercel|github-pages]

const fs = require('fs');
const path = require('path');

const PLATFORMS = {
    vercel: {
        name: 'Vercel',
        baseUrl: 'https://tau-hslb.vercel.app',
        supabaseUrls: [
            'https://tau-hslb.vercel.app',
            'https://tau-hslb.vercel.app/dashboard.html'
        ]
    },
    'github-pages': {
        name: 'GitHub Pages',
        baseUrl: 'https://arielefilm95.github.io/TAU-HSLB',
        supabaseUrls: [
            'https://arielefilm95.github.io/TAU-HSLB',
            'https://arielefilm95.github.io/TAU-HSLB/dashboard.html'
        ]
    }
};

function updateConfigFiles(platform) {
    const config = PLATFORMS[platform];
    if (!config) {
        console.error('❌ Plataforma no válida. Usa: vercel o github-pages');
        return false;
    }

    console.log(`🚀 Configurando para despliegue en ${config.name}...`);
    console.log(`📍 URL base: ${config.baseUrl}`);

    // Actualizar config/supabase-config.js
    try {
        const supabaseConfigPath = path.join(__dirname, 'config', 'supabase-config.js');
        let supabaseConfig = fs.readFileSync(supabaseConfigPath, 'utf8');

        // Reemplazar URLs de redirección
        const oldRedirectUrls = supabaseConfig.match(/REDIRECT_URLS: \[[\s\S]*?\]/)[0];
        const newRedirectUrls = `REDIRECT_URLS: [
            'http://localhost:3000',
            'http://localhost:3000/dashboard.html',
            ${config.supabaseUrls.map(url => `'${url}'`).join(',\n            ')}
        ]`;

        supabaseConfig = supabaseConfig.replace(oldRedirectUrls, newRedirectUrls);
        fs.writeFileSync(supabaseConfigPath, supabaseConfig);
        console.log('✅ config/supabase-config.js actualizado');
    } catch (error) {
        console.error('❌ Error actualizando config/supabase-config.js:', error.message);
        return false;
    }

    // Actualizar js/auth.js
    try {
        const authPath = path.join(__dirname, 'js', 'auth.js');
        let authContent = fs.readFileSync(authPath, 'utf8');

        // Reemplazar URL de redirección
        const oldRedirectUrl = authContent.match(/redirectTo: window\.supabaseConfig\.isProduction\(\)\s*\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]+['"]/)[0];
        const newRedirectUrl = `redirectTo: window.supabaseConfig.isProduction()\n                        ? '${config.supabaseUrls[1]}'\n                        : 'http://localhost:3000/dashboard.html'`;

        authContent = authContent.replace(oldRedirectUrl, newRedirectUrl);
        fs.writeFileSync(authPath, authContent);
        console.log('✅ js/auth.js actualizado');
    } catch (error) {
        console.error('❌ Error actualizando js/auth.js:', error.message);
        return false;
    }

    // Crear archivo de configuración de despliegue
    const deployConfig = {
        platform: platform,
        baseUrl: config.baseUrl,
        supabaseUrls: config.supabaseUrls,
        timestamp: new Date().toISOString(),
        instructions: {
            supabase: `Ve a tu proyecto Supabase > Authentication > Settings y configura:
- Site URL: ${config.supabaseUrls[0]}
- Redirect URLs: ${config.supabaseUrls.join(', ')}`,
            deployment: platform === 'vercel' ? `
1. Ve a vercel.com
2. Conecta tu cuenta de GitHub
3. Importa el repositorio TAU-HSLB
4. Configura:
   - Framework Preset: "Other"
   - Root Directory: "."
   - Build Command: (dejar vacío)
   - Output Directory: "."
5. Haz clic en "Deploy"` : `
1. Ve a tu repositorio en GitHub
2. Settings > Pages
3. Source: "Deploy from a branch"
4. Branch: "master" y carpeta "/root"
5. Save`
        }
    };

    fs.writeFileSync(
        path.join(__dirname, 'deploy-config.json'),
        JSON.stringify(deployConfig, null, 2)
    );
    console.log('✅ deploy-config.json creado');

    console.log('\n🎉 Configuración completada para', config.name);
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configura las URLs en Supabase según las instrucciones en deploy-config.json');
    console.log('2. Sigue las instrucciones de despliegue para', config.name);
    console.log('3. Una vez desplegado, prueba la aplicación en:', config.baseUrl);
    
    return true;
}

// Ejecutar script
const platform = process.argv[2];
if (!platform) {
    console.log('Uso: node deploy-automation.js [vercel|github-pages]');
    console.log('\nPlataformas disponibles:');
    Object.keys(PLATFORMS).forEach(key => {
        console.log(`  ${key}: ${PLATFORMS[key].name} - ${PLATFORMS[key].baseUrl}`);
    });
    process.exit(1);
}

if (updateConfigFiles(platform)) {
    console.log('\n✨ ¡Listo para desplegar! ✨');
} else {
    console.log('\n❌ Hubo errores en la configuración');
    process.exit(1);
}