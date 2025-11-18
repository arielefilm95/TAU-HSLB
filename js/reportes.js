// Reportes EOA

let reportesSupabase = null;
let reportesRows = [];


function describirExamen(examen) {
    if (!examen) {
        return 'Sin registro';
    }

    const partes = [
        `OD: ${examen.od_resultado || '-'}`,
        `OI: ${examen.oi_resultado || '-'}`
    ];

    if (examen.fecha_examen) {
        partes.push(utils.formatearFecha(examen.fecha_examen));
    }

    return partes.join(' | ');
}

function obtenerObservacionesReporte(rawObservaciones) {
    if (window.eoa && typeof window.eoa.observacionesATextoPlano === 'function') {
        return window.eoa.observacionesATextoPlano(rawObservaciones);
    }
    return rawObservaciones || '';
}

function compilarObservaciones(examenes) {
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return '';
    }

    return examenes
        .filter(examen => examen && examen.observaciones)
        .map((examen, index) => `${index + 1}°: ${obtenerObservacionesReporte(examen.observaciones)}`)
        .join(' | ');
}

async function fetchReportesData() {
    const { data, error } = await reportesSupabase
        .from('pacientes')
        .select(`
            id,
            nombre,
            apellido,
            rut,
            numero_ficha,
            tipo_paciente,
            examenes_eoa (
                od_resultado,
                oi_resultado,
                observaciones,
                fecha_examen
            )
        `)
        .eq('tipo_paciente', 'MADRE') // Solo madres para compatibilidad
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return (data || []).map(paciente => {
        const examenesOrdenados = (paciente.examenes_eoa || [])
            .slice()
            .sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));

        const primerExamen = examenesOrdenados[0] || null;
        const segundoExamen = examenesOrdenados[1] || null;

        return {
            ficha: paciente.numero_ficha || '',
            rut: utils.formatearRUT(paciente.rut),
            nombre: [paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado',
            tipo_paciente: paciente.tipo_paciente || 'MADRE',
            primerExamen: describirExamen(primerExamen),
            segundoExamen: describirExamen(segundoExamen),
            observaciones: compilarObservaciones(examenesOrdenados)
        };
    });
}

function renderReportesTable(rows) {
    const tbody = document.getElementById('reportesTableBody');
    if (!tbody) {
        return;
    }

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center;">No hay registros disponibles.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${utils.escapeHTML(row.ficha)}</td>
            <td>${utils.escapeHTML(row.rut)}</td>
            <td>${utils.escapeHTML(row.nombre)}</td>
            <td>${utils.escapeHTML(row.tipo_paciente || 'MADRE')}</td>
            <td>${utils.escapeHTML(row.primerExamen)}</td>
            <td>${utils.escapeHTML(row.segundoExamen)}</td>
            <td>${utils.escapeHTML(row.observaciones || '')}</td>
        </tr>
    `).join('');
}

async function exportarReportesExcel() {
    const buttonId = 'exportReportesBtn';
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('Librería Excel no disponible');
        }

        utils.toggleButtonLoader(buttonId, true);

        const headers = ['N° Ficha', 'RUT', 'Nombre del Paciente', 'Tipo Paciente', 'Primer Examen', 'Segundo Examen', 'Observaciones'];
        const data = reportesRows.map(row => [
            row.ficha,
            row.rut,
            row.nombre,
            row.tipo_paciente || 'MADRE',
            row.primerExamen,
            row.segundoExamen,
            row.observaciones
        ]);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte EOA');

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `reporte_eoa_${today}.xlsx`);
        utils.showNotification('Reporte Excel generado correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        utils.showNotification(error.message || 'Error al exportar Excel', 'error');
    } finally {
        utils.toggleButtonLoader(buttonId, false);
    }
}

async function initReportes() {
    try {
        // Usar la instancia global de Supabase para evitar múltiples instancias de GoTrueClient
        if (!window.supabaseClient) {
            throw new Error('Cliente de Supabase no disponible. Asegúrese de que auth.js esté cargado primero.');
        }
        
        // Usar la instancia global existente
        reportesSupabase = window.supabaseClient;
        console.log('✅ Reportes usando instancia global de Supabase (evitando múltiples instancias)');

        reportesRows = await fetchReportesData();
        renderReportesTable(reportesRows);

        const exportBtn = document.getElementById('exportReportesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                exportarReportesExcel();
            });
        }
    } catch (error) {
        console.error('Error al inicializar reportes:', error);
        utils.showNotification(error.message || 'Error al cargar reportes', 'error');
        const tbody = document.getElementById('reportesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center;">${utils.escapeHTML(error.message || 'Error al cargar reportes')}</td>
                </tr>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', initReportes);

window.reportes = {
    initReportes,
    exportarReportesExcel
};
