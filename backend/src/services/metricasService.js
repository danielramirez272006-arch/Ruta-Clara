import { ETAPAS_CATALOGO } from '../../../database/seedData.js';

const MAPA_ACCIONES_POR_ORDEN = new Map(
  ETAPAS_CATALOGO.map((e) => [e.orden, e.siguiente_accion])
);

export function obtenerSiguienteAccionPorOrden(orden) {
  return MAPA_ACCIONES_POR_ORDEN.get(Number(orden)) || 'Dar seguimiento consultivo a la oportunidad.';
}

/**
 * Calcula las métricas completas de las 9 etapas del embudo.
 *
 * Reglas y Fórmulas:
 * - Actuales: oportunidades actualmente en la etapa.
 * - Alcanzaron: oportunidades distintas cuyo historial contiene esa etapa.
 * - Avanzaron: oportunidades que alcanzaron esa etapa y la siguiente.
 * - Conversión: avanzaron / alcanzaron × 100.
 * - Fuga observada: 100 − conversión.
 * - Brecha: máximo entre 0 y meta − conversión.
 * - Faltantes: máximo entre 0 y techo(alcanzaron × meta / 100) − avanzaron.
 * - Sin denominador, devolver null.
 * - La última etapa (orden 9) no tiene transición.
 * - Las oportunidades perdidas permanecen en los denominadores históricos.
 * - No se redondean los valores numéricos de cálculo (el redondeo es solo para presentación).
 */
export function calcularMetricasEmbudo({ etapas, oportunidades, historialEtapas, motivosPerdida = [] }) {
  // Mapa de conjuntos de oportunidad_id que alcanzaron cada etapa_id
  const alcanzaronPorEtapa = new Map();
  for (const etapa of etapas) {
    alcanzaronPorEtapa.set(Number(etapa.id), new Set());
  }

  for (const h of historialEtapas) {
    const etapaId = Number(h.etapa_id);
    if (!alcanzaronPorEtapa.has(etapaId)) {
      alcanzaronPorEtapa.set(etapaId, new Set());
    }
    alcanzaronPorEtapa.get(etapaId).add(Number(h.oportunidad_id));
  }

  const etapasOrdenadas = [...etapas].sort((a, b) => Number(a.orden) - Number(b.orden));
  const totalEtapas = etapasOrdenadas.length;

  const resultadoEtapas = etapasOrdenadas.map((etapa, idx) => {
    const etapaId = Number(etapa.id);
    const orden = Number(etapa.orden);
    const esUltimaEtapa = idx === totalEtapas - 1 || orden === 9;
    const meta = esUltimaEtapa || etapa.meta_conversion === null || etapa.meta_conversion === undefined
      ? null
      : Number(etapa.meta_conversion);

    const enEstaEtapa = oportunidades.filter((o) => Number(o.etapa_id) === etapaId);
    const actuales = enEstaEtapa.length;
    const actualesAbiertas = enEstaEtapa.filter((o) => o.estado_comercial === 'abierta').length;
    const perdidasConfirmadasEnEtapa = enEstaEtapa.filter((o) => o.estado_comercial === 'perdida').length;

    const setAlcanzaron = alcanzaronPorEtapa.get(etapaId) || new Set();
    const alcanzaron = setAlcanzaron.size;

    if (esUltimaEtapa) {
      return {
        etapa_id: etapaId,
        orden,
        nombre: etapa.nombre,
        siguiente_accion: obtenerSiguienteAccionPorOrden(orden),
        actuales,
        actuales_abiertas: actualesAbiertas,
        perdidas_confirmadas: perdidasConfirmadasEnEtapa,
        alcanzaron,
        avanzaron: null,
        meta,
        conversion: null,
        fuga_observada: null,
        brecha: null,
        faltantes: null,
        tiene_transicion: false
      };
    }

    const siguienteEtapa = etapasOrdenadas[idx + 1];
    const setSiguiente = alcanzaronPorEtapa.get(Number(siguienteEtapa.id)) || new Set();

    let avanzaron = 0;
    for (const opId of setAlcanzaron) {
      if (setSiguiente.has(opId)) {
        avanzaron += 1;
      }
    }

    if (alcanzaron === 0) {
      return {
        etapa_id: etapaId,
        orden,
        nombre: etapa.nombre,
        transicion_hacia: siguienteEtapa.nombre,
        siguiente_accion: obtenerSiguienteAccionPorOrden(orden),
        actuales,
        actuales_abiertas: actualesAbiertas,
        perdidas_confirmadas: perdidasConfirmadasEnEtapa,
        alcanzaron: 0,
        avanzaron: 0,
        meta,
        conversion: null,
        fuga_observada: null,
        brecha: null,
        faltantes: null,
        tiene_transicion: true
      };
    }

    const conversion = (avanzaron / alcanzaron) * 100;
    const fugaObservada = 100 - conversion;
    const brecha = meta !== null ? Math.max(0, meta - conversion) : null;
    const faltantes = meta !== null
      ? Math.max(0, Math.ceil((alcanzaron * meta) / 100) - avanzaron)
      : null;

    return {
      etapa_id: etapaId,
      orden,
      nombre: etapa.nombre,
      transicion_hacia: siguienteEtapa.nombre,
      siguiente_accion: obtenerSiguienteAccionPorOrden(orden),
      actuales,
      actuales_abiertas: actualesAbiertas,
      perdidas_confirmadas: perdidasConfirmadasEnEtapa,
      alcanzaron,
      avanzaron,
      meta,
      conversion,
      fuga_observada: fugaObservada,
      brecha,
      faltantes,
      tiene_transicion: true
    };
  });

  // Identificar la etapa con mayor brecha frente a la meta
  let mayorBrecha = null;
  for (const item of resultadoEtapas) {
    if (item.brecha !== null) {
      if (!mayorBrecha || item.brecha > mayorBrecha.brecha) {
        mayorBrecha = item;
      }
    }
  }

  // Resumen de pérdidas confirmadas y sus motivos
  const perdidasTotales = oportunidades.filter((o) => o.estado_comercial === 'perdida');
  const conteoPorMotivo = new Map();
  for (const m of motivosPerdida) {
    conteoPorMotivo.set(Number(m.id), {
      motivo_id: Number(m.id),
      nombre: m.nombre,
      cantidad: 0
    });
  }

  for (const op of perdidasTotales) {
    const mId = Number(op.motivo_perdida_id);
    if (conteoPorMotivo.has(mId)) {
      conteoPorMotivo.get(mId).cantidad += 1;
    } else if (mId) {
      conteoPorMotivo.set(mId, {
        motivo_id: mId,
        nombre: op.motivo_perdida_nombre || 'Otro',
        cantidad: 1
      });
    }
  }

  return {
    etapas: resultadoEtapas,
    mayor_brecha: mayorBrecha,
    perdidas_confirmadas: {
      total: perdidasTotales.length,
      por_motivo: Array.from(conteoPorMotivo.values()).sort((a, b) => b.cantidad - a.cantidad || a.motivo_id - b.motivo_id)
    },
    explicacion_formulas: {
      actuales: 'Oportunidades ubicadas actualmente en la etapa.',
      alcanzaron: 'Oportunidades distintas cuyo historial contiene esa etapa (incluye abiertas, cerradas y perdidas).',
      avanzaron: 'Oportunidades que alcanzaron esa etapa y también la etapa inmediata siguiente.',
      conversion: 'avanzaron / alcanzaron × 100',
      fuga_observada: '100 − conversión (incluye oportunidades pendientes en seguimiento y pérdidas confirmadas; una oportunidad pendiente no implica abandono definitivo).',
      brecha: 'máximo(0, meta − conversión)',
      faltantes: 'máximo(0, techo(alcanzaron × meta / 100) − avanzaron)'
    }
  };
}

/**
 * Calcula la cola de seguimientos pendientes para oportunidades sin avance durante N días.
 * - Excluye oportunidades perdidas ('perdida') y cerradas ('cerrada' o etapa 9 'Seguimiento posviaje').
 * - Ordena de mayor a menor antigüedad.
 * - Marca prioridad 'alta' cuando dias_sin_avance >= 2 * umbralDias.
 */
export function calcularColaSeguimientos(oportunidades, umbralDias = 7, ahora = new Date()) {
  const nowMs = new Date(ahora).getTime();

  const filtradas = [];
  for (const op of oportunidades) {
    const ordenEtapa = Number(op.etapa_orden || op.etapa_id);
    const estaPerdida = op.estado_comercial === 'perdida';
    const estaCerrada = op.estado_comercial === 'cerrada' || ordenEtapa === 9;

    if (estaPerdida || estaCerrada) {
      continue;
    }

    const fechaUltimoAvanceStr = String(op.ultimo_avance_en).includes('T')
      ? op.ultimo_avance_en
      : `${String(op.ultimo_avance_en).replace(' ', 'T')}Z`;
    const avanceMs = new Date(fechaUltimoAvanceStr).getTime();
    const diffMs = Math.max(0, nowMs - avanceMs);
    const diasSinAvance = Math.floor(diffMs / 86400000);

    if (diasSinAvance >= umbralDias) {
      const esPrioridadAlta = diasSinAvance >= umbralDias * 2;
      filtradas.push({
        ...op,
        dias_sin_avance: diasSinAvance,
        umbral_dias: umbralDias,
        prioridad: esPrioridadAlta ? 'alta' : 'normal',
        es_prioridad_alta: esPrioridadAlta,
        siguiente_accion: obtenerSiguienteAccionPorOrden(ordenEtapa)
      });
    }
  }

  filtradas.sort((a, b) => {
    if (b.dias_sin_avance !== a.dias_sin_avance) {
      return b.dias_sin_avance - a.dias_sin_avance;
    }
    return String(a.ultimo_avance_en).localeCompare(String(b.ultimo_avance_en));
  });

  return filtradas;
}
