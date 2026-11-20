import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Plane,
  Users,
  Calendar,
  Edit3,
  XCircle,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  History
} from 'lucide-react';
import {
  BrandRouteDivider,
  EstadoComercialBadge,
  SedeBadge,
  DatoFicticioBadge,
  AlertBanner,
  LoadingState,
  BloqueoPerdidaNotice
} from '../../components/ui/BrandComponents.jsx';
import {
  formatearPresupuesto,
  formatearFechaCorta,
  formatearFechaHoraUTC,
  CANALES_LISTA,
  MONEDAS_LISTA,
  MOTIVOS_PERDIDA_LISTA,
  SEDES_LISTA
} from '../../utils/formatters.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function FichaOportunidadView({
  ficha,
  catalogos,
  cargandoFicha,
  onVolver,
  onEditarPreferencias,
  onAvanzarEtapa,
  onCambiarEstadoComercial,
  onGenerarMensajeIA
}) {
  const [editandoPreferencias, setEditandoPreferencias] = useState(false);
  const [mostrarConfirmacionAvance, setMostrarConfirmacionAvance] = useState(false);
  const [mostrarModalPerdida, setMostrarModalPerdida] = useState(false);
  const [motivoPerdidaId, setMotivoPerdidaId] = useState('1');

  const [formPref, setFormPref] = useState({
    destino: '',
    presupuesto_total: '',
    moneda: 'MXN',
    viajeros: '1',
    fecha_salida: '',
    sede_id: '1',
    canal: 'WhatsApp'
  });

  const [resultadoIA, setResultadoIA] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const {
    cargando: procesando,
    error: errorAccion,
    exito: exitoAccion,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  const {
    cargando: generandoIA,
    error: errorIA,
    limpiarMensajes: limpiarErrorIA,
    ejecutar: ejecutarIA
  } = useAsyncAction();

  useEffect(() => {
    if (ficha) {
      setFormPref({
        destino: ficha.destino || '',
        presupuesto_total: String(ficha.presupuesto_total ?? ''),
        moneda: ficha.moneda || 'MXN',
        viajeros: String(ficha.viajeros ?? 1),
        fecha_salida: String(ficha.fecha_salida || '').slice(0, 10),
        sede_id: String(ficha.sede_id || 1),
        canal: ficha.canal || 'WhatsApp'
      });
    }
  }, [ficha]);

  if (cargandoFicha && !ficha) {
    return <LoadingState mensaje="Cargando ficha detallada de la oportunidad..." />;
  }

  if (!ficha) return null;

  const sedes = catalogos?.sedes?.length ? catalogos.sedes : SEDES_LISTA;
  const motivos = catalogos?.motivos_perdida?.length
    ? catalogos.motivos_perdida
    : MOTIVOS_PERDIDA_LISTA;

  const permisos = ficha.permisos || {
    puede_avanzar: ficha.estado_comercial !== 'perdida' && Number(ficha.etapa_orden) < 9,
    puede_editar_preferencias: ficha.estado_comercial !== 'perdida',
    puede_generar_mensaje_ia: ficha.estado_comercial !== 'perdida',
    puede_registrar_perdida: ficha.estado_comercial !== 'perdida' && Number(ficha.etapa_orden) < 9,
    puede_reabrir: ficha.estado_comercial === 'perdida'
  };

  const handleGuardarPreferencias = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        await onEditarPreferencias(ficha.id, {
          destino: formPref.destino,
          presupuesto_total: Number(formPref.presupuesto_total),
          moneda: formPref.moneda,
          viajeros: Number(formPref.viajeros),
          fecha_salida: formPref.fecha_salida,
          sede_id: Number(formPref.sede_id),
          canal: formPref.canal
        });
        setEditandoPreferencias(false);
      }, 'Preferencias actualizadas correctamente. La fecha del último avance y la antigüedad de la etapa se conservaron intactas.');
    } catch {
      // Conserva los datos del formulario ante error
    }
  };

  const handleConfirmarAvanceEtapa = async () => {
    try {
      await ejecutar(async () => {
        await onAvanzarEtapa(ficha.id, ficha.siguiente_etapa?.id);
        setMostrarConfirmacionAvance(false);
      }, `La oportunidad avanzó a "${ficha.siguiente_etapa?.nombre}". Recuerde que este cambio solo actualiza el CRM: no confirma pagos ni reservas con proveedores.`);
    } catch {
      // Mostrar error
    }
  };

  const handleConfirmarPerdida = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        await onCambiarEstadoComercial(ficha.id, {
          accion: 'perder',
          estado_comercial: 'perdida',
          motivo_perdida_id: Number(motivoPerdidaId)
        });
        setMostrarModalPerdida(false);
        setEditandoPreferencias(false);
        setMostrarConfirmacionAvance(false);
      }, 'Pérdida registrada con motivo y fecha UTC. Se conservó su etapa e historial y se excluyó de la cola de seguimiento.');
    } catch {
      // Conserva selección
    }
  };

  const handleReabrirOportunidad = async () => {
    try {
      await ejecutar(async () => {
        await onCambiarEstadoComercial(ficha.id, {
          accion: 'reabrir',
          estado_comercial: 'abierta'
        });
      }, 'Oportunidad reabierta con éxito. Se conservó la antigüedad original de la etapa y el historial completo.');
    } catch {
      // Mostrar error
    }
  };

  const handleGenerarMensaje = async () => {
    try {
      await ejecutarIA(async () => {
        const res = await onGenerarMensajeIA(ficha.id);
        setResultadoIA(res);
      });
    } catch {
      // Error manejado por errorIA
    }
  };

  const handleCopiarMensaje = async () => {
    if (!resultadoIA?.mensaje) return;
    try {
      await navigator.clipboard.writeText(resultadoIA.mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de regreso y encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 rounded-xl border border-tinta/20 bg-white px-3.5 py-2 text-xs font-semibold text-tinta shadow-sm hover:bg-marfil-oscuro"
        >
          <ArrowLeft className="h-4 w-4 text-turquesa" aria-hidden="true" />
          <span>Volver al listado de oportunidades</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <EstadoComercialBadge
            estado={ficha.estado_comercial}
            motivo={ficha.motivo_perdida_nombre}
          />
          <SedeBadge nombre={ficha.sede_nombre} />
          <DatoFicticioBadge visible={Boolean(ficha.cliente_es_ficticio)} />
        </div>
      </div>

      {errorAccion ? (
        <AlertBanner
          tipo="error"
          titulo="No se pudo aplicar el cambio"
          mensaje={errorAccion}
          onClose={limpiarMensajes}
        />
      ) : null}

      {exitoAccion ? (
        <AlertBanner
          tipo="exito"
          titulo="Actualización guardada en MySQL"
          mensaje={exitoAccion}
          onClose={limpiarMensajes}
        />
      ) : null}

      {/* Aviso de bloqueo si la oportunidad está perdida */}
      {ficha.estado_comercial === 'perdida' ? (
        <BloqueoPerdidaNotice
          motivo={ficha.motivo_perdida_nombre}
          onReabrir={handleReabrirOportunidad}
          cargando={procesando}
        />
      ) : null}

      {/* Encabezado principal de la ficha */}
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-turquesa">
              Ficha de Oportunidad #{ficha.id} · Canal {ficha.canal}
            </p>
            <h1 className="mt-1 font-editorial text-2xl font-bold text-tinta sm:text-3xl">
              {ficha.destino} — {ficha.cliente_nombre}
            </h1>
            <p className="mt-1 text-xs text-tinta/70">
              Creada: {formatearFechaHoraUTC(ficha.creado_en)} · Último avance de etapa:{' '}
              <strong>{formatearFechaHoraUTC(ficha.ultimo_avance_en)}</strong> ({ficha.dias_sin_avance}{' '}
              días en la etapa actual) · Última edición: {formatearFechaHoraUTC(ficha.editado_en)}
            </p>
          </div>

          {/* Botones de acciones de ciclo de vida */}
          <div className="flex flex-wrap items-center gap-2">
            {permisos.puede_avanzar && ficha.siguiente_etapa ? (
              <button
                type="button"
                onClick={() => {
                  limpiarMensajes();
                  setMostrarConfirmacionAvance(true);
                  setMostrarModalPerdida(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-tinta px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tinta-suave"
              >
                <span>Avanzar a etapa {ficha.siguiente_etapa.orden}</span>
                <ArrowRight className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
              </button>
            ) : null}

            {permisos.puede_editar_preferencias ? (
              <button
                type="button"
                onClick={() => {
                  limpiarMensajes();
                  setEditandoPreferencias((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-tinta/20 bg-marfil px-3.5 py-2.5 text-xs font-semibold text-tinta hover:bg-marfil-oscuro"
              >
                <Edit3 className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                <span>{editandoPreferencias ? 'Cancelar edición' : 'Editar preferencias'}</span>
              </button>
            ) : null}

            {permisos.puede_registrar_perdida ? (
              <button
                type="button"
                onClick={() => {
                  limpiarMensajes();
                  setMostrarModalPerdida((prev) => !prev);
                  setMostrarConfirmacionAvance(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-800/30 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900 hover:bg-red-100"
              >
                <XCircle className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
                <span>Registrar pérdida</span>
              </button>
            ) : null}

            {permisos.puede_reabrir ? (
              <button
                type="button"
                disabled={procesando}
                onClick={handleReabrirOportunidad}
                className="inline-flex items-center gap-1.5 rounded-xl bg-turquesa px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{procesando ? 'Reabriendo...' : 'Reabrir oportunidad'}</span>
              </button>
            ) : null}
          </div>
        </div>

        <BrandRouteDivider
          className="mt-5"
          label={`Etapa ${ficha.etapa_orden} de 9 · ${ficha.etapa_nombre}`}
        />

        {/* Siguiente acción recomendada */}
        <div className="mt-4 rounded-xl border border-turquesa/30 bg-turquesa-claro/45 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-turquesa">
            Siguiente acción recomendada para el agente
          </p>
          <p className="mt-1 text-sm font-medium text-tinta">{ficha.siguiente_accion}</p>
        </div>
      </header>

      {/* Diálogo obligatorio de confirmación antes de avanzar etapa */}
      {mostrarConfirmacionAvance && ficha.siguiente_etapa ? (
        <section
          role="dialog"
          aria-labelledby="titulo-confirmar-avance"
          className="rounded-2xl border-2 border-tinta bg-white p-6 shadow-md"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-coral" aria-hidden="true" />
            <div className="flex-1">
              <h2 id="titulo-confirmar-avance" className="font-editorial text-lg font-bold text-tinta">
                Confirmar avance a la etapa {ficha.siguiente_etapa.orden}: {ficha.siguiente_etapa.nombre}
              </h2>
              <p className="mt-1 text-sm text-tinta/85">
                <strong>¿Qué cambiará?</strong> La oportunidad pasará de la etapa{' '}
                <strong>
                  {ficha.etapa_orden} ({ficha.etapa_nombre})
                </strong>{' '}
                a la etapa{' '}
                <strong>
                  {ficha.siguiente_etapa.orden} ({ficha.siguiente_etapa.nombre})
                </strong>
                , se registrará la fecha exacta en UTC en el historial cronológico y se actualizará la siguiente acción recomendada.
              </p>
              <div className="mt-3 rounded-xl border border-amber-800/30 bg-amber-50 p-3 text-xs font-medium text-amber-950">
                <strong>Aviso importante:</strong> Cambiar una etapa solo actualiza el CRM: no confirma pagos ni reservas con proveedores.
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={handleConfirmarAvanceEtapa}
                  className="rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white hover:bg-tinta-suave disabled:opacity-50"
                >
                  {procesando
                    ? 'Guardando transacción...'
                    : `Confirmar avance a "${ficha.siguiente_etapa.nombre}"`}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacionAvance(false)}
                  className="rounded-xl border border-tinta/20 bg-marfil px-4 py-2 text-xs font-semibold text-tinta hover:bg-marfil-oscuro"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Formulario para registrar pérdida con motivo */}
      {mostrarModalPerdida ? (
        <section
          role="dialog"
          aria-labelledby="titulo-registrar-perdida"
          className="rounded-2xl border-2 border-red-800/40 bg-white p-6 shadow-md"
        >
          <h2 id="titulo-registrar-perdida" className="font-editorial text-lg font-bold text-red-950">
            Registrar pérdida de oportunidad con motivo
          </h2>
          <p className="mt-1 text-xs text-tinta/75">
            Se conservará su etapa actual ({ficha.etapa_nombre}) y todo su historial para los denominadores del embudo. Se excluirá de la cola de seguimiento y se bloquearán ediciones hasta reabrirla.
          </p>

          <form onSubmit={handleConfirmarPerdida} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="select-motivo-perdida" className="block text-xs font-semibold text-tinta">
                Motivo de pérdida obligatorio *
              </label>
              <select
                id="select-motivo-perdida"
                value={motivoPerdidaId}
                onChange={(e) => setMotivoPerdidaId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/60 px-3 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              >
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={procesando}
              className="rounded-xl bg-red-800 px-4 py-2 text-xs font-semibold text-white hover:bg-red-900 disabled:opacity-50"
            >
              {procesando ? 'Registrando pérdida...' : 'Confirmar pérdida'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarModalPerdida(false)}
              className="rounded-xl border border-tinta/20 bg-marfil px-4 py-2 text-xs font-semibold text-tinta hover:bg-marfil-oscuro"
            >
              Cancelar
            </button>
          </form>
        </section>
      ) : null}

      {/* Cuerpo en dos columnas: Preferencias + IA a la izquierda, Historial cronológico a la derecha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Tarjeta de Preferencias del viaje */}
          <section
            aria-labelledby="titulo-preferencias-viaje"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 id="titulo-preferencias-viaje" className="font-editorial text-lg font-bold text-tinta">
                Preferencias del viaje
              </h2>
              <span className="text-xs text-tinta/60">
                Editar preferencias no reinicia la fecha del último avance
              </span>
            </div>

            {editandoPreferencias && permisos.puede_editar_preferencias ? (
              <form
                onSubmit={handleGuardarPreferencias}
                className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                noValidate
              >
                <div>
                  <label htmlFor="pref-destino" className="block text-xs font-semibold text-tinta">
                    Destino *
                  </label>
                  <input
                    id="pref-destino"
                    type="text"
                    required
                    value={formPref.destino}
                    onChange={(e) => setFormPref((p) => ({ ...p, destino: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  />
                </div>

                <div>
                  <label htmlFor="pref-sede" className="block text-xs font-semibold text-tinta">
                    Sede *
                  </label>
                  <select
                    id="pref-sede"
                    value={formPref.sede_id}
                    onChange={(e) => setFormPref((p) => ({ ...p, sede_id: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-presupuesto" className="block text-xs font-semibold text-tinta">
                    Presupuesto total (&gt; 0) *
                  </label>
                  <input
                    id="pref-presupuesto"
                    type="number"
                    step="0.01"
                    required
                    value={formPref.presupuesto_total}
                    onChange={(e) => setFormPref((p) => ({ ...p, presupuesto_total: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  />
                </div>

                <div>
                  <label htmlFor="pref-moneda" className="block text-xs font-semibold text-tinta">
                    Moneda *
                  </label>
                  <select
                    id="pref-moneda"
                    value={formPref.moneda}
                    onChange={(e) => setFormPref((p) => ({ ...p, moneda: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  >
                    {MONEDAS_LISTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-viajeros" className="block text-xs font-semibold text-tinta">
                    Número de viajeros (1 a 50) *
                  </label>
                  <input
                    id="pref-viajeros"
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={formPref.viajeros}
                    onChange={(e) => setFormPref((p) => ({ ...p, viajeros: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  />
                </div>

                <div>
                  <label htmlFor="pref-fecha" className="block text-xs font-semibold text-tinta">
                    Fecha deseada de salida *
                  </label>
                  <input
                    id="pref-fecha"
                    type="date"
                    required
                    value={formPref.fecha_salida}
                    onChange={(e) => setFormPref((p) => ({ ...p, fecha_salida: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  />
                </div>

                <div>
                  <label htmlFor="pref-canal" className="block text-xs font-semibold text-tinta">
                    Canal *
                  </label>
                  <select
                    id="pref-canal"
                    value={formPref.canal}
                    onChange={(e) => setFormPref((p) => ({ ...p, canal: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta"
                  >
                    {CANALES_LISTA.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={procesando}
                    className="rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white hover:bg-tinta-suave disabled:opacity-50"
                  >
                    {procesando ? 'Guardando...' : 'Guardar preferencias'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoPreferencias(false)}
                    className="rounded-xl border border-tinta/20 bg-marfil px-4 py-2 text-xs font-semibold text-tinta"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-tinta/65">
                    <Plane className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                    <span>Destino deseado</span>
                  </dt>
                  <dd className="mt-1 font-editorial text-lg font-bold text-tinta">
                    {ficha.destino}
                  </dd>
                </div>

                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="text-xs font-semibold text-tinta/65">
                    Presupuesto y moneda (declarado)
                  </dt>
                  <dd className="mt-1 font-editorial text-lg font-bold text-tinta">
                    {formatearPresupuesto(ficha.presupuesto_total, ficha.moneda)}
                  </dd>
                </div>

                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-tinta/65">
                    <Users className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                    <span>Número de viajeros</span>
                  </dt>
                  <dd className="mt-1 font-editorial text-lg font-bold text-tinta">
                    {ficha.viajeros} {ficha.viajeros === 1 ? 'viajero' : 'viajeros'}
                  </dd>
                </div>

                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-tinta/65">
                    <Calendar className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
                    <span>Fecha deseada de salida</span>
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-tinta">
                    {formatearFechaCorta(ficha.fecha_salida)}
                  </dd>
                </div>

                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="text-xs font-semibold text-tinta/65">Sede y canal</dt>
                  <dd className="mt-1 text-sm font-bold text-tinta">
                    {ficha.sede_nombre} · {ficha.canal}
                  </dd>
                </div>

                <div className="rounded-xl border border-tinta/10 bg-marfil/60 p-3.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-tinta/65">
                    <Clock className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                    <span>Antigüedad en etapa</span>
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-tinta">
                    {ficha.dias_sin_avance} {ficha.dias_sin_avance === 1 ? 'día' : 'días'}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* Tarjeta de Redacción de mensaje con IA (Claude desde Express) */}
          <section
            aria-labelledby="titulo-mensaje-ia"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-2.5 py-0.5 text-xs font-semibold text-turquesa">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Asistente IA (DeepSeek) · Privacidad por diseño</span>
                </span>
                <h2 id="titulo-mensaje-ia" className="mt-1.5 font-editorial text-lg font-bold text-tinta">
                  Preparar mensaje de seguimiento con IA
                </h2>
                <p className="mt-0.5 text-xs text-tinta/70">
                  Express envía a DeepSeek únicamente: etapa, sede, siguiente acción, destino, presupuesto/moneda, número de viajeros y fecha preferida. <strong>No se envían nombres ni contactos</strong>. Máximo 100 palabras.
                </p>
              </div>

              <button
                type="button"
                disabled={!permisos.puede_generar_mensaje_ia || generandoIA}
                onClick={handleGenerarMensaje}
                className="inline-flex items-center gap-2 rounded-xl bg-turquesa px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-45"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>
                  {generandoIA ? 'Solicitando a Claude...' : 'Preparar mensaje con IA'}
                </span>
              </button>
            </div>

            {errorIA ? (
              <div className="mt-4">
                <AlertBanner
                  tipo="aviso"
                  titulo="Aviso del servicio de IA (Claude en Express)"
                  mensaje={errorIA}
                  onClose={limpiarErrorIA}
                />
              </div>
            ) : null}

            {resultadoIA ? (
              <div className="mt-4 space-y-3 rounded-xl border border-turquesa/35 bg-marfil/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/35 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
                    <span>Estado: {resultadoIA.estado_aprobacion}</span>
                  </span>
                  <span className="text-xs text-tinta/70">
                    {resultadoIA.palabras} / 100 palabras · Modelo: {resultadoIA.modelo}
                  </span>
                </div>

                <p className="whitespace-pre-line rounded-xl border border-tinta/15 bg-white p-3.5 text-sm leading-relaxed text-tinta">
                  {resultadoIA.mensaje}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-tinta/70">{resultadoIA.aviso}</p>
                  <button
                    type="button"
                    onClick={handleCopiarMensaje}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Copiado al portapapeles</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copiar borrador</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* Columna derecha: Historial cronológico completo (etapas + pérdidas + reaperturas) */}
        <section
          aria-labelledby="titulo-historial-cronologico"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm lg:col-span-5"
        >
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-turquesa" aria-hidden="true" />
            <h2 id="titulo-historial-cronologico" className="font-editorial text-lg font-bold text-tinta">
              Historial cronológico (UTC)
            </h2>
          </div>
          <p className="mt-1 text-xs text-tinta/70">
            Registro auditable de todas las etapas alcanzadas, pérdidas con motivo y reaperturas.
          </p>

          <ol className="relative mt-5 border-l-2 border-turquesa/35 ml-3 space-y-5">
            {(ficha.cronologia || []).map((item) => {
              const esPerdida = item.tipo_registro === 'perdida';
              const esReapertura = item.tipo_registro === 'reapertura';

              return (
                <li key={item.id} className="ml-5">
                  <span
                    className={`absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                      esPerdida
                        ? 'bg-red-700 text-white'
                        : esReapertura
                        ? 'bg-coral text-white'
                        : 'bg-turquesa text-white'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </span>

                  <div
                    className={`rounded-xl border p-3 ${
                      esPerdida
                        ? 'border-red-800/30 bg-red-50/70'
                        : esReapertura
                        ? 'border-coral/50 bg-coral-claro/50'
                        : 'border-tinta/15 bg-marfil/60'
                    }`}
                  >
                    <p className="text-xs font-bold text-tinta">{item.descripcion}</p>
                    <p className="mt-1 text-[11px] font-medium text-tinta/70">
                      Fecha registrada: {formatearFechaHoraUTC(item.fecha)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
