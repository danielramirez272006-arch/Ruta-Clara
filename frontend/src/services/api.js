/**
 * Servicio de solicitudes HTTP hacia el backend Express de Ruta Clara.
 * Ningún componente contiene SQL ni credenciales de base de datos o claves de Claude.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch {
    const err = new Error(
      'No se pudo contactar con el servidor Express. Verifique que el backend esté en ejecución (npm run dev:backend).'
    );
    err.code = 'RED_NO_DISPONIBLE';
    throw err;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || (body && body.ok === false)) {
    const mensaje =
      body?.error?.message ||
      `Error HTTP ${response.status} al comunicarse con la API de Ruta Clara.`;
    const error = new Error(mensaje);
    error.status = response.status;
    error.code = body?.error?.code || 'ERROR_API';
    error.payload = body;
    throw error;
  }

  return body?.data !== undefined ? body.data : body;
}

export const apiService = {
  // Salud y exportación
  async obtenerHealth() {
    const url = `${API_BASE_URL}/health`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    return data;
  },

  async exportarDatosJSON() {
    return request('/exportar');
  },

  // Resumen e inicio
  async obtenerResumen(dias = 7) {
    return request(`/resumen?dias=${encodeURIComponent(dias)}`);
  },

  // Embudo y métricas
  async obtenerEmbudo() {
    return request('/embudo');
  },

  // Seguimientos pendientes
  async obtenerAtencion(dias = 7) {
    return request(`/atencion?dias=${encodeURIComponent(dias)}`);
  },

  // Clientes
  async listarClientes(busqueda = '') {
    const q = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    return request(`/clientes${q}`);
  },

  async obtenerCliente(id) {
    return request(`/clientes/${id}`);
  },

  async crearCliente(payload) {
    return request('/clientes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async actualizarCliente(id, payload) {
    return request(`/clientes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  // Prospectos (oportunidades de viaje)
  async listarOportunidades(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
    if (filtros.sede_id) params.set('sede_id', filtros.sede_id);
    if (filtros.etapa_id) params.set('etapa_id', filtros.etapa_id);
    if (filtros.canal) params.set('canal', filtros.canal);
    if (filtros.estado_comercial) params.set('estado_comercial', filtros.estado_comercial);
    if (filtros.cliente_id) params.set('cliente_id', filtros.cliente_id);

    const qs = params.toString();
    return request(`/prospectos${qs ? `?${qs}` : ''}`);
  },

  async obtenerOportunidad(id) {
    return request(`/prospectos/${id}`);
  },

  async crearOportunidad(payload) {
    return request('/prospectos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async avanzarEtapaOportunidad(id, etapaDestinoId = null) {
    return request(`/prospectos/${id}/etapa`, {
      method: 'PATCH',
      body: JSON.stringify(etapaDestinoId ? { etapa_id: etapaDestinoId } : {})
    });
  },

  async editarPreferenciasOportunidad(id, payload) {
    return request(`/prospectos/${id}/preferencias`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async cambiarEstadoOportunidad(id, payload) {
    return request(`/prospectos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async generarMensajeIA(id, tono = 'cálido y consultivo') {
    return request(`/prospectos/${id}/mensaje`, {
      method: 'POST',
      body: JSON.stringify({ tono })
    });
  },

  async agregarNotaOportunidad(id, payload) {
    return request(`/prospectos/${id}/notas`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Campañas con IA
  async listarCampanasGuardadas() {
    return request('/campanas');
  },

  async generarCampanaIA(payload) {
    return request('/campanas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async aprobarCampanaIA(id) {
    return request(`/campanas/${id}/aprobar`, {
      method: 'PATCH',
      body: JSON.stringify({})
    });
  }
};
