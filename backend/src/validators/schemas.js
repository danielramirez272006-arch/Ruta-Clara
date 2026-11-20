import { AppError } from '../middleware/errorHandler.js';

export const MONEDAS_VALIDAS = ['MXN', 'USD', 'EUR'];
export const CANALES_VALIDOS = ['Instagram', 'Referido', 'Web', 'WhatsApp'];
export const ESTADOS_COMERCIALES_VALIDOS = ['abierta', 'perdida', 'cerrada'];

export function validarIdNumerico(valor, nombreCampo = 'id') {
  const num = Number(valor);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(
      `El parámetro '${nombreCampo}' debe ser un número entero positivo.`,
      400,
      'VALIDACION_ID_INVALIDO'
    );
  }
  return num;
}

export function validarFechaISO(fechaStr, nombreCampo = 'fecha_salida') {
  if (typeof fechaStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr.trim())) {
    throw new AppError(
      `El campo '${nombreCampo}' debe tener el formato YYYY-MM-DD.`,
      400,
      'VALIDACION_FECHA_INVALIDA'
    );
  }

  const limpia = fechaStr.trim();
  const [anioStr, mesStr, diaStr] = limpia.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  const fechaObj = new Date(Date.UTC(anio, mes - 1, dia));
  const esReal =
    fechaObj.getUTCFullYear() === anio &&
    fechaObj.getUTCMonth() === mes - 1 &&
    fechaObj.getUTCDate() === dia &&
    anio >= 2000 &&
    anio <= 2100;

  if (!esReal) {
    throw new AppError(
      `El campo '${nombreCampo}' contiene una fecha inexistente o fuera de rango.`,
      400,
      'VALIDACION_FECHA_INVALIDA'
    );
  }

  return limpia;
}

export function validarClientePayload(body, parcial = false) {
  if (!body || typeof body !== 'object') {
    throw new AppError('El cuerpo de la solicitud es obligatorio.', 400, 'VALIDACION_BODY_VACIO');
  }

  const resultado = {};

  if (!parcial || body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || body.nombre.trim().length < 2 || body.nombre.trim().length > 140) {
      throw new AppError(
        'El nombre del cliente es obligatorio y debe tener entre 2 y 140 caracteres.',
        400,
        'VALIDACION_NOMBRE_CLIENTE'
      );
    }
    resultado.nombre = body.nombre.trim();
  }

  if (body.telefono !== undefined) {
    resultado.telefono = body.telefono ? String(body.telefono).trim().slice(0, 40) : null;
  }

  if (body.correo !== undefined) {
    resultado.correo = body.correo ? String(body.correo).trim().slice(0, 140) : null;
  }

  if (body.preferencia_contacto !== undefined) {
    resultado.preferencia_contacto = String(body.preferencia_contacto || 'WhatsApp').trim().slice(0, 40);
  } else if (!parcial) {
    resultado.preferencia_contacto = 'WhatsApp';
  }

  if (body.es_ficticio !== undefined) {
    resultado.es_ficticio = body.es_ficticio ? 1 : 0;
  } else if (!parcial) {
    resultado.es_ficticio = 1;
  }

  if (parcial && Object.keys(resultado).length === 0) {
    throw new AppError('Debe enviar al menos un campo para actualizar el cliente.', 400, 'VALIDACION_SIN_CAMPOS');
  }

  return resultado;
}

export function validarNotaOportunidadPayload(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('El cuerpo de la solicitud es obligatorio.', 400, 'VALIDACION_BODY_VACIO');
  }

  const texto = typeof body.texto === 'string' ? body.texto.trim() : '';
  if (texto.length < 2 || texto.length > 600) {
    throw new AppError(
      'La nota del agente debe tener entre 2 y 600 caracteres.',
      400,
      'VALIDACION_NOTA_TEXTO'
    );
  }

  const autor =
    typeof body.autor === 'string' && body.autor.trim().length > 0
      ? body.autor.trim().slice(0, 80)
      : 'Asesor Ruta Clara';

  return { texto, autor };
}

export function validarPreferenciasViaje(body, parcial = false) {
  if (!body || typeof body !== 'object') {
    throw new AppError('El cuerpo de la solicitud es obligatorio.', 400, 'VALIDACION_BODY_VACIO');
  }

  const out = {};

  if (!parcial || body.destino !== undefined) {
    if (typeof body.destino !== 'string' || body.destino.trim().length < 2 || body.destino.trim().length > 120) {
      throw new AppError(
        'El destino del viaje es obligatorio y debe tener entre 2 y 120 caracteres.',
        400,
        'VALIDACION_DESTINO'
      );
    }
    out.destino = body.destino.trim();
  }

  if (!parcial || body.presupuesto_total !== undefined) {
    const presupuesto = Number(body.presupuesto_total);
    if (!Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > 999999999999.99) {
      throw new AppError(
        'El presupuesto total debe ser un importe positivo mayor que cero.',
        400,
        'VALIDACION_PRESUPUESTO_INVALIDO'
      );
    }
    out.presupuesto_total = Number(presupuesto.toFixed(2));
  }

  if (!parcial || body.moneda !== undefined) {
    const moneda = typeof body.moneda === 'string' ? body.moneda.trim().toUpperCase() : '';
    if (!MONEDAS_VALIDAS.includes(moneda)) {
      throw new AppError(
        `La moneda debe ser una de las permitidas: ${MONEDAS_VALIDAS.join(', ')}.`,
        400,
        'VALIDACION_MONEDA_INVALIDA'
      );
    }
    out.moneda = moneda;
  }

  if (!parcial || body.viajeros !== undefined) {
    const viajeros = Number(body.viajeros);
    if (!Number.isInteger(viajeros) || viajeros < 1 || viajeros > 50) {
      throw new AppError(
        'El número de viajeros debe ser un entero entre 1 y 50.',
        400,
        'VALIDACION_VIAJEROS_FUERA_RANGO'
      );
    }
    out.viajeros = viajeros;
  }

  if (!parcial || body.fecha_salida !== undefined) {
    out.fecha_salida = validarFechaISO(body.fecha_salida, 'fecha_salida');
  }

  if (!parcial || body.sede_id !== undefined) {
    out.sede_id = validarIdNumerico(body.sede_id, 'sede_id');
  }

  if (!parcial || body.canal !== undefined) {
    const canal = typeof body.canal === 'string' ? body.canal.trim() : '';
    if (!CANALES_VALIDOS.includes(canal)) {
      throw new AppError(
        `El canal debe ser uno de los siguientes: ${CANALES_VALIDOS.join(', ')}.`,
        400,
        'VALIDACION_CANAL_INVALIDO'
      );
    }
    out.canal = canal;
  }

  if (parcial && Object.keys(out).length === 0) {
    throw new AppError('Debe indicar al menos una preferencia para actualizar.', 400, 'VALIDACION_SIN_CAMPOS');
  }

  return out;
}

export function validarCrearOportunidad(body) {
  const preferencias = validarPreferenciasViaje(body, false);
  let cliente_id = null;
  let nuevo_cliente = null;

  if (body.cliente_id !== undefined && body.cliente_id !== null && body.cliente_id !== '') {
    cliente_id = validarIdNumerico(body.cliente_id, 'cliente_id');
  } else if (body.cliente_nombre || (body.cliente && body.cliente.nombre)) {
    const nombreRaw = body.cliente_nombre || body.cliente.nombre;
    nuevo_cliente = validarClientePayload({
      nombre: nombreRaw,
      es_ficticio: body.es_ficticio ?? 1
    });
  } else {
    throw new AppError(
      'Debe seleccionar un cliente existente (cliente_id) o proporcionar el nombre de un cliente nuevo (cliente_nombre).',
      400,
      'VALIDACION_CLIENTE_REQUERIDO'
    );
  }

  return {
    ...preferencias,
    cliente_id,
    nuevo_cliente
  };
}

export function validarUmbralDias(diasQuery) {
  if (diasQuery === undefined || diasQuery === null || diasQuery === '') {
    return 7;
  }
  const dias = Number(diasQuery);
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    throw new AppError(
      'El umbral de días (dias) debe ser un número entero entre 1 y 365.',
      400,
      'VALIDACION_UMBRAL_DIAS'
    );
  }
  return dias;
}

export function validarCambioEstadoComercial(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('El cuerpo de la solicitud es obligatorio.', 400, 'VALIDACION_BODY_VACIO');
  }

  const accion = typeof body.accion === 'string' ? body.accion.trim().toLowerCase() : '';
  const estado = typeof body.estado_comercial === 'string' ? body.estado_comercial.trim().toLowerCase() : '';

  if (accion === 'perder' || estado === 'perdida') {
    if (body.motivo_perdida_id === undefined || body.motivo_perdida_id === null || body.motivo_perdida_id === '') {
      throw new AppError(
        'Para registrar una oportunidad perdida es obligatorio indicar un motivo de pérdida válido (motivo_perdida_id).',
        400,
        'VALIDACION_MOTIVO_PERDIDA_REQUERIDO'
      );
    }
    return {
      tipo: 'perdida',
      motivo_perdida_id: validarIdNumerico(body.motivo_perdida_id, 'motivo_perdida_id')
    };
  }

  if (accion === 'reabrir' || estado === 'abierta') {
    return {
      tipo: 'reapertura',
      motivo_perdida_id: null
    };
  }

  throw new AppError(
    "Debe especificar estado_comercial ('perdida' o 'abierta') o accion ('perder' o 'reabrir').",
    400,
    'VALIDACION_ESTADO_COMERCIAL'
  );
}

export function validarCampanaPayload(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('El cuerpo de la solicitud es obligatorio.', 400, 'VALIDACION_BODY_VACIO');
  }

  const objetivo = typeof body.objetivo === 'string' ? body.objetivo.trim() : '';
  if (objetivo.length < 5 || objetivo.length > 300) {
    throw new AppError(
      'El objetivo de la campaña es obligatorio y debe tener entre 5 y 300 caracteres.',
      400,
      'VALIDACION_OBJETIVO_CAMPANA'
    );
  }

  let sede_id = null;
  let sede_nombre = null;
  if (body.sede_id !== undefined && body.sede_id !== null && body.sede_id !== '') {
    sede_id = validarIdNumerico(body.sede_id, 'sede_id');
  } else if (typeof body.sede === 'string' && body.sede.trim().length > 0) {
    sede_nombre = body.sede.trim();
  } else {
    throw new AppError(
      'Debe seleccionar una sede válida para la campaña (sede_id o sede).',
      400,
      'VALIDACION_SEDE_CAMPANA'
    );
  }

  return {
    objetivo,
    sede_id,
    sede_nombre
  };
}
