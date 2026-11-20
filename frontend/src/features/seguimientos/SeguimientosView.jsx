import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  SlidersHorizontal,
  ArrowRight,
  Plane,
  CheckCircle2
} from 'lucide-react';
import {
  BrandRouteDivider,
  PrioridadBadge,
  SedeBadge,
  DatoFicticioBadge,
  AlertBanner,
  LoadingState,
  EmptyState
} from '../../components/ui/BrandComponents.jsx';
import { formatearPresupuesto, formatearFechaHoraUTC } from '../../utils/formatters.js';

export function SeguimientosView({
  colaAtencion,
  umbralDias,
  cargando,
  error,
  onCambiarUmbralDias,
  onAbrirOportunidad
}) {
  const [inputDias, setInputDias] = useState(String(umbralDias || 7));
  const [errorValidacionLocal, setErrorValidacionLocal] = useState(null);

  const handleSubmitUmbral = (e) => {
    e.preventDefault();
    const num = Number(inputDias);
    if (!Number.isInteger(num) || num < 1 || num > 365) {
      setErrorValidacionLocal('El umbral configurable debe ser un número entero entre 1 y 365 días.');
      return;
    }
    setErrorValidacionLocal(null);
    onCambiarUmbralDias(num);
  };

  const handlePreset = (valor) => {
    setInputDias(String(valor));
    setErrorValidacionLocal(null);
    onCambiarUmbralDias(valor);
  };

  const seguimientos = colaAtencion?.seguimientos || [];
  const umbralActual = colaAtencion?.umbral_dias || umbralDias || 7;
  const umbralPrioridadAlta = colaAtencion?.umbral_prioridad_alta || umbralActual * 2;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cola de Atención Comercial</span>
              </span>
              <DatoFicticioBadge />
            </div>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Seguimientos pendientes por antigüedad
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Muestra oportunidades abiertas sin avance durante <strong>{umbralActual}</strong> o más días, ordenadas de mayor a menor antigüedad. Se excluyen oportunidades perdidas y cerradas.
            </p>
          </div>
        </div>
        <BrandRouteDivider
          className="mt-4"
          label={`Prioridad alta a partir de ${umbralPrioridadAlta} días (2× umbral)`}
        />
      </header>

      {errorValidacionLocal ? (
        <AlertBanner
          tipo="error"
          titulo="Umbral fuera de rango"
          mensaje={errorValidacionLocal}
          onClose={() => setErrorValidacionLocal(null)}
        />
      ) : null}

      {error ? (
        <AlertBanner
          tipo="error"
          titulo="Error al consultar la cola de seguimiento"
          mensaje={error}
        />
      ) : null}

      {/* Controles del umbral N entre 1 y 365 días */}
      <section
        aria-labelledby="titulo-config-umbral"
        className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form onSubmit={handleSubmitUmbral} className="flex flex-wrap items-end gap-3" noValidate>
            <div>
              <label
                htmlFor="input-umbral-dias"
                className="flex items-center gap-1.5 text-xs font-semibold text-tinta"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                <span>Umbral de días sin avance (1 a 365 días)</span>
              </label>
              <input
                id="input-umbral-dias"
                type="number"
                min={1}
                max={365}
                required
                value={inputDias}
                onChange={(e) => setInputDias(e.target.value)}
                className="mt-1 w-36 rounded-xl border border-tinta/25 bg-marfil/60 px-3.5 py-2 text-sm font-bold text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-tinta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tinta-suave"
            >
              Aplicar umbral
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-tinta/70">Accesos rápidos:</span>
            {[3, 7, 14, 21, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handlePreset(d)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  Number(umbralActual) === d
                    ? 'border-turquesa bg-turquesa text-white'
                    : 'border-tinta/20 bg-marfil text-tinta hover:bg-marfil-oscuro'
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-tinta/10 pt-4 sm:grid-cols-3">
          <div className="rounded-xl bg-marfil/70 p-3">
            <p className="text-xs text-tinta/70">Oportunidades en cola (≥ {umbralActual} días)</p>
            <p className="mt-0.5 font-editorial text-2xl font-bold text-tinta">
              {colaAtencion?.total_pendientes ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-amber-800/25 bg-amber-50/75 p-3">
            <p className="text-xs font-semibold text-amber-950">
              Prioridad alta (≥ {umbralPrioridadAlta} días · doble del umbral)
            </p>
            <p className="mt-0.5 font-editorial text-2xl font-bold text-amber-950">
              {colaAtencion?.total_prioridad_alta ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-marfil/70 p-3">
            <p className="text-xs text-tinta/70">Criterio de exclusión</p>
            <p className="mt-1 text-xs font-semibold text-tinta">
              Excluye pérdidas confirmadas y viajes cerrados (etapa 9)
            </p>
          </div>
        </div>
      </section>

      {/* Listado ordenado de mayor a menor antigüedad */}
      {cargando ? (
        <LoadingState mensaje="Calculando antigüedad de seguimientos pendientes..." />
      ) : seguimientos.length === 0 ? (
        <EmptyState
          titulo={`No hay oportunidades estancadas por ${umbralActual} o más días`}
          descripcion="Todas las oportunidades abiertas registraron avances recientes o el umbral configurado es alto."
        />
      ) : (
        <div className="space-y-3">
          {seguimientos.map((op) => (
            <article
              key={op.id}
              className={`rounded-2xl border p-5 shadow-sm transition ${
                op.es_prioridad_alta
                  ? 'border-amber-800/45 bg-amber-50/40'
                  : 'border-tinta/15 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <PrioridadBadge
                      esAlta={op.es_prioridad_alta}
                      dias={op.dias_sin_avance}
                      umbral={umbralActual}
                    />
                    <span className="inline-flex items-center gap-1 rounded-full bg-tinta px-2.5 py-0.5 text-xs font-semibold text-white">
                      Etapa {op.etapa_orden}: {op.etapa_nombre}
                    </span>
                    <SedeBadge nombre={op.sede_nombre} />
                    <span className="text-xs text-tinta/70">Canal: {op.canal}</span>
                  </div>

                  <h2 className="font-editorial text-lg font-bold text-tinta">
                    <span className="inline-flex items-center gap-1.5">
                      <Plane className="h-4 w-4 text-turquesa" aria-hidden="true" />
                      <span>
                        #{op.id} · {op.destino} — {op.cliente_nombre}
                      </span>
                    </span>
                  </h2>

                  <p className="text-xs text-tinta/75">
                    Último avance registrado: <strong>{formatearFechaHoraUTC(op.ultimo_avance_en)}</strong> ·
                    Presupuesto declarado:{' '}
                    <strong>{formatearPresupuesto(op.presupuesto_total, op.moneda)}</strong> ({op.viajeros}{' '}
                    viaj.)
                  </p>

                  <div className="mt-2 rounded-xl border border-turquesa/25 bg-turquesa-claro/45 p-3">
                    <p className="text-xs font-semibold text-tinta">
                      <strong className="text-turquesa">Siguiente acción recomendada:</strong>{' '}
                      {op.siguiente_accion}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onAbrirOportunidad(op.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-tinta px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tinta-suave"
                  >
                    <span>Atender en ficha</span>
                    <ArrowRight className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
