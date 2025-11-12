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

function compilarObservaciones(examenes) {
    if (!Array.isArray(examenes) || examenes.length === 0) {
        return '';
    }

    return examenes
        .filter(examen => examen && examen.observaciones)
        .map((examen, index) => `${index + 1}°: ${examen.observaciones}`)
        .join(' | ');
}

async function fetchReportesData() {
    const { data, error } = await reportesSupabase
        .from('madres')
        .select(`
            id,
            nombre,
            apellido,
            rut,
            numero_ficha,
            examenes_eoa (
                od_resultado,
                oi_resultado,
                observaciones,
                fecha_examen
            )
        `)
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return (data || []).map(madre => {
        const examenesOrdenados = (madre.examenes_eoa || [])
            .slice()
            .sort((a, b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));

        const primerExamen = examenesOrdenados[0] || null;
        const segundoExamen = examenesOrdenados[1] || null;

        return {
            ficha: madre.numero_ficha || '',
            rut: utils.formatearRUT(madre.rut),
            nombre: [madre.nombre, madre.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado',
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
                <td colspan="6" style="text-align: center;">No hay registros disponibles.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${utils.escapeHTML(row.ficha)}</td>
            <td>${utils.escapeHTML(row.rut)}</td>
            <td>${utils.escapeHTML(row.nombre)}</td>
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

        const headers = ['N° Ficha', 'RUT', 'Nombre de la Madre', 'Primer Examen', 'Segundo Examen', 'Observaciones'];
        const data = reportesRows.map(row => [
            row.ficha,
            row.rut,
            row.nombre,
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
                    <td colspan="6" style="text-align: center;">${utils.escapeHTML(error.message || 'Error al cargar reportes')}</td>
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
