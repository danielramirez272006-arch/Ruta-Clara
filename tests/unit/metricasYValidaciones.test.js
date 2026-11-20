import test from 'node:test';
import assert from 'node:assert/strict';
import { construirSemillaReproducible, DISTRIBUCION_ETAPAS } from '../../database/seedData.js';
import { calcularMetricasEmbudo, calcularColaSeguimientos } from '../../backend/src/services/metricasService.js';
import {
  validarCrearOportunidad,
  validarPreferenciasViaje,
  validarUmbralDias,
  validarCambioEstadoComercial
} from '../../backend/src/validators/schemas.js';
import {
  construirPromptMensajeOportunidad,
  ClaudeIntegration
} from '../../backend/src/integrations/claudeIntegration.js';

test('1. Semilla reproducible contiene exactamente 40 oportunidades con distribución [4, 4, 3, 18, 2, 2, 3, 2, 2]', () => {
  const semilla = construirSemillaReproducible(new Date('2026-11-20T12:00:00Z'));

  assert.equal(semilla.oportunidades.length, 40, 'Deben existir exactamente 40 oportunidades');

  const conteosActuales = DISTRIBUCION_ETAPAS.map((_, idx) => {
    const etapaId = idx + 1;
    return semilla.oportunidades.filter((o) => o.etapa_id === etapaId).length;
  });

  assert.deepEqual(conteosActuales, [4, 4, 3, 18, 2, 2, 3, 2, 2]);

  // Verificar que cada oportunidad tiene historial de todas las etapas anteriores que alcanzó y fechas distintas
  for (const op of semilla.oportunidades) {
    const histOp = semilla.historial_etapas.filter((h) => h.oportunidad_id === op.id);
    assert.equal(
      histOp.length,
      op.etapa_id,
      `La oportunidad #${op.id} en etapa ${op.etapa_id} debe tener ${op.etapa_id} registros de historial`
    );

    const etapasEnHistorial = histOp.map((h) => h.etapa_id);
    const esperadas = Array.from({ length: op.etapa_id }, (_, i) => i + 1);
    assert.deepEqual(etapasEnHistorial, esperadas);

    const fechasUnicas = new Set(histOp.map((h) => h.fecha));
    assert.equal(
      fechasUnicas.size,
      histOp.length,
      `La oportunidad #${op.id} debe tener fechas distintas en cada etapa de su historial`
    );
  }
});

test('2. Métricas de control para etapa 4 ("Seguimiento de cotización") coinciden con los valores exigidos', () => {
  const semilla = construirSemillaReproducible(new Date('2026-11-20T12:00:00Z'));
  const metricas = calcularMetricasEmbudo({
    etapas: semilla.etapas,
    oportunidades: semilla.oportunidades,
    historialEtapas: semilla.historial_etapas,
    motivosPerdida: semilla.motivos_perdida
  });

  const etapa4 = metricas.etapas.find((e) => e.orden === 4);
  assert.ok(etapa4, 'Debe existir la etapa 4 en el resultado');

  // Valores de control exigidos:
  // Alcanzaron: 29, Avanzaron: 11, Conversión: 37,93%, Fuga observada: 62,07%, Brecha: 42,07 pp, Faltantes: 13
  assert.equal(etapa4.actuales, 18);
  assert.equal(etapa4.alcanzaron, 29);
  assert.equal(etapa4.avanzaron, 11);
  assert.equal(Number(etapa4.conversion.toFixed(2)), 37.93);
  assert.equal(Number(etapa4.fuga_observada.toFixed(2)), 62.07);
  assert.equal(Number(etapa4.brecha.toFixed(2)), 42.07);
  assert.equal(etapa4.faltantes, 13);

  // La última etapa (9) no tiene transición y devuelve null en métricas de transición
  const etapa9 = metricas.etapas.find((e) => e.orden === 9);
  assert.equal(etapa9.conversion, null);
  assert.equal(etapa9.fuga_observada, null);
  assert.equal(etapa9.brecha, null);
  assert.equal(etapa9.faltantes, null);

  // La mayor brecha del embudo es la etapa 4
  assert.equal(metricas.mayor_brecha.orden, 4);
});

test('3. Sin denominador (0 oportunidades que alcanzaron la etapa), las métricas devuelven null', () => {
  const semilla = construirSemillaReproducible(new Date('2026-11-20T12:00:00Z'));
  const metricasVacias = calcularMetricasEmbudo({
    etapas: semilla.etapas,
    oportunidades: [],
    historialEtapas: [],
    motivosPerdida: semilla.motivos_perdida
  });

  for (const et of metricasVacias.etapas) {
    assert.equal(et.conversion, null);
    assert.equal(et.fuga_observada, null);
    assert.equal(et.brecha, null);
    assert.equal(et.faltantes, null);
  }
});

test('4. Validaciones rechazan presupuestos negativos o cero, fechas inválidas, viajeros fuera de 1..50 y umbral fuera de 1..365', () => {
  // Presupuesto negativo
  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Cancún',
        presupuesto_total: -500,
        moneda: 'MXN',
        viajeros: 2,
        fecha_salida: '2027-03-10',
        sede_id: 1,
        canal: 'WhatsApp'
      }),
    (err) => err.code === 'VALIDACION_PRESUPUESTO_INVALIDO'
  );

  // Presupuesto cero
  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Cancún',
        presupuesto_total: 0,
        moneda: 'MXN',
        viajeros: 2,
        fecha_salida: '2027-03-10',
        sede_id: 1,
        canal: 'WhatsApp'
      }),
    (err) => err.code === 'VALIDACION_PRESUPUESTO_INVALIDO'
  );

  // Fecha inexistente (30 de febrero)
  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Madrid',
        presupuesto_total: 45000,
        moneda: 'EUR',
        viajeros: 2,
        fecha_salida: '2027-02-30',
        sede_id: 1,
        canal: 'Web'
      }),
    (err) => err.code === 'VALIDACION_FECHA_INVALIDA'
  );

  // Viajeros fuera de rango (0 y 51)
  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Bogotá',
        presupuesto_total: 30000,
        moneda: 'USD',
        viajeros: 0,
        fecha_salida: '2027-05-15',
        sede_id: 2,
        canal: 'Instagram'
      }),
    (err) => err.code === 'VALIDACION_VIAJEROS_FUERA_RANGO'
  );

  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Bogotá',
        presupuesto_total: 30000,
        moneda: 'USD',
        viajeros: 51,
        fecha_salida: '2027-05-15',
        sede_id: 2,
        canal: 'Instagram'
      }),
    (err) => err.code === 'VALIDACION_VIAJEROS_FUERA_RANGO'
  );

  // Moneda no permitida
  assert.throws(
    () =>
      validarPreferenciasViaje({
        destino: 'Oaxaca',
        presupuesto_total: 25000,
        moneda: 'CAD',
        viajeros: 2,
        fecha_salida: '2027-05-15',
        sede_id: 1,
        canal: 'Referido'
      }),
    (err) => err.code === 'VALIDACION_MONEDA_INVALIDA'
  );

  // Umbral de días fuera de 1..365
  assert.throws(() => validarUmbralDias(0), (err) => err.code === 'VALIDACION_UMBRAL_DIAS');
  assert.throws(() => validarUmbralDias(366), (err) => err.code === 'VALIDACION_UMBRAL_DIAS');
  assert.equal(validarUmbralDias(15), 15);

  // Pérdida sin motivo
  assert.throws(
    () => validarCambioEstadoComercial({ estado_comercial: 'perdida' }),
    (err) => err.code === 'VALIDACION_MOTIVO_PERDIDA_REQUERIDO'
  );

  // Creación sin cliente
  assert.throws(
    () =>
      validarCrearOportunidad({
        destino: 'Oaxaca',
        presupuesto_total: 25000,
        moneda: 'MXN',
        viajeros: 2,
        fecha_salida: '2027-05-15',
        sede_id: 1,
        canal: 'Referido'
      }),
    (err) => err.code === 'VALIDACION_CLIENTE_REQUERIDO'
  );
});

test('5. Cola de seguimientos excluye oportunidades perdidas y cerradas, ordena de mayor a menor antigüedad y marca prioridad alta al doble del umbral', () => {
  const ahora = new Date('2026-11-20T12:00:00Z');
  const muestra = [
    {
      id: 101,
      etapa_id: 4,
      etapa_orden: 4,
      estado_comercial: 'abierta',
      ultimo_avance_en: '2026-11-10 12:00:00' // 10 días -> prioridad normal con umbral 7
    },
    {
      id: 102,
      etapa_id: 3,
      etapa_orden: 3,
      estado_comercial: 'abierta',
      ultimo_avance_en: '2026-11-05 12:00:00' // 15 días -> prioridad alta (>= 14)
    },
    {
      id: 103,
      etapa_id: 4,
      etapa_orden: 4,
      estado_comercial: 'perdida',
      ultimo_avance_en: '2026-10-20 12:00:00' // 31 días pero PERDIDA -> debe excluirse
    },
    {
      id: 104,
      etapa_id: 9,
      etapa_orden: 9,
      estado_comercial: 'cerrada',
      ultimo_avance_en: '2026-10-15 12:00:00' // 36 días pero CERRADA (etapa 9) -> debe excluirse
    }
  ];

  const cola = calcularColaSeguimientos(muestra, 7, ahora);
  assert.equal(cola.length, 2);
  assert.equal(cola[0].id, 102, 'El primero debe ser el de mayor antigüedad (15 días)');
  assert.equal(cola[0].es_prioridad_alta, true);
  assert.equal(cola[1].id, 101);
  assert.equal(cola[1].es_prioridad_alta, false);
});

test('6. Privacidad y manejo de errores de IA (DeepSeek): el prompt excluye nombres/contactos y falla con error claro si falta DEEPSEEK_API_KEY', async () => {
  const prompt = construirPromptMensajeOportunidad({
    etapa: 'Seguimiento de cotización',
    sede: 'Desamparados',
    siguiente_accion: 'Resolver dudas sobre itinerario.',
    destino: 'Oaxaca',
    presupuesto_total: 46800,
    moneda: 'MXN',
    viajeros: 2,
    fecha_salida: '2027-03-18',
    cliente_nombre: 'NOMBRE_SECRETO_NO_ENVIAR',
    telefono: '8888-8888'
  });

  assert.ok(prompt.includes('Seguimiento de cotización'));
  assert.ok(prompt.includes('Desamparados'));
  assert.ok(prompt.includes('Oaxaca'));
  assert.ok(prompt.includes('46800.00 MXN'));
  assert.ok(!prompt.includes('NOMBRE_SECRETO_NO_ENVIAR'), 'El prompt nunca debe incluir el nombre del cliente');
  assert.ok(!prompt.includes('8888-8888'), 'El prompt nunca debe incluir teléfonos o contactos');

  // Si falta la clave DEEPSEEK_API_KEY y ANTHROPIC_API_KEY, devuelve un error claro 503 sin plantillas falsas
  const prevDeepSeek = process.env.DEEPSEEK_API_KEY;
  const prevAnthropic = process.env.ANTHROPIC_API_KEY;
  process.env.DEEPSEEK_API_KEY = '';
  process.env.ANTHROPIC_API_KEY = '';
  try {
    const iaSinClave = new ClaudeIntegration();
    await assert.rejects(
      () =>
        iaSinClave.generarMensajeSeguimiento({
          etapa_nombre: 'Cotización enviada',
          sede_nombre: 'Puntarenas',
          siguiente_accion: 'Confirmar recepción.',
          destino: 'Cancún',
          presupuesto_total: 35000,
          moneda: 'MXN',
          viajeros: 2,
          fecha_salida: '2027-04-10'
        }),
      (err) => err.code === 'IA_API_KEY_FALTANTE' && err.statusCode === 503
    );
  } finally {
    process.env.DEEPSEEK_API_KEY = prevDeepSeek || '';
    process.env.ANTHROPIC_API_KEY = prevAnthropic || '';
  }

  // Si DeepSeek falla (ej. HTTP 500), maneja el fallo limpiamente con 502
  process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test-key';
  try {
    const iaConFalloProveedor = new ClaudeIntegration(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' })
    }));

    await assert.rejects(
      () =>
        iaConFalloProveedor.generarMensajeSeguimiento({
          etapa_nombre: 'Cotización enviada',
          sede_nombre: 'Puntarenas',
          siguiente_accion: 'Confirmar recepción.',
          destino: 'Cancún',
          presupuesto_total: 35000,
          moneda: 'MXN',
          viajeros: 2,
          fecha_salida: '2027-04-10'
        }),
      (err) => err.code === 'IA_PROVEEDOR_ERROR' && err.statusCode === 502
    );
  } finally {
    process.env.DEEPSEEK_API_KEY = prevDeepSeek || '';
    process.env.ANTHROPIC_API_KEY = prevAnthropic || '';
  }
});
