/**
 * Generador determinista de los 40 registros semilla y sus catálogos.
 * Este módulo es puro y se utiliza tanto en database/seed.js (contra MySQL)
 * como en las pruebas unitarias/integración y en la exportación JSON.
 */

export const SEDES_CATALOGO = [
  { id: 1, nombre: 'Desamparados' },
  { id: 2, nombre: 'Puntarenas' }
];

export const ETAPAS_CATALOGO = [
  {
    id: 1,
    nombre: 'Consulta recibida',
    orden: 1,
    meta_conversion: 80,
    siguiente_accion: 'Contactar al viajero para levantar preferencias de ruta, fechas y acompañantes.'
  },
  {
    id: 2,
    nombre: 'Preferencias identificadas',
    orden: 2,
    meta_conversion: 80,
    siguiente_accion: 'Diseñar y enviar cotización personalizada con opciones de hospedaje y vuelos.'
  },
  {
    id: 3,
    nombre: 'Cotización enviada',
    orden: 3,
    meta_conversion: 75,
    siguiente_accion: 'Confirmar recepción de la propuesta e iniciar seguimiento consultivo.'
  },
  {
    id: 4,
    nombre: 'Seguimiento de cotización',
    orden: 4,
    meta_conversion: 80,
    siguiente_accion: 'Resolver dudas sobre itinerario o presupuesto para lograr aceptación de propuesta.'
  },
  {
    id: 5,
    nombre: 'Propuesta aceptada',
    orden: 5,
    meta_conversion: 80,
    siguiente_accion: 'Coordinar instrucciones para recepción del anticipo y bloqueo de espacios.'
  },
  {
    id: 6,
    nombre: 'Anticipo recibido',
    orden: 6,
    meta_conversion: 75,
    siguiente_accion: 'Emitir vouchers, confirmar reservas con operadores y enviar confirmación formal.'
  },
  {
    id: 7,
    nombre: 'Reserva confirmada',
    orden: 7,
    meta_conversion: 80,
    siguiente_accion: 'Acompañar preparación previa al embarque y verificar ejecución del viaje.'
  },
  {
    id: 8,
    nombre: 'Viaje realizado',
    orden: 8,
    meta_conversion: 90,
    siguiente_accion: 'Realizar contacto posviaje para conocer satisfacción y solicitar referidos.'
  },
  {
    id: 9,
    nombre: 'Seguimiento posviaje',
    orden: 9,
    meta_conversion: null,
    siguiente_accion: 'Ciclo completado. Mantener relación activa para próximas temporadas.'
  }
];

export const MOTIVOS_PERDIDA_CATALOGO = [
  { id: 1, nombre: 'Precio' },
  { id: 2, nombre: 'Fechas' },
  { id: 3, nombre: 'Eligió otra agencia' },
  { id: 4, nombre: 'Canceló el viaje' },
  { id: 5, nombre: 'Sin respuesta' },
  { id: 6, nombre: 'Otro' }
];

export const CANALES_PERMITIDOS = ['Instagram', 'Referido', 'Web', 'WhatsApp'];
export const MONEDAS_PERMITIDAS = ['MXN', 'USD', 'EUR'];
export const DESTINOS_SEMILLA = ['Cancún', 'Oaxaca', 'Madrid', 'Bogotá'];

// Distribución exacta requerida por las 9 etapas: suma = 40 oportunidades
export const DISTRIBUCION_ETAPAS = [4, 4, 3, 18, 2, 2, 3, 2, 2];

const NOMBRES_CLIENTES_FICTICIOS = [
  'Valeria Mora Quirós (Ficticio)',
  'Sebastián Solís Araya (Ficticio)',
  'Camila Vargas Brenes (Ficticio)',
  'Mateo Jiménez Cordero (Ficticio)',
  'Lucía Rojas Alvarado (Ficticio)',
  'Daniel Castro Monge (Ficticio)',
  'Sofía Herrera Chacón (Ficticio)',
  'Andrés Navarro Salas (Ficticio)',
  'Mariana Madrigal Soto (Ficticio)',
  'Gabriel Quesada Méndez (Ficticio)',
  'Elena Calderón Vega (Ficticio)',
  'Diego Pacheco Ureña (Ficticio)',
  'Adriana Villalobos Fonseca (Ficticio)',
  'Javier Elizondo Campos (Ficticio)',
  'Natalia Bolaños Guzmán (Ficticio)',
  'Fernando Murillo Valverde (Ficticio)',
  'Carolina Arce Picado (Ficticio)',
  'Ricardo Zúñiga Paniagua (Ficticio)',
  'Paula Coto Chavarría (Ficticio)',
  'Esteban Granados Sancho (Ficticio)',
  'Alejandra AlfaroPorras (Ficticio)',
  'Mauricio Bermúdez Núñez (Ficticio)',
  'Isabel Chaves Mena (Ficticio)',
  'Roberto Corrales Zamora (Ficticio)',
  'Claudia Espinoza Fallas (Ficticio)',
  'Jorge Esquivel Meza (Ficticio)',
  'Patricia Fernández Leiva (Ficticio)',
  'Carlos Gamboa Rivera (Ficticio)',
  'Mónica Gómez Hidalgo (Ficticio)',
  'Héctor Hernández Barquero (Ficticio)',
  'Laura León Segura (Ficticio)',
  'Óscar López Marin (Ficticio)'
];

const PRESUPUESTOS_BASE_MXN = [
  28500.00, 34200.00, 46800.00, 52000.00,
  64500.00, 38900.00, 75000.00, 92400.00,
  41500.00, 58300.00
];

function restarDiasUTC(baseDate, dias, horasExtra = 0) {
  const ms = baseDate.getTime() - (dias * 86400000) - (horasExtra * 3600000);
  return new Date(ms);
}

export function formatearFechaMySQL(dateObj) {
  return dateObj.toISOString().slice(0, 19).replace('T', ' ');
}

export function formatearSoloFecha(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

/**
 * Construye el dataset semilla reproducible de 32 clientes (8 con múltiples viajes = 40 oportunidades)
 * con distribución actual [4, 4, 3, 18, 2, 2, 3, 2, 2] y fechas UTC distintas para cada transición.
 */
export function construirSemillaReproducible(nowInput = new Date()) {
  const now = new Date(nowInput);

  const canalesContacto = ['WhatsApp', 'Correo', 'Llamada', 'Instagram'];
  const clientes = NOMBRES_CLIENTES_FICTICIOS.map((nombre, idx) => {
    const creadoDate = restarDiasUTC(now, 95 - idx, idx % 6);
    const numId = idx + 1;
    return {
      id: numId,
      nombre: nombre.replace('AlfaroPorras', 'Alfaro Porras'),
      telefono: `+506 8000-${String(1000 + numId)} (Ficticio)`,
      correo: `viajero${numId}@rutaclara-demo.cr`,
      preferencia_contacto: canalesContacto[idx % canalesContacto.length],
      es_ficticio: 1,
      creado_en: formatearFechaMySQL(creadoDate)
    };
  });

  // 6 pérdidas confirmadas distribuidas en etapas intermedias para mostrar causas reales
  // Las oportunidades perdidas conservan su etapa e historial y permanecen en los denominadores históricos.
  const perdidasPorIndiceGlobal = new Map([
    [3, 1],  // Op #4 (Etapa 1) -> Precio
    [7, 2],  // Op #8 (Etapa 2) -> Fechas
    [10, 5], // Op #11 (Etapa 3) -> Sin respuesta
    [12, 1], // Op #13 (Etapa 4) -> Precio
    [15, 3], // Op #16 (Etapa 4) -> Eligió otra agencia
    [18, 5]  // Op #19 (Etapa 4) -> Sin respuesta
  ]);

  const oportunidades = [];
  const historial_etapas = [];
  const eventos_comerciales = [];

  let opId = 1;
  let histId = 1;
  let eventoId = 1;

  for (let etapaIdx = 0; etapaIdx < DISTRIBUCION_ETAPAS.length; etapaIdx += 1) {
    const etapaActualId = etapaIdx + 1;
    const cantidadEnEtapa = DISTRIBUCION_ETAPAS[etapaIdx];

    for (let k = 0; k < cantidadEnEtapa; k += 1) {
      const globalIndex = opId - 1;
      // Los primeros 8 clientes tienen 2 oportunidades independientes; los demás 1 oportunidad.
      const clienteId = globalIndex < 32 ? globalIndex + 1 : (globalIndex - 31);
      const sedeId = (globalIndex % 2) + 1; // 1: Desamparados, 2: Puntarenas
      const destino = DESTINOS_SEMILLA[globalIndex % DESTINOS_SEMILLA.length];
      const canal = CANALES_PERMITIDOS[globalIndex % CANALES_PERMITIDOS.length];
      const presupuesto = PRESUPUESTOS_BASE_MXN[globalIndex % PRESUPUESTOS_BASE_MXN.length] + ((k % 3) * 1500);
      const viajeros = (globalIndex % 4) + 1;

      // Días sin avance deliberadamente variados (entre 2 y 34 días) para alimentar la vista de Seguimientos
      const diasSinAvance = etapaActualId === 4
        ? 4 + (k * 2) // En Seguimiento de cotización tenemos desde 4 hasta 38 días de antigüedad
        : 2 + ((globalIndex * 3) % 19);

      // Cada etapa previa k_etapa (1..etapaActualId) ocurrió en una fecha UTC estrictamente distinta y ascendente
      const totalPasos = etapaActualId;
      const diasDesdeCreacion = diasSinAvance + ((totalPasos - 1) * 3);
      const creadoDate = restarDiasUTC(now, diasDesdeCreacion, (globalIndex % 11) + 1);

      let ultimoAvanceDate = creadoDate;
      for (let paso = 1; paso <= etapaActualId; paso += 1) {
        const diasHastaPaso = diasSinAvance + ((etapaActualId - paso) * 3);
        const fechaPaso = paso === 1
          ? creadoDate
          : restarDiasUTC(now, diasHastaPaso, (globalIndex + paso) % 9);

        if (paso === etapaActualId) {
          ultimoAvanceDate = fechaPaso;
        }

        historial_etapas.push({
          id: histId++,
          oportunidad_id: opId,
          etapa_id: paso,
          fecha: formatearFechaMySQL(fechaPaso)
        });
      }

      const motivoPerdidaId = perdidasPorIndiceGlobal.get(globalIndex) ?? null;
      let estadoComercial = 'abierta';
      if (motivoPerdidaId !== null) {
        estadoComercial = 'perdida';
      } else if (etapaActualId === 9) {
        estadoComercial = 'cerrada';
      }

      // Fecha de salida futura entre 35 y 180 días
      const salidaDate = new Date(now.getTime() + ((40 + (globalIndex * 3)) * 86400000));
      const editadoDate = ultimoAvanceDate;

      oportunidades.push({
        id: opId,
        cliente_id: clienteId,
        sede_id: sedeId,
        etapa_id: etapaActualId,
        destino,
        presupuesto_total: Number(presupuesto.toFixed(2)),
        moneda: 'MXN',
        viajeros,
        fecha_salida: formatearSoloFecha(salidaDate),
        canal,
        estado_comercial: estadoComercial,
        motivo_perdida_id: motivoPerdidaId,
        creado_en: formatearFechaMySQL(creadoDate),
        ultimo_avance_en: formatearFechaMySQL(ultimoAvanceDate),
        editado_en: formatearFechaMySQL(editadoDate)
      });

      if (motivoPerdidaId !== null) {
        const fechaPerdida = new Date(ultimoAvanceDate.getTime() + 7200000);
        eventos_comerciales.push({
          id: eventoId++,
          oportunidad_id: opId,
          etapa_id: etapaActualId,
          tipo: 'perdida',
          motivo_perdida_id: motivoPerdidaId,
          fecha: formatearFechaMySQL(fechaPerdida)
        });
      }

      opId += 1;
    }
  }

  const notas_oportunidad = [
    {
      id: 1,
      oportunidad_id: 12,
      autor: 'Asesor Ruta Clara',
      texto: 'Solicitó opciones de hotel boutique en La Candelaria y guía gastronómico para 4 personas.',
      fecha: formatearFechaMySQL(restarDiasUTC(now, 2, 3))
    },
    {
      id: 2,
      oportunidad_id: 14,
      autor: 'Asesor Ruta Clara',
      texto: 'Interesados en ruta artesanal por Oaxaca y Monte Albán; prefieren vuelos con escala corta.',
      fecha: formatearFechaMySQL(restarDiasUTC(now, 3, 2))
    },
    {
      id: 3,
      oportunidad_id: 15,
      autor: 'Asesor Ruta Clara',
      texto: 'Revisando fechas de vacaciones laborales para confirmar propuesta hacia Madrid.',
      fecha: formatearFechaMySQL(restarDiasUTC(now, 4, 5))
    }
  ];

  return {
    sedes: SEDES_CATALOGO.map((s) => ({ ...s })),
    etapas: ETAPAS_CATALOGO.map((e) => ({ ...e })),
    motivos_perdida: MOTIVOS_PERDIDA_CATALOGO.map((m) => ({ ...m })),
    clientes,
    oportunidades,
    historial_etapas,
    eventos_comerciales,
    notas_oportunidad,
    campanas_guardadas: []
  };
}
