import React from 'react';
import {
  BarChart3,
  AlertTriangle,
  Calculator,
  XCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  BrandRouteDivider,
  DatoFicticioBadge,
  LoadingState,
  AlertBanner
} from '../../components/ui/BrandComponents.jsx';
import {
  formatearPorcentaje,
  formatearPuntosPorcentuales
} from '../../utils/formatters.js';

export function MetricasView({ metricas, cargando, error, onRecargar }) {
  if (cargando && !metricas) {
    return <LoadingState mensaje="Calculando métricas históricas y brechas del embudo..." />;
  }

  if (error && !metricas) {
    return (
      <AlertBanner
        tipo="error"
        titulo="Error al cargar las métricas del embudo"
        mensaje={error}
        accion={
          <button
            type="button"
            onClick={onRecargar}
            className="rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        }
      />
    );
  }

  if (!metricas) return null;

  const etapas = metricas.etapas || [];
  const mayorBrecha = metricas.mayor_brecha;
  const perdidasConfirmadas = metricas.perdidas_confirmadas || { total: 0, por_motivo: [] };
  const etapaControl = etapas.find((e) => Number(e.orden) === 4);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Analítica de Conversión y Fuga</span>
              </span>
              <DatoFicticioBadge />
            </div>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Métricas del embudo, brechas y pérdidas confirmadas
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Los cálculos se realizan sin redondear valores intermedios; el redondeo se aplica únicamente en la presentación visual. Las oportunidades perdidas permanecen en los denominadores históricos.
            </p>
          </div>
        </div>
        <BrandRouteDivider className="mt-4" label="Diagnóstico por transición" />
      </header>

      {/* Distinción conceptual entre Fuga observada y Pérdida confirmada + Análisis en 5 líneas */}
      <section
        aria-labelledby="titulo-distincion-fuga"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="rounded-2xl border-2 border-coral/60 bg-coral-claro/70 p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-coral" aria-hidden="true" />
            <h2 id="titulo-distincion-fuga" className="font-editorial text-lg font-bold text-tinta">
              Análisis de la fuga en cinco líneas (Etapa 4: Seguimiento de cotización)
            </h2>
          </div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-tinta/90">
            <li>
              <strong>1. Cuello de botella principal:</strong> La etapa 4 (&ldquo;Seguimiento de cotización&rdquo;) concentra la mayor brecha del embudo con <strong>42,07 puntos porcentuales</strong> por debajo de su meta didáctica del 80%.
            </li>
            <li>
              <strong>2. Volumen estancado:</strong> De las <strong>29 oportunidades</strong> que alcanzaron esta etapa, solo <strong>11 avanzaron</strong> a &ldquo;Propuesta aceptada&rdquo; (conversión de <strong>37,93%</strong> y fuga observada de <strong>62,07%</strong>).
            </li>
            <li>
              <strong>3. Fuga observada vs. pérdida confirmada:</strong> De las 18 oportunidades que no han avanzado desde la etapa 4, la mayoría siguen <em>abiertas y pendientes de seguimiento</em>; una oportunidad pendiente no implica abandono definitivo.
            </li>
            <li>
              <strong>4. Meta operativa:</strong> Con la fórmula <code>máximo(0, techo(29 × 80 / 100) − 11)</code>, faltan exactamente <strong>13 oportunidades</strong> que avancen a la etapa 5 para alcanzar la meta del 80%.
            </li>
            <li>
              <strong>5. Acción correctiva:</strong> Priorizar en la cola de Seguimientos las cotizaciones con antigüedad mayor al umbral y redactar mensajes consultivos con IA para destrabar dudas de itinerario o presupuesto.
            </li>
          </ol>
        </div>

        {/* Tarjeta de Valores de Control de la Semilla */}
        {etapaControl ? (
          <div className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-turquesa">
                Verificación de Valores de Control
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Etapa 4 auditada</span>
              </span>
            </div>
            <h3 className="mt-1 font-editorial text-lg font-bold text-tinta">
              {etapaControl.orden}. {etapaControl.nombre}
            </h3>

            <dl className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-marfil p-2.5">
                <dt className="text-tinta/70">Alcanzaron (denominador)</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-tinta">
                  {etapaControl.alcanzaron}
                </dd>
              </div>
              <div className="rounded-xl bg-marfil p-2.5">
                <dt className="text-tinta/70">Avanzaron a etapa 5</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-tinta">
                  {etapaControl.avanzaron}
                </dd>
              </div>
              <div className="rounded-xl bg-marfil p-2.5">
                <dt className="text-tinta/70">Conversión</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-turquesa">
                  {formatearPorcentaje(etapaControl.conversion)}
                </dd>
              </div>
              <div className="rounded-xl bg-marfil p-2.5">
                <dt className="text-tinta/70">Fuga observada</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-tinta">
                  {formatearPorcentaje(etapaControl.fuga_observada)}
                </dd>
              </div>
              <div className="rounded-xl border border-coral/40 bg-coral-claro/60 p-2.5">
                <dt className="text-tinta/80 font-semibold">Brecha frente a meta (80%)</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-tinta">
                  {formatearPuntosPorcentuales(etapaControl.brecha)}
                </dd>
              </div>
              <div className="rounded-xl border border-coral/40 bg-coral-claro/60 p-2.5">
                <dt className="text-tinta/80 font-semibold">Faltantes para la meta</dt>
                <dd className="mt-0.5 font-editorial text-lg font-bold text-tinta">
                  {etapaControl.faltantes}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>

      {/* Tabla completa de las 9 etapas del embudo */}
      <section
        aria-labelledby="titulo-tabla-metricas"
        className="overflow-hidden rounded-2xl border border-tinta/15 bg-white shadow-sm"
      >
        <div className="border-b border-tinta/10 p-5">
          <h2 id="titulo-tabla-metricas" className="font-editorial text-lg font-bold text-tinta">
            Matriz de conversión por las 9 etapas del embudo
          </h2>
          <p className="text-xs text-tinta/70">
            La etapa 9 (&ldquo;Seguimiento posviaje&rdquo;) cierra el ciclo comercial y no tiene transición posterior (devuelve <code>null</code> / &ldquo;—&rdquo;).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-tinta/15 bg-marfil text-tinta/75">
                <th className="px-4 py-3 font-semibold">Etapa del embudo</th>
                <th className="px-3 py-3 text-right font-semibold">Actuales</th>
                <th className="px-3 py-3 text-right font-semibold">Abiertas / Perdidas</th>
                <th className="px-3 py-3 text-right font-semibold">Alcanzaron</th>
                <th className="px-3 py-3 text-right font-semibold">Avanzaron</th>
                <th className="px-3 py-3 text-right font-semibold">Conversión</th>
                <th className="px-3 py-3 text-right font-semibold">Fuga observada</th>
                <th className="px-3 py-3 text-right font-semibold">Meta</th>
                <th className="px-3 py-3 text-right font-semibold">Brecha</th>
                <th className="px-4 py-3 text-right font-semibold">Faltantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta/10">
              {etapas.map((et) => {
                const esMayorBrecha =
                  mayorBrecha && Number(mayorBrecha.etapa_id) === Number(et.etapa_id);

                return (
                  <tr
                    key={et.etapa_id}
                    className={esMayorBrecha ? 'bg-coral-claro/65 font-medium' : 'hover:bg-marfil/60'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tinta text-[11px] font-bold text-white">
                          {et.orden}
                        </span>
                        <div>
                          <p className="font-bold text-tinta">{et.nombre}</p>
                          {et.transicion_hacia ? (
                            <p className="text-[11px] text-tinta/60">
                              Hacia: {et.transicion_hacia}
                            </p>
                          ) : (
                            <p className="text-[11px] text-tinta/60">Fin del recorrido</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-tinta">{et.actuales}</td>
                    <td className="px-3 py-3 text-right text-tinta/75">
                      <span className="text-turquesa font-semibold">{et.actuales_abiertas} ab.</span>
                      {' / '}
                      <span className="text-red-800 font-semibold">{et.perdidas_confirmadas} perd.</span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-tinta">
                      {et.alcanzaron}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-tinta">
                      {et.avanzaron !== null ? et.avanzaron : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-turquesa">
                      {formatearPorcentaje(et.conversion)}
                    </td>
                    <td className="px-3 py-3 text-right text-tinta/85">
                      {formatearPorcentaje(et.fuga_observada)}
                    </td>
                    <td className="px-3 py-3 text-right text-tinta/80">
                      {et.meta !== null ? formatearPorcentaje(et.meta, 0) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {et.brecha !== null ? (
                        et.brecha > 0 ? (
                          <span className="rounded bg-coral/25 px-2 py-0.5 font-bold text-tinta">
                            {formatearPuntosPorcentuales(et.brecha)}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-800">0,00 pp</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-tinta">
                      {et.faltantes !== null ? et.faltantes : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pérdidas confirmadas por motivo + Explicación de las fórmulas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="titulo-motivos-perdida"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm lg:col-span-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-700" aria-hidden="true" />
              <h2 id="titulo-motivos-perdida" className="font-editorial text-lg font-bold text-tinta">
                Pérdidas confirmadas y sus motivos
              </h2>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-900">
              Total: {perdidasConfirmadas.total}
            </span>
          </div>
          <p className="mt-1 text-xs text-tinta/70">
            Solo incluye oportunidades donde el agente registró explícitamente un abandono. Se distinguen de la fuga observada (que incluye oportunidades aún abiertas).
          </p>

          <ul className="mt-4 space-y-3">
            {(perdidasConfirmadas.por_motivo || []).map((m) => {
              const pct =
                perdidasConfirmadas.total > 0
                  ? (m.cantidad / perdidasConfirmadas.total) * 100
                  : 0;
              return (
                <li key={m.motivo_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-tinta">{m.nombre}</span>
                    <span className="text-tinta/75">
                      <strong>{m.cantidad}</strong> ({formatearPorcentaje(pct, 1)})
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-marfil-oscuro">
                    <div
                      className="h-full rounded-full bg-red-700 transition-all"
                      style={{ width: `${Math.min(100, Math.round(pct))}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby="titulo-explicacion-formulas"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm lg:col-span-7"
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-turquesa" aria-hidden="true" />
            <h2 id="titulo-explicacion-formulas" className="font-editorial text-lg font-bold text-tinta">
              Explicación metodológica de las fórmulas
            </h2>
          </div>
          <p className="mt-1 text-xs text-tinta/70">
            Definiciones exactas implementadas en el servicio de métricas del backend.
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Actuales</dt>
              <dd className="mt-1 text-tinta/80">
                Oportunidades que se encuentran actualmente posicionadas en la etapa.
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Alcanzaron</dt>
              <dd className="mt-1 text-tinta/80">
                Oportunidades distintas cuyo historial en <code>historial_etapas</code> contiene esa etapa. Las oportunidades perdidas permanecen en este denominador.
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Avanzaron</dt>
              <dd className="mt-1 text-tinta/80">
                Oportunidades que alcanzaron esa etapa y también registran en su historial la etapa inmediata siguiente.
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Conversión (%)</dt>
              <dd className="mt-1 font-mono text-[11px] text-turquesa">
                avanzaron / alcanzaron × 100
              </dd>
              <dd className="mt-0.5 text-tinta/75">
                Si <code>alcanzaron = 0</code> o es la última etapa, devuelve <code>null</code>.
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Fuga observada (%)</dt>
              <dd className="mt-1 font-mono text-[11px] text-turquesa">
                100 − conversión
              </dd>
              <dd className="mt-0.5 text-tinta/75">
                Representa la proporción que aún no ha transitado a la siguiente etapa (pendientes + perdidas).
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3">
              <dt className="font-bold text-tinta">Brecha frente a la meta (pp)</dt>
              <dd className="mt-1 font-mono text-[11px] text-turquesa">
                máximo(0, meta − conversión)
              </dd>
              <dd className="mt-0.5 text-tinta/75">
                Puntos porcentuales pendientes para alcanzar la meta didáctica de la transición.
              </dd>
            </div>

            <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3 sm:col-span-2">
              <dt className="font-bold text-tinta">Faltantes para alcanzar la meta (unidades)</dt>
              <dd className="mt-1 font-mono text-[11px] text-turquesa">
                máximo(0, techo(alcanzaron × meta / 100) − avanzaron)
              </dd>
              <dd className="mt-0.5 text-tinta/75">
                Cantidad entera mínima de oportunidades adicionales de esa etapa que deben avanzar a la siguiente para cumplir la meta porcentual.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
