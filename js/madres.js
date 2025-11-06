// Funcionalidad específica para la gestión de madres

// Variables globales
let currentMadre = null;

// Función para registrar una nueva madre
async function registrarMadre(madreData) {
    try {
        // Validar datos
        if (!madreData.nombre || !madreData.apellido || !madreData.rut || !madreData.numero_ficha || !madreData.sala || !madreData.cama || !madreData.cantidad_hijos) {
            throw new Error('Todos los campos son obligatorios');
        }
        
        // Validar RUT
        if (!utils.validarRUT(madreData.rut)) {
            throw new Error('RUT inválido');
        }
        
        const cantidadHijosNumero = parseInt(madreData.cantidad_hijos, 10);
        if (!Number.isInteger(cantidadHijosNumero) || cantidadHijosNumero < 1) {
            throw new Error('Cantidad de hijos invalida');
        }

        // Preparar datos para inserción
        const dataToInsert = {
            nombre: madreData.nombre.trim(),
            apellido: madreData.apellido.trim(),
            rut: madreData.rut.replace(/\./g, '').replace('-', ''), // Eliminar puntos y guion
            numero_ficha: madreData.numero_ficha.trim(),
            sala: madreData.sala.trim(),
            cama: madreData.cama.trim(),
            cantidad_hijos: cantidadHijosNumero
        };
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Insertar en Supabase
        const { data, error } = await window.supabaseClient
            .from('madres')
            .insert([dataToInsert])
            .select();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data[0] };
        
    } catch (error) {
        console.error('Error al registrar madre:', error);
        return { 
            success: false, 
            error: error.message || 'Error al registrar madre' 
        };
    }
}

// Función para obtener todas las madres
async function obtenerMadres(searchTerm = '') {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        let query = window.supabaseClient
            .from('madres')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Aplicar filtro de búsqueda si existe
        if (searchTerm) {
            query = query.or(`rut.ilike.%${searchTerm}%,numero_ficha.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data || [] };
        
    } catch (error) {
        console.error('Error al obtener madres:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener madres' 
        };
    }
}

// Función para obtener una madre por ID
async function obtenerMadrePorId(madreId) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('madres')
            .select('*')
            .eq('id', madreId)
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener madre:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener madre' 
        };
    }
}

// Función para obtener una madre por RUT
async function obtenerMadrePorRUT(rut) {
    try {
        const rutLimpio = rut.replace(/\./g, '').replace('-', ''); // Eliminar puntos y guion
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('madres')
            .select('*')
            .eq('rut', rutLimpio)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 es "not found"
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener madre por RUT:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener madre' 
        };
    }
}

// Función para actualizar datos de una madre
async function actualizarMadre(madreId, updates) {
    try {
        // Validar que al menos hay un campo para actualizar
        if (Object.keys(updates).length === 0) {
            throw new Error('No hay datos para actualizar');
        }
        
        // Si se actualiza el RUT, validarlo
        if (updates.rut && !utils.validarRUT(updates.rut)) {
            throw new Error('RUT inválido');
        }
        
        // Preparar datos para actualización
        const dataToUpdate = {};
        
        if (updates.rut) {
            dataToUpdate.rut = updates.rut.replace(/\./g, '').replace('-', ''); // Eliminar puntos y guion
        }
        if (updates.nombre) {
            dataToUpdate.nombre = updates.nombre.trim();
        }
        if (updates.apellido) {
            dataToUpdate.apellido = updates.apellido.trim();
        }
        if (updates.numero_ficha) {
            dataToUpdate.numero_ficha = updates.numero_ficha.trim();
        }
        if (updates.sala) {
            dataToUpdate.sala = updates.sala.trim();
        }
        if (updates.cama) {
            dataToUpdate.cama = updates.cama.trim();
        }
        if (updates.cantidad_hijos !== undefined) {
            const cantidadHijosNumero = parseInt(updates.cantidad_hijos, 10);
            if (!Number.isInteger(cantidadHijosNumero) || cantidadHijosNumero < 1) {
                throw new Error('Cantidad de hijos invalida');
            }
            dataToUpdate.cantidad_hijos = cantidadHijosNumero;
        }
        
        dataToUpdate.updated_at = new Date().toISOString();
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Actualizar en Supabase
        const { data, error } = await window.supabaseClient
            .from('madres')
            .update(dataToUpdate)
            .eq('id', madreId)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al actualizar madre:', error);
        return { 
            success: false, 
            error: error.message || 'Error al actualizar madre' 
        };
    }
}

// Función para eliminar una madre
async function eliminarMadre(madreId) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Primero verificar si tiene exámenes asociados
        const { data: examenes, error: examenesError } = await window.supabaseClient
            .from('examenes_eoa')
            .select('id')
            .eq('madre_id', madreId);
        
        if (examenesError) {
            throw examenesError;
        }
        
        // Si tiene exámenes, no permitir eliminar
        if (examenes && examenes.length > 0) {
            throw new Error('No se puede eliminar la madre porque tiene exámenes asociados');
        }
        
        // Eliminar madre
        const { error } = await window.supabaseClient
            .from('madres')
            .delete()
            .eq('id', madreId);
        
        if (error) {
            throw error;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error al eliminar madre:', error);
        return { 
            success: false, 
            error: error.message || 'Error al eliminar madre' 
        };
    }
}

// Función para obtener estadísticas de madres
async function obtenerEstadisticasMadres() {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('madres')
            .select('id, created_at');
        
        if (error) {
            throw error;
        }
        
        const total = data.length;
        const hoy = new Date();
        const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const ultimos7Dias = data.filter(madre => 
            new Date(madre.created_at) >= hace7Dias
        ).length;
        
        const ultimos30Dias = data.filter(madre => 
            new Date(madre.created_at) >= hace30Dias
        ).length;
        
        return {
            success: true,
            data: {
                total,
                ultimos7Dias,
                ultimos30Dias
            }
        };
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return { 
            success: false, 
            error: error.message || 'Error al obtener estadísticas' 
        };
    }
}

// Función para exportar datos de madres a CSV
async function exportarMadresCSV() {
    try {
        const result = await obtenerMadres();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const madres = result.data;
        
        // Crear CSV
        const headers = ['Nombre Completo', 'RUT', 'Numero de Ficha', 'Sala', 'Cama', 'Cantidad de Hijos', 'Fecha de Registro'];
        const csvContent = [
            headers.join(','),
            ...madres.map(madre => [
                [madre.nombre, madre.apellido].filter(Boolean).join(' '),
                utils.formatearRUT(madre.rut),
                madre.numero_ficha,
                madre.sala,
                madre.cama,
                madre.cantidad_hijos ?? 'N/A',
                utils.formatearFecha(madre.created_at)
            ].join(','))
        ].join('\n');
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `madres_${utils.formatearFecha(new Date())}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        utils.showNotification('Datos exportados exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar datos:', error);
        utils.showNotification('Error al exportar datos', 'error');
    }
}

// Función para validar formulario de madre
function validarFormularioMadre() {
    const nombre = document.getElementById('nombreMadre').value.trim();
    const apellido = document.getElementById('apellidoMadre').value.trim();
    const rut = document.getElementById('rut').value.trim();
    const numeroFicha = document.getElementById('numeroFicha').value.trim();
    const sala = document.getElementById('sala').value.trim();
    const cama = document.getElementById('cama').value.trim();
    const cantidadHijos = document.getElementById('cantidadHijos').value;
    const cantidadHijosNumero = parseInt(cantidadHijos, 10);

    let isValid = true;

    if (!nombre) {
        document.getElementById('nombreMadreError').textContent = 'El nombre es obligatorio';
        isValid = false;
    } else {
        document.getElementById('nombreMadreError').textContent = '';
    }

    if (!apellido) {
        document.getElementById('apellidoMadreError').textContent = 'El apellido es obligatorio';
        isValid = false;
    } else {
        document.getElementById('apellidoMadreError').textContent = '';
    }

    if (!rut) {
        document.getElementById('rutError').textContent = 'El RUT es obligatorio';
        isValid = false;
    } else if (!utils.validarRUT(rut)) {
        document.getElementById('rutError').textContent = 'RUT invalido';
        isValid = false;
    } else {
        document.getElementById('rutError').textContent = '';
    }

    if (!numeroFicha) {
        document.getElementById('numeroFichaError').textContent = 'El numero de ficha es obligatorio';
        isValid = false;
    } else {
        document.getElementById('numeroFichaError').textContent = '';
    }

    if (!sala) {
        document.getElementById('salaError').textContent = 'La sala es obligatoria';
        isValid = false;
    } else {
        document.getElementById('salaError').textContent = '';
    }

    if (!cama) {
        document.getElementById('camaError').textContent = 'La cama es obligatoria';
        isValid = false;
    } else {
        document.getElementById('camaError').textContent = '';
    }

    if (!cantidadHijos) {
        document.getElementById('cantidadHijosError').textContent = 'La cantidad de hijos es obligatoria';
        isValid = false;
    } else if (!Number.isInteger(cantidadHijosNumero) || cantidadHijosNumero < 1) {
        document.getElementById('cantidadHijosError').textContent = 'Ingrese un numero valido (1 o mas)';
        isValid = false;
    } else {
        document.getElementById('cantidadHijosError').textContent = '';
    }

    return isValid;
}


// Función para limpiar formulario de madre
function limpiarFormularioMadre() {
    utils.limpiarFormulario('madreForm');
    
    // Limpiar errores específicos
    document.getElementById('nombreMadreError').textContent = '';
    document.getElementById('apellidoMadreError').textContent = '';
    document.getElementById('rutError').textContent = '';
    document.getElementById('numeroFichaError').textContent = '';
    document.getElementById('salaError').textContent = '';
    document.getElementById('camaError').textContent = '';
    document.getElementById('cantidadHijosError').textContent = '';
}

// Event listeners específicos para madres
document.addEventListener('DOMContentLoaded', function() {
    // Validación y formateo en tiempo real del RUT
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.addEventListener('input', function() {
            utils.formatearRUTInput(this);
        });
        
        rutInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !utils.validarRUT(value)) {
                document.getElementById('rutError').textContent = 'RUT inválido. Use formato: 12345678-9';
                this.classList.add('error');
            } else if (value) {
                document.getElementById('rutError').textContent = '';
                this.classList.remove('error');
            }
        });
    }
    
    // Validación en tiempo real de campos obligatorios
    const requiredInputs = ['nombreMadre', 'apellidoMadre', 'numeroFicha', 'sala', 'cama', 'cantidadHijos'];
    requiredInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', function() {
                const value = this.value.trim();
                const errorElement = document.getElementById(inputId + 'Error');
                
                if (!value) {
                    errorElement.textContent = 'Este campo es obligatorio';
                    this.classList.add('error');
                    return;
                }

                if (inputId === 'cantidadHijos') {
                    const numericValue = parseInt(value, 10);
                    if (!Number.isInteger(numericValue) || numericValue < 1) {
                        errorElement.textContent = 'Ingrese un numero valido (1 o mas)';
                        this.classList.add('error');
                        return;
                    }
                }

                errorElement.textContent = '';
                this.classList.remove('error');
            });
        }
    });
});

// Exportar funciones para uso en otros módulos
window.madres = {
    registrarMadre,
    obtenerMadres,
    obtenerMadrePorId,
    obtenerMadrePorRUT,
    actualizarMadre,
    eliminarMadre,
    obtenerEstadisticasMadres,
    exportarMadresCSV,
    validarFormularioMadre,
    limpiarFormularioMadre,
    getCurrentMadre: () => currentMadre,
    setCurrentMadre: (madre) => { currentMadre = madre; }
};
