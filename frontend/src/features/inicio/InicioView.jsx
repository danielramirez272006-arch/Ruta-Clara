import React from 'react';
import {
  Compass,
  Users,
  Briefcase,
  Clock,
  BarChart3,
  Megaphone,
  Settings,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import {
  BrandRouteDivider,
  EstadoComercialBadge,
  PrioridadBadge,
  SedeBadge,
  DatoFicticioBadge,
  LoadingState,
  AlertBanner
} from '../../components/ui/BrandComponents.jsx';
import {
  formatearPresupuesto,
  formatearPorcentaje,
  formatearPuntosPorcentuales
} from '../../utils/formatters.js';

export function InicioView({
  resumen,
  cargando,
  error,
  onRecargar,
  onAbrirOportunidad,
  onIrAPantalla
}) {
  if (cargando && !resumen) {
    return <LoadingState mensaje="Cargando tablero principal de Ruta Clara..." />;
  }

  if (error && !resumen) {
    return (
      <AlertBanner
        tipo="error"
        titulo="No se pudo cargar el resumen inicial"
        mensaje={error}
        accion={
          <button
            type="button"
            onClick={onRecargar}
            className="rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
          >
            Reintentar conexión
          </button>
        }
      />
    );
  }

  if (!resumen) return null;

  const {
    kpis,
    resumen_embudo = [],
    mayor_brecha,
    seguimientos_pendientes,
    distribucion_canal = []
  } = resumen;

  return (
    <div className="space-y-8">
      {/* Encabezado editorial con detalle de marca */}
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Panorama Comercial · Agencia Boutique</span>
              </span>
              <DatoFicticioBadge />
            </div>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta sm:text-3xl">
              Ruta Clara — Cada viaje, un camino claro
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-tinta/75">
              Seguimiento consultivo de oportunidades de viaje, detección temprana de fugas en cotizaciones y redacción asistida para revisión del agente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onIrAPantalla('oportunidades')}
              className="inline-flex items-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-tinta-suave"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              <span>Abrir tablero de oportunidades</span>
            </button>
            <button
              type="button"
              onClick={() => onIrAPantalla('metricas')}
              className="inline-flex items-center gap-2 rounded-xl border border-tinta/20 bg-marfil px-4 py-2.5 text-sm font-semibold text-tinta transition hover:bg-marfil-oscuro"
            >
              <BarChart3 className="h-4 w-4 text-turquesa" aria-hidden="true" />
              <span>Analizar embudo</span>
            </button>
          </div>
        </div>
        <BrandRouteDivider className="mt-5" label="Recorrido de 9 etapas" />
      </header>

      {/* 4 Indicadores Clave obligatorios */}
      <section aria-label="Indicadores principales del CRM">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-tinta/65">
                Oportunidades activas
              </span>
              <span className="rounded-lg bg-turquesa-claro p-2 text-turquesa">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-editorial text-3xl font-bold text-tinta">
              {kpis.oportunidades_activas}
            </p>
            <p className="mt-1 text-xs text-tinta/70">
              En gestión activa (etapas 1 a 8) de {kpis.total_oportunidades} oportunidades registradas.
            </p>
          </article>

          <article className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-tinta/65">
                Reservas alcanzadas
              </span>
              <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-editorial text-3xl font-bold text-tinta">
              {kpis.reservas_alcanzadas}
            </p>
            <p className="mt-1 text-xs text-tinta/70">
              Oportunidades cuyo historial alcanzó la etapa 7 (Reserva confirmada).
            </p>
          </article>

          <article className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-tinta/65">
                Viajes cerrados
              </span>
              <span className="rounded-lg bg-turquesa-claro p-2 text-tinta">
                <Sparkles className="h-4 w-4 text-turquesa" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-editorial text-3xl font-bold text-tinta">
              {kpis.viajes_cerrados}
            </p>
            <p className="mt-1 text-xs text-tinta/70">
              Recorridos completados hasta la etapa 9 (Seguimiento posviaje).
            </p>
          </article>

          <article className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-tinta/65">
                Pérdidas confirmadas
              </span>
              <span className="rounded-lg bg-red-100 p-2 text-red-800">
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-editorial text-3xl font-bold text-red-900">
              {kpis.perdidas_confirmadas}
            </p>
            <p className="mt-1 text-xs text-tinta/70">
              Oportunidades con motivo de pérdida registrado (conservan historial).
            </p>
          </article>
        </div>
      </section>

      {/* Tarjeta destacada: Mayor brecha frente a la meta */}
      {mayor_brecha ? (
        <section
          aria-label="Alerta de mayor brecha frente a la meta"
          className="rounded-2xl border-2 border-coral/60 bg-coral-claro/75 p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-coral p-2.5 text-white shadow-sm">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-tinta/75">
                  Mayor brecha frente a la meta · Punto crítico del embudo
                </span>
                <h2 className="mt-1 font-editorial text-xl font-bold text-tinta">
                  Etapa {mayor_brecha.orden}: {mayor_brecha.nombre} → {mayor_brecha.transicion_hacia}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-tinta/85">
                  Alcanzaron esta etapa <strong>{mayor_brecha.alcanzaron}</strong> oportunidades, pero solo avanzaron{' '}
                  <strong>{mayor_brecha.avanzaron}</strong> (conversión de{' '}
                  <strong>{formatearPorcentaje(mayor_brecha.conversion)}</strong> frente a la meta de{' '}
                  <strong>{formatearPorcentaje(mayor_brecha.meta, 0)}</strong>). La brecha es de{' '}
                  <strong>{formatearPuntosPorcentuales(mayor_brecha.brecha)}</strong> y faltan{' '}
                  <strong>{mayor_brecha.faltantes}</strong> avances para alcanzar la meta.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onIrAPantalla('metricas')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-tinta-suave"
            >
              <span>Ver diagnóstico completo</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}

      {/* Resumen del embudo (9 etapas) + Distribución por canal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="titulo-resumen-embudo"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="titulo-resumen-embudo" className="font-editorial text-lg font-bold text-tinta">
                Resumen del embudo de 9 etapas
              </h2>
              <p className="text-xs text-tinta/70">
                Distribución actual, acumulado histórico que alcanzó cada etapa y conversión hacia la siguiente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onIrAPantalla('oportunidades')}
              className="text-xs font-semibold text-turquesa underline hover:text-tinta"
            >
              Ir al Kanban
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-tinta/15 text-tinta/70">
                  <th className="py-2.5 pr-3 font-semibold">Etapa</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Actuales</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Alcanzaron</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Conversión</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Meta</th>
                  <th className="pl-2 py-2.5 text-right font-semibold">Brecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta/10">
                {resumen_embudo.map((et) => {
                  const esCritica = mayor_brecha && Number(mayor_brecha.etapa_id) === Number(et.etapa_id);
                  return (
                    <tr
                      key={et.etapa_id}
                      className={esCritica ? 'bg-coral-claro/60 font-medium' : 'hover:bg-marfil/60'}
                    >
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tinta text-[11px] font-bold text-white">
                            {et.orden}
                          </span>
                          <span className="text-tinta">{et.nombre}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold text-tinta">{et.actuales}</td>
                      <td className="px-2 py-2.5 text-right text-tinta/80">{et.alcanzaron}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-turquesa">
                        {formatearPorcentaje(et.conversion)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-tinta/75">
                        {et.meta !== null ? formatearPorcentaje(et.meta, 0) : 'Sin transición'}
                      </td>
                      <td className="pl-2 py-2.5 text-right">
                        {et.brecha !== null && et.brecha > 0 ? (
                          <span className="rounded bg-coral/20 px-1.5 py-0.5 font-semibold text-tinta">
                            {formatearPuntosPorcentuales(et.brecha)}
                          </span>
                        ) : et.meta !== null ? (
                          <span className="text-emerald-800 font-semibold">En meta</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Distribución por canal */}
        <section
          aria-labelledby="titulo-canales"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
        >
          <h2 id="titulo-canales" className="font-editorial text-lg font-bold text-tinta">
            Distribución por canal
          </h2>
          <p className="text-xs text-tinta/70">
            Origen comercial de las {kpis.total_oportunidades} oportunidades de viaje.
          </p>

          <ul className="mt-5 space-y-4">
            {distribucion_canal.map((item) => (
              <li key={item.canal} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-tinta">{item.canal}</span>
                  <span className="text-tinta/75">
                    <strong>{item.cantidad}</strong> ({formatearPorcentaje(item.porcentaje, 1)})
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-marfil-oscuro">
                  <div
                    className="h-full rounded-full bg-turquesa transition-all"
                    style={{ width: `${Math.min(100, Math.round(item.porcentaje))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <BrandRouteDivider className="my-5" label="Sedes Activas" />

          <div className="grid grid-cols-2 gap-3">
            {(resumen.distribucion_sede || []).map((sede) => (
              <div
                key={sede.sede_id}
                className="rounded-xl border border-tinta/15 bg-marfil/70 p-3 text-center"
              >
                <p className="text-xs font-semibold text-tinta/70">{sede.sede_nombre}</p>
                <p className="mt-1 font-editorial text-xl font-bold text-tinta">{sede.cantidad}</p>
                <p className="text-[11px] text-tinta/65">
                  {formatearPorcentaje(sede.porcentaje, 1)} del total
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Seguimientos pendientes destacados */}
      <section
        aria-labelledby="titulo-seguimientos-inicio"
        className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="titulo-seguimientos-inicio" className="font-editorial text-lg font-bold text-tinta">
              Seguimientos pendientes ({seguimientos_pendientes?.total || 0} sin avance ≥{' '}
              {seguimientos_pendientes?.umbral_dias || 7} días)
            </h2>
            <p className="text-xs text-tinta/70">
              Se excluyen oportunidades perdidas y cerradas. Prioridad alta a partir de{' '}
              {(seguimientos_pendientes?.umbral_dias || 7) * 2} días.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onIrAPantalla('seguimientos')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-tinta/20 bg-marfil px-3.5 py-2 text-xs font-semibold text-tinta hover:bg-marfil-oscuro"
          >
            <Clock className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
            <span>Ver cola completa ({seguimientos_pendientes?.total || 0})</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(seguimientos_pendientes?.destacados || []).map((op) => (
            <article
              key={op.id}
              className="flex flex-col justify-between rounded-xl border border-tinta/15 bg-marfil/40 p-4 transition hover:border-turquesa"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <PrioridadBadge
                    esAlta={op.es_prioridad_alta}
                    dias={op.dias_sin_avance}
                    umbral={op.umbral_dias}
                  />
                  <SedeBadge nombre={op.sede_nombre} />
                </div>
                <h3 className="mt-2.5 font-editorial text-base font-bold text-tinta">
                  {op.destino} · {op.cliente_nombre}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-turquesa">
                  Etapa {op.etapa_orden}: {op.etapa_nombre}
                </p>
                <p className="mt-2 text-xs text-tinta/75 line-clamp-2">
                  <strong>Siguiente acción:</strong> {op.siguiente_accion}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-tinta/10 pt-3">
                <span className="text-xs font-semibold text-tinta">
                  {formatearPresupuesto(op.presupuesto_total, op.moneda)}
                </span>
                <button
                  type="button"
                  onClick={() => onAbrirOportunidad(op.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                >
                  <span>Abrir ficha</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
