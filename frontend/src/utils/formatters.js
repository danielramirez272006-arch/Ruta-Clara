/**
 * Utilidades de formato en español para monedas, porcentajes y fechas.
 * Nunca suma monedas distintas ni presenta presupuestos declarados como ingresos.
 */

const FORMATEADORES_MONEDA = {
  MXN: new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),
  USD: new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),
  EUR: new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
};

export function formatearPresupuesto(importe, moneda = 'MXN') {
  const num = Number(importe);
  if (!Number.isFinite(num)) return `0,00 ${moneda}`;
  const codigo = String(moneda || 'MXN').toUpperCase();
  const fmt = FORMATEADORES_MONEDA[codigo];
  if (fmt) {
    return `${fmt.format(num)} ${codigo}`;
  }
  return `${num.toFixed(2)} ${codigo}`;
}

export function formatearPorcentaje(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '—';
  }
  return `${Number(valor).toFixed(decimales).replace('.', ',')}%`;
}

export function formatearPuntosPorcentuales(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '—';
  }
  return `${Number(valor).toFixed(decimales).replace('.', ',')} pp`;
}

export function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return '—';
  const limpia = String(fechaStr).slice(0, 10);
  const [anio, mes, dia] = limpia.split('-').map(Number);
  if (!anio || !mes || !dia) return fechaStr;

  const meses = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  return `${String(dia).padStart(2, '0')} ${meses[mes - 1]} ${anio}`;
}

export function formatearFechaHoraUTC(fechaStr) {
  if (!fechaStr) return '—';
  const normalizada = String(fechaStr).includes('T')
    ? fechaStr
    : `${String(fechaStr).replace(' ', 'T')}Z`;
  const d = new Date(normalizada);
  if (Number.isNaN(d.getTime())) return String(fechaStr);

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(d) + ' UTC';
}

export const SEDES_LISTA = [
  { id: 1, nombre: 'Desamparados' },
  { id: 2, nombre: 'Puntarenas' }
];

export const CANALES_LISTA = ['Instagram', 'Referido', 'Web', 'WhatsApp'];
export const MONEDAS_LISTA = ['MXN', 'USD', 'EUR'];

export const MOTIVOS_PERDIDA_LISTA = [
  { id: 1, nombre: 'Precio' },
  { id: 2, nombre: 'Fechas' },
  { id: 3, nombre: 'Eligió otra agencia' },
  { id: 4, nombre: 'Canceló el viaje' },
  { id: 5, nombre: 'Sin respuesta' },
  { id: 6, nombre: 'Otro' }
];

export const ETAPAS_LISTA = [
  { id: 1, orden: 1, nombre: 'Consulta recibida', meta_conversion: 80 },
  { id: 2, orden: 2, nombre: 'Preferencias identificadas', meta_conversion: 80 },
  { id: 3, orden: 3, nombre: 'Cotización enviada', meta_conversion: 75 },
  { id: 4, orden: 4, nombre: 'Seguimiento de cotización', meta_conversion: 80 },
  { id: 5, orden: 5, nombre: 'Propuesta aceptada', meta_conversion: 80 },
  { id: 6, orden: 6, nombre: 'Anticipo recibido', meta_conversion: 75 },
  { id: 7, orden: 7, nombre: 'Reserva confirmada', meta_conversion: 80 },
  { id: 8, orden: 8, nombre: 'Viaje realizado', meta_conversion: 90 },
  { id: 9, orden: 9, nombre: 'Seguimiento posviaje', meta_conversion: null }
];
