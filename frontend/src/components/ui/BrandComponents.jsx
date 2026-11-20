import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  Lock
} from 'lucide-react';

/**
 * Línea de recorrido con puntos como detalle distintivo de marca "Ruta Clara".
 */
export function BrandRouteDivider({ className = '', label = '' }) {
  return (
    <div className={`ruta-brand-line ${className}`} aria-hidden="true">
      <span className="ruta-brand-dot-turquesa" />
      <span className="ruta-brand-track" />
      {label ? (
        <span className="px-2 text-[11px] font-medium uppercase tracking-widest text-tinta/60">
          {label}
        </span>
      ) : null}
      <span className="ruta-brand-dot" />
      <span className="ruta-brand-track" />
      <span className="ruta-brand-dot-turquesa" />
    </div>
  );
}

/**
 * Etiqueta de estado comercial con icono y texto explícito (no depende solo del color).
 */
export function EstadoComercialBadge({ estado, motivo = null }) {
  const normalizado = String(estado || 'abierta').toLowerCase();

  if (normalizado === 'perdida') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-800/30 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-900">
        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
        <span>Perdida{motivo ? ` · ${motivo}` : ''}</span>
      </span>
    );
  }

  if (normalizado === 'cerrada') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
        <span>Ciclo cerrado</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-turquesa/35 bg-turquesa-claro px-2.5 py-0.5 text-xs font-semibold text-tinta">
      <Clock className="h-3.5 w-3.5 shrink-0 text-turquesa" aria-hidden="true" />
      <span>Abierta</span>
    </span>
  );
}

export function PrioridadBadge({ esAlta, dias, umbral }) {
  if (esAlta) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950"
        title={`Antigüedad (${dias} días) alcanza o supera el doble del umbral (${umbral * 2} días)`}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-800" aria-hidden="true" />
        <span>Prioridad alta · {dias} d</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tinta/20 bg-white px-2.5 py-0.5 text-xs font-medium text-tinta">
      <Clock className="h-3.5 w-3.5 shrink-0 text-turquesa" aria-hidden="true" />
      <span>Seguimiento · {dias} d</span>
    </span>
  );
}

export function DatoFicticioBadge({ visible = true }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-coral/45 bg-coral-claro px-2 py-0.5 text-[11px] font-medium text-tinta">
      <span>Ficticio</span>
    </span>
  );
}

export function SedeBadge({ nombre }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-tinta/15 bg-marfil px-2 py-0.5 text-xs font-medium text-tinta">
      <MapPin className="h-3 w-3 text-turquesa" aria-hidden="true" />
      <span>{nombre}</span>
    </span>
  );
}

export function AlertBanner({ tipo = 'info', titulo, mensaje, onClose = null, accion = null }) {
  if (!mensaje) return null;

  const estilos = {
    error: {
      box: 'border-red-800/35 bg-red-50 text-red-950',
      icon: <XCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />,
      role: 'alert'
    },
    exito: {
      box: 'border-emerald-800/35 bg-emerald-50 text-emerald-950',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />,
      role: 'status'
    },
    aviso: {
      box: 'border-amber-800/35 bg-amber-50 text-amber-950',
      icon: <AlertTriangle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />,
      role: 'status'
    },
    info: {
      box: 'border-turquesa/35 bg-turquesa-claro/60 text-tinta',
      icon: <Sparkles className="h-5 w-5 text-turquesa shrink-0 mt-0.5" aria-hidden="true" />,
      role: 'status'
    }
  };

  const actual = estilos[tipo] || estilos.info;

  return (
    <div
      role={actual.role}
      className={`flex items-start justify-between gap-3 rounded-xl border p-4 shadow-sm ${actual.box}`}
    >
      <div className="flex items-start gap-3">
        {actual.icon}
        <div>
          {titulo ? <p className="text-sm font-semibold">{titulo}</p> : null}
          <p className="text-sm leading-relaxed">{mensaje}</p>
          {accion ? <div className="mt-2">{accion}</div> : null}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold underline hover:opacity-80"
          aria-label="Cerrar notificación"
        >
          Cerrar
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState({ mensaje = 'Cargando información del CRM...' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-2xl border border-tinta/15 bg-white/80 p-10 text-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-turquesa border-t-transparent" />
      <p className="mt-3 text-sm font-medium text-tinta">{mensaje}</p>
    </div>
  );
}

export function EmptyState({ titulo, descripcion, accion = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-tinta/25 bg-white/70 p-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marfil-oscuro text-turquesa">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-editorial text-lg font-semibold text-tinta">{titulo}</h3>
      <p className="mt-1 max-w-md text-sm text-tinta/75">{descripcion}</p>
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  );
}

export function BloqueoPerdidaNotice({ motivo, onReabrir, cargando = false }) {
  return (
    <div className="rounded-xl border border-red-800/35 bg-red-50/90 p-4 text-red-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">
              Oportunidad bloqueada por pérdida confirmada ({motivo || 'Sin motivo especificado'})
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-900/90">
              Mientras esté perdida se conserva su etapa e historial, se excluye de la cola de seguimiento y quedan bloqueados los avances, la edición de preferencias y la redacción con IA.
            </p>
          </div>
        </div>
        {onReabrir ? (
          <button
            type="button"
            disabled={cargando}
            onClick={onReabrir}
            className="rounded-lg bg-tinta px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-tinta-suave disabled:opacity-50"
          >
            {cargando ? 'Reabriendo...' : 'Reabrir oportunidad'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
