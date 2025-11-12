// Funcionalidad específica para la gestión de pacientes

// Variables globales
let currentPaciente = null;

// Función para registrar un nuevo paciente
async function registrarPaciente(pacienteData) {
    try {
        // Validar datos
        if (!pacienteData.nombre || !pacienteData.apellido || !pacienteData.rut || !pacienteData.numero_ficha || !pacienteData.sala || !pacienteData.cama || !pacienteData.tipo_paciente) {
            throw new Error('Todos los campos son obligatorios');
        }
        
        // Validar RUT
        if (!utils.validarRUT(pacienteData.rut)) {
            throw new Error('RUT inválido');
        }
        
        // Validar tipo de paciente
        if (!['MADRE', 'BEBE', 'NEO'].includes(pacienteData.tipo_paciente.toUpperCase())) {
            throw new Error('Tipo de paciente inválido. Debe ser MADRE, BEBE o NEO');
        }

        // Preparar datos para inserción
        const dataToInsert = {
            nombre: pacienteData.nombre.trim(),
            apellido: pacienteData.apellido.trim(),
            rut: pacienteData.rut.replace(/\./g, '').replace('-', ''), // Eliminar puntos y guion
            numero_ficha: pacienteData.numero_ficha.trim(),
            sala: pacienteData.sala.trim(),
            cama: pacienteData.cama.trim(),
            tipo_paciente: pacienteData.tipo_paciente.toUpperCase()
        };
        
        // Si es madre, agregar cantidad de hijos si se proporciona
        if (pacienteData.tipo_paciente.toUpperCase() === 'MADRE' && pacienteData.cantidad_hijos) {
            const cantidadHijosNumero = parseInt(pacienteData.cantidad_hijos, 10);
            if (!Number.isInteger(cantidadHijosNumero) || cantidadHijosNumero < 1) {
                throw new Error('Cantidad de hijos inválida');
            }
            dataToInsert.cantidad_hijos = cantidadHijosNumero;
        }
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Insertar en Supabase
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .insert([dataToInsert])
            .select();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data: data[0] };
        
    } catch (error) {
        console.error('Error al registrar paciente:', error);
        return {
            success: false,
            error: error.message || 'Error al registrar paciente'
        };
    }
}

// Función para registrar una nueva madre (mantener compatibilidad)
async function registrarMadre(madreData) {
    // Agregar tipo_paciente como MADRE por defecto
    madreData.tipo_paciente = 'MADRE';
    return registrarPaciente(madreData);
}

// Función para obtener todos los pacientes
async function obtenerPacientes(searchTerm = '', tipoPaciente = null) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        let query = window.supabaseClient
            .from('pacientes')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Aplicar filtro por tipo de paciente si se especifica
        if (tipoPaciente) {
            query = query.eq('tipo_paciente', tipoPaciente.toUpperCase());
        }
        
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
        console.error('Error al obtener pacientes:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener pacientes'
        };
    }
}

// Función para obtener todas las madres (mantener compatibilidad)
async function obtenerMadres(searchTerm = '') {
    return obtenerPacientes(searchTerm, 'MADRE');
}

// Función para obtener un paciente por ID
async function obtenerPacientePorId(pacienteId) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener paciente'
        };
    }
}

// Función para obtener una madre por ID (mantener compatibilidad)
async function obtenerMadrePorId(madreId) {
    return obtenerPacientePorId(madreId);
}

// Función para obtener un paciente por RUT
async function obtenerPacientePorRUT(rut) {
    try {
        const rutLimpio = rut.replace(/\./g, '').replace('-', ''); // Eliminar puntos y guion
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .select('*')
            .eq('rut', rutLimpio)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 es "not found"
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al obtener paciente por RUT:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener paciente'
        };
    }
}

// Función para obtener una madre por RUT (mantener compatibilidad)
async function obtenerMadrePorRUT(rut) {
    return obtenerPacientePorRUT(rut);
}

// Función para actualizar datos de un paciente
async function actualizarPaciente(pacienteId, updates) {
    try {
        // Validar que al menos hay un campo para actualizar
        if (Object.keys(updates).length === 0) {
            throw new Error('No hay datos para actualizar');
        }
        
        // Si se actualiza el RUT, validarlo
        if (updates.rut && !utils.validarRUT(updates.rut)) {
            throw new Error('RUT inválido');
        }
        
        // Si se actualiza el tipo de paciente, validarlo
        if (updates.tipo_paciente && !['MADRE', 'BEBE', 'NEO'].includes(updates.tipo_paciente.toUpperCase())) {
            throw new Error('Tipo de paciente inválido. Debe ser MADRE, BEBE o NEO');
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
        if (updates.tipo_paciente) {
            dataToUpdate.tipo_paciente = updates.tipo_paciente.toUpperCase();
        }
        if (updates.cantidad_hijos !== undefined) {
            const cantidadHijosNumero = parseInt(updates.cantidad_hijos, 10);
            if (!Number.isInteger(cantidadHijosNumero) || cantidadHijosNumero < 1) {
                throw new Error('Cantidad de hijos inválida');
            }
            dataToUpdate.cantidad_hijos = cantidadHijosNumero;
        }
        
        dataToUpdate.updated_at = new Date().toISOString();
        
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Actualizar en Supabase
        const { data, error } = await window.supabaseClient
            .from('pacientes')
            .update(dataToUpdate)
            .eq('id', pacienteId)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        return {
            success: false,
            error: error.message || 'Error al actualizar paciente'
        };
    }
}

// Función para actualizar datos de una madre (mantener compatibilidad)
async function actualizarMadre(madreId, updates) {
    return actualizarPaciente(madreId, updates);
}

// Función para eliminar un paciente
async function eliminarPaciente(pacienteId) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        // Primero eliminar todos los exámenes asociados (eliminación en cascada manual)
        const { error: examenesError } = await window.supabaseClient
            .from('examenes_eoa')
            .delete()
            .eq('paciente_id', pacienteId);
        
        if (examenesError) {
            throw examenesError;
        }
        
        // Luego eliminar el paciente
        const { error } = await window.supabaseClient
            .from('pacientes')
            .delete()
            .eq('id', pacienteId);
        
        if (error) {
            throw error;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error al eliminar paciente:', error);
        return {
            success: false,
            error: error.message || 'Error al eliminar paciente'
        };
    }
}

// Función para eliminar una madre (mantener compatibilidad)
async function eliminarMadre(madreId) {
    return eliminarPaciente(madreId);
}

// Función para obtener estadísticas de pacientes
async function obtenerEstadisticasPacientes(tipoPaciente = null) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }
        
        let query = window.supabaseClient
            .from('pacientes')
            .select('id, created_at, tipo_paciente');
        
        // Filtrar por tipo de paciente si se especifica
        if (tipoPaciente) {
            query = query.eq('tipo_paciente', tipoPaciente.toUpperCase());
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        const total = data.length;
        const hoy = new Date();
        const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const ultimos7Dias = data.filter(paciente =>
            new Date(paciente.created_at) >= hace7Dias
        ).length;
        
        const ultimos30Dias = data.filter(paciente =>
            new Date(paciente.created_at) >= hace30Dias
        ).length;
        
        // Contar por tipo de paciente
        const porTipo = data.reduce((acc, paciente) => {
            const tipo = paciente.tipo_paciente || 'SIN_TIPO';
            acc[tipo] = (acc[tipo] || 0) + 1;
            return acc;
        }, {});
        
        return {
            success: true,
            data: {
                total,
                ultimos7Dias,
                ultimos30Dias,
                porTipo
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

// Función para obtener estadísticas de madres (mantener compatibilidad)
async function obtenerEstadisticasMadres() {
    return obtenerEstadisticasPacientes('MADRE');
}

// Función para exportar datos de pacientes a CSV
async function exportarPacientesCSV(tipoPaciente = null) {
    try {
        const result = await obtenerPacientes('', tipoPaciente);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const pacientes = result.data;
        const tipo = tipoPaciente ? tipoPaciente.toLowerCase() : 'pacientes';
        
        // Crear CSV
        const headers = ['Nombre Completo', 'RUT', 'Numero de Ficha', 'Sala', 'Cama', 'Tipo Paciente', 'Cantidad de Hijos', 'Fecha de Registro'];
        const csvContent = [
            headers.join(','),
            ...pacientes.map(paciente => [
                [paciente.nombre, paciente.apellido].filter(Boolean).join(' '),
                utils.formatearRUT(paciente.rut),
                paciente.numero_ficha,
                paciente.sala,
                paciente.cama,
                paciente.tipo_paciente || 'N/A',
                paciente.cantidad_hijos ?? 'N/A',
                utils.formatearFecha(paciente.created_at)
            ].join(','))
        ].join('\n');
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${tipo}_${utils.formatearFecha(new Date())}.csv`);
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

// Función para exportar datos de madres a CSV (mantener compatibilidad)
async function exportarMadresCSV() {
    return exportarPacientesCSV('MADRE');
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
window.pacientes = {
    registrarPaciente,
    obtenerPacientes,
    obtenerPacientePorId,
    obtenerPacientePorRUT,
    actualizarPaciente,
    eliminarPaciente,
    obtenerEstadisticasPacientes,
    exportarPacientesCSV
};

// Mantener compatibilidad con funciones antiguas
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
    getCurrentMadre: () => currentPaciente,
    setCurrentMadre: (paciente) => { currentPaciente = paciente; }
};
