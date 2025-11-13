// Consultas Optimizadas para TAU - Tamizaje Auditivo Universal
// Implementa caché, paginación y optimización de consultas

class ConsultasOptimizadas {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.pageSize = 20; // Tamaño de página por defecto
    this.maxCacheSize = 100; // Máximo de entradas en caché
  }

  // Obtener pacientes recientes con paginación y caché
  async getPacientesRecientes(pagina = 1, limite = null) {
    const cacheKey = `pacientes-recientes-${pagina}-${limite || this.pageSize}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const limit = limite || this.pageSize;
      const offset = (pagina - 1) * limit;
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

      console.log(`🔍 Consultando pacientes recientes - Página ${pagina}, Límite ${limit}`);

      // Usar la función optimizada si está disponible, sino consulta directa
      let query;
      if (this.supabase.rpc) {
        try {
          // Intentar usar función optimizada
          const { data, error } = await this.supabase
            .rpc('obtener_pacientes_recientes', {
              p_fecha_inicio: inicioDia.toISOString(),
              p_fecha_fin: finDia.toISOString(),
              p_limit: limit,
              p_offset: offset
            });

          if (!error && data) {
            const resultado = this.procesarPacientesConExamenes(data);
            this.setCache(cacheKey, resultado);
            return resultado;
          }
        } catch (rpcError) {
          console.warn('⚠️ Función RPC no disponible, usando consulta directa:', rpcError);
        }
      }

      // Consulta directa optimizada como fallback
      const { data, error } = await this.supabase
        .from('pacientes')
        .select(`
          id,
          nombre,
          apellido,
          rut,
          numero_ficha,
          sala,
          cama,
          cantidad_hijos,
          tipo_paciente,
          origen_registro,
          created_at,
          examenes_eoa (
            id,
            od_resultado,
            oi_resultado,
            fecha_examen
          )
        `)
        .eq('tipo_paciente', 'MADRE')
        .eq('origen_registro', 'MANUAL')
        .gte('created_at', inicioDia.toISOString())
        .lt('created_at', finDia.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const resultado = this.procesarPacientesConExamenes(data);
      this.setCache(cacheKey, resultado);
      return resultado;

    } catch (error) {
      console.error('❌ Error al obtener pacientes recientes:', error);
      throw error;
    }
  }

  // Buscar pacientes con debounce y caché
  async buscarPacientes(termino, tipo = null, pagina = 1) {
    if (!termino || termino.length < 2) {
      return { data: [], totalCount: 0, pagina: 1, totalPages: 0 };
    }

    const cacheKey = `buscar-${termino}-${tipo}-${pagina}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const limit = this.pageSize;
      const offset = (pagina - 1) * limit;

      let query = this.supabase
        .from('pacientes')
        .select('id, nombre, apellido, rut, numero_ficha, sala, cama, tipo_paciente, created_at', { count: 'exact' })
        .or(`rut.ilike.%${termino}%,numero_ficha.ilike.%${termino}%,nombre.ilike.%${termino}%,apellido.ilike.%${termino}%`);

      if (tipo) {
        query = query.eq('tipo_paciente', tipo.toUpperCase());
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const resultado = {
        data: data || [],
        totalCount: count || 0,
        pagina: pagina,
        totalPages: Math.ceil((count || 0) / limit)
      };

      this.setCache(cacheKey, resultado);
      return resultado;

    } catch (error) {
      console.error('❌ Error al buscar pacientes:', error);
      throw error;
    }
  }

  // Obtener resumen de exámenes con una sola consulta optimizada
  async getResumenExamenes(pacienteIds) {
    if (!pacienteIds || pacienteIds.length === 0) {
      return new Map();
    }

    const cacheKey = `resumen-${Array.isArray(pacienteIds) ? pacienteIds.join(',') : pacienteIds}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const ids = Array.isArray(pacienteIds) ? pacienteIds : [pacienteIds];
      
      // Usar la vista optimizada si está disponible
      let query;
      if (this.supabase.from('vista_pacientes_con_eoa')) {
        try {
          const { data, error } = await this.supabase
            .from('vista_pacientes_con_eoa')
            .select('id, estado_eoa, total_examenes, ultimo_examen')
            .in('id', ids);

          if (!error && data) {
            const resumen = new Map();
            data.forEach(paciente => {
              resumen.set(paciente.id, {
                estado: paciente.estado_eoa,
                totalExamenes: paciente.total_examenes || 0,
                ultimoExamen: paciente.ultimo_examen
              });
            });
            this.setCache(cacheKey, resumen);
            return resumen;
          }
        } catch (vistaError) {
          console.warn('⚠️ Vista no disponible, usando consulta directa:', vistaError);
        }
      }

      // Consulta directa optimizada
      const { data, error } = await this.supabase
        .from('examenes_eoa')
        .select('paciente_id, od_resultado, oi_resultado, fecha_examen')
        .in('paciente_id', ids)
        .order('fecha_examen', { ascending: true });

      if (error) throw error;

      const resumen = new Map();
      
      ids.forEach(id => {
        const examenesPaciente = data ? data.filter(e => e.paciente_id === id) : [];
        const examenesOrdenados = examenesPaciente.sort((a, b) => 
          new Date(a.fecha_examen) - new Date(b.fecha_examen)
        );

        resumen.set(id, {
          examenes: examenesOrdenados,
          examCount: examenesOrdenados.length,
          firstExam: examenesOrdenados[0] || null,
          lastExam: examenesOrdenados[examenesOrdenados.length - 1] || null,
          firstExamRefiere: this.resultadoRefiere(examenesOrdenados[0]),
          lastExamRefiere: this.resultadoRefiere(examenesOrdenados[examenesOrdenados.length - 1])
        });
      });

      this.setCache(cacheKey, resumen);
      return resumen;

    } catch (error) {
      console.error('❌ Error al obtener resumen de exámenes:', error);
      throw error;
    }
  }

  // Guardar examen con optimización y caché
  async guardarExamen(examenData) {
    try {
      const { data, error } = await this.supabase
        .from('examenes_eoa')
        .insert([examenData])
        .select()
        .single();

      if (error) throw error;

      // Invalidar caché relevante
      this.invalidateCache(`resumen-${examenData.paciente_id}`);
      this.invalidateCache('pacientes-recientes');
      this.invalidateCache('buscar-');

      return data;
    } catch (error) {
      console.error('❌ Error al guardar examen:', error);
      
      // Guardar en IndexedDB para sincronización posterior
      await this.guardarParaSincronizacion('examenes', examenData);
      throw error;
    }
  }

  // Guardar paciente con optimización y caché
  async guardarPaciente(pacienteData) {
    try {
      const { data, error } = await this.supabase
        .from('pacientes')
        .insert([pacienteData])
        .select()
        .single();

      if (error) throw error;

      // Invalidar caché relevante
      this.invalidateCache('pacientes-recientes');
      this.invalidateCache('buscar-');

      return data;
    } catch (error) {
      console.error('❌ Error al guardar paciente:', error);
      
      // Guardar en IndexedDB para sincronización posterior
      await this.guardarParaSincronizacion('pacientes', pacienteData);
      throw error;
    }
  }

  // Obtener estadísticas con caché
  async getEstadisticas(fechaInicio = null, fechaFin = null) {
    const cacheKey = `estadisticas-${fechaInicio || 'inicio'}-${fechaFin || 'fin'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const hoy = new Date();
      const inicio = fechaInicio || new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const fin = fechaFin || new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

      // Consultas optimizadas en paralelo
      const [
        pacientesResult,
        examenesResult,
        referidosResult
      ] = await Promise.all([
        this.supabase
          .from('pacientes')
          .select('id, tipo_paciente, origen_registro, created_at')
          .gte('created_at', inicio.toISOString())
          .lt('created_at', fin.toISOString()),
        
        this.supabase
          .from('examenes_eoa')
          .select('id, od_resultado, oi_resultado, fecha_examen')
          .gte('fecha_examen', inicio.toISOString())
          .lt('fecha_examen', fin.toISOString()),
        
        this.supabase
          .from('examenes_eoa')
          .select('id')
          .or('od_resultado.eq.REFIERE,oi_resultado.eq.REFIERE')
          .gte('fecha_examen', inicio.toISOString())
          .lt('fecha_examen', fin.toISOString())
      ]);

      if (pacientesResult.error) throw pacientesResult.error;
      if (examenesResult.error) throw examenesResult.error;
      if (referidosResult.error) throw referidosResult.error;

      const estadisticas = {
        pacientes: {
          total: pacientesResult.data?.length || 0,
          manuales: pacientesResult.data?.filter(p => p.origen_registro === 'MANUAL').length || 0,
          importados: pacientesResult.data?.filter(p => p.origen_registro === 'IMPORTADO').length || 0,
          madres: pacientesResult.data?.filter(p => p.tipo_paciente === 'MADRE').length || 0,
          bebes: pacientesResult.data?.filter(p => p.tipo_paciente === 'BEBE').length || 0
        },
        examenes: {
          total: examenesResult.data?.length || 0,
          pasan: examenesResult.data?.filter(e => e.od_resultado === 'PASA' && e.oi_resultado === 'PASA').length || 0,
          refieren: referidosResult.data?.length || 0
        },
        periodo: {
          inicio: inicio.toISOString(),
          fin: fin.toISOString()
        }
      };

      this.setCache(cacheKey, estadisticas);
      return estadisticas;

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }

  // Métodos de caché
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    // Limpiar caché si excede el tamaño máximo
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
  }

  // Métodos auxiliares
  resultadoRefiere(examen) {
    return examen && (examen.od_resultado === 'REFIERE' || examen.oi_resultado === 'REFIERE');
  }

  procesarPacientesConExamenes(pacientes) {
    if (!pacientes || pacientes.length === 0) {
      return [];
    }

    return pacientes.map(paciente => ({
      ...paciente,
      estadoEOA: this.calcularEstadoEOA(paciente.examenes_eoa || [])
    }));
  }

  calcularEstadoEOA(examenes) {
    if (!examenes || examenes.length === 0) {
      return { estado: 'pendiente', texto: 'EOA pendiente' };
    }

    const ultimoExamen = examenes[examenes.length - 1];
    const refiere = this.resultadoRefiere(ultimoExamen);

    if (examenes.length === 1) {
      return {
        estado: refiere ? 'referido' : 'completado',
        texto: refiere ? 'EOA refiere (1er examen)' : 'EOA pasa (1er examen)'
      };
    }

    return {
      estado: refiere ? 'derivacion' : 'completado',
      texto: refiere ? 'EOA refiere (2do examen)' : 'EOA pasa (2do examen)'
    };
  }

  // Guardar en IndexedDB para sincronización posterior
  async guardarParaSincronizacion(tabla, datos) {
    try {
      const pendingData = {
        id: `${tabla}-${Date.now()}`,
        type: tabla,
        url: `${this.supabase.supabaseUrl}/rest/v1/${tabla}`,
        method: 'POST',
        headers: {
          'apikey': this.supabase.supabaseKey,
          'Authorization': `Bearer ${this.supabase.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(datos),
        timestamp: Date.now()
      };

      // Guardar en IndexedDB
      const db = await this.openIndexedDB();
      const tx = db.transaction(['pending'], 'readwrite');
      const store = tx.objectStore('pending');
      await store.add(pendingData);

      console.log(`💾 Datos guardados para sincronización posterior: ${tabla}`);
    } catch (error) {
      console.error('❌ Error al guardar para sincronización:', error);
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('tau-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'id' });
        }
      };
    });
  }

  // Forzar sincronización de datos pendientes
  async sincronizarPendientes() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-examenes');
        await registration.sync.register('sync-pacientes');
        console.log('🔄 Sincronización programada');
      } catch (error) {
        console.error('❌ Error al programar sincronización:', error);
        // Fallback: sincronizar manualmente
        await this.sincronizarManualmente();
      }
    } else {
      // Fallback para navegadores sin background sync
      await this.sincronizarManualmente();
    }
  }

  async sincronizarManualmente() {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction(['pending'], 'readonly');
      const store = tx.objectStore('pending');
      const pendingData = await store.getAll();

      if (pendingData.length === 0) {
        console.log('📭 No hay datos pendientes para sincronizar');
        return;
      }

      console.log(`🔄 Sincronizando ${pendingData.length} elementos pendientes`);

      for (const data of pendingData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body
          });

          if (response.ok) {
            // Eliminar de pendientes
            const deleteTx = db.transaction(['pending'], 'readwrite');
            const deleteStore = deleteTx.objectStore('pending');
            await deleteStore.delete(data.id);
            console.log(`✅ Dato sincronizado: ${data.id}`);
          } else {
            console.error(`❌ Error en sincronización: ${response.status}`);
          }
        } catch (error) {
          console.error(`❌ Error sincronizando ${data.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
    }
  }
}

// Exportar para uso global
window.ConsultasOptimizadas = ConsultasOptimizadas;