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
  History,
  MessageSquarePlus,
  Phone,
  Mail,
  CheckCircle2,
  Printer,
  ListChecks
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

const CHECKLIST_POR_ETAPA = {
  1: [
    'Confirmar nombre del viajero y canal de entrada',
    'Acordar llamada o contacto inicial para levantar preferencias',
    'Verificar sede de atención asignada (Desamparados o Puntarenas)'
  ],
  2: [
    'Validar destino, presupuesto total declarado y moneda',
    'Confirmar cantidad exacta de viajeros y edades',
    'Registrar fecha deseada de salida y flexibilidad'
  ],
  3: [
    'Diseñar itinerario boutique con al menos 2 opciones de hospedaje',
    'Verificar que el presupuesto esté dentro del rango declarado',
    'Enviar propuesta formal y registrar acuse de envío'
  ],
  4: [
    'Confirmar que el viajero recibió y abrió la cotización',
    'Resolver dudas de itinerario, vuelos o categoría de hotel',
    'Apoyarse en el borrador con IA para destrabar la decisión'
  ],
  5: [
    'Confirmar por escrito la opción de propuesta seleccionada',
    'Verificar nombres completos de los viajeros según identificación',
    'Compartir instrucciones claras para recepción del anticipo'
  ],
  6: [
    'Verificar acreditación del anticipo en administración',
    'Bloquear espacios aéreos y terrestres con operadores',
    'Preparar vouchers y códigos de confirmación'
  ],
  7: [
    'Entregar confirmación formal de reserva y vouchers al viajero',
    'Compartir recomendaciones locales del destino y teléfonos de asistencia',
    'Programar recordatorio previo a la fecha de salida'
  ],
  8: [
    'Monitorear que los traslados y vuelos de ida hayan operado en orden',
    'Mantener canal de atención disponible durante la estancia',
    'Preparar contacto de bienvenida al regreso'
  ],
  9: [
    'Conocer nivel de satisfacción del viajero y aprendizajes del itinerario',
    'Agradecer la confianza y solicitar referidos o testimonio',
    'Documentar intereses para su próximo viaje'
  ]
};

export function FichaOportunidadView({
  ficha,
  catalogos,
  cargandoFicha,
  onVolver,
  onEditarPreferencias,
  onAvanzarEtapa,
  onCambiarEstadoComercial,
  onGenerarMensajeIA,
  onAgregarNota
}) {
  const [editandoPreferencias, setEditandoPreferencias] = useState(false);
  const [mostrarConfirmacionAvance, setMostrarConfirmacionAvance] = useState(false);
  const [mostrarModalPerdida, setMostrarModalPerdida] = useState(false);
  const [motivoPerdidaId, setMotivoPerdidaId] = useState('1');

  const [formPref, setFormPref] = useState({
    destino: '',
    presupuesto_total: '',
    moneda: 'CRC',
    viajeros: '1',
    fecha_salida: '',
    sede_id: '1',
    canal: 'WhatsApp'
  });

  // Selector de tono y edición manual del borrador de IA antes de aprobar/copiar
  const [tonoIA, setTonoIA] = useState('cálido y consultivo');
  const [resultadoIA, setResultadoIA] = useState(null);
  const [mensajeEditableIA, setMensajeEditableIA] = useState('');
  const [aprobadoPorAgente, setAprobadoPorAgente] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Bitácora de notas del agente y checklist operativa por etapa
  const [textoNota, setTextoNota] = useState('');
  const [itemsChecklistMarcados, setItemsChecklistMarcados] = useState({});

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

  const presupuestoPorViajero =
    Number(ficha.viajeros) > 0
      ? Number(ficha.presupuesto_total) / Number(ficha.viajeros)
      : Number(ficha.presupuesto_total);

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
        const res = await onGenerarMensajeIA(ficha.id, tonoIA);
        setResultadoIA(res);
        setMensajeEditableIA(res.mensaje || '');
        setAprobadoPorAgente(false);
      });
    } catch {
      // Error manejado por errorIA
    }
  };

  const handleCopiarMensaje = async () => {
    const textoFinal = mensajeEditableIA || resultadoIA?.mensaje;
    if (!textoFinal) return;
    try {
      await navigator.clipboard.writeText(textoFinal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  const handleAgregarNotaSubmit = async (e) => {
    e.preventDefault();
    if (!onAgregarNota) return;
    try {
      await ejecutar(async () => {
        await onAgregarNota(ficha.id, {
          texto: textoNota,
          autor: 'Asesor Ruta Clara'
        });
        setTextoNota('');
      }, 'Nota comercial guardada en la bitácora de la oportunidad.');
    } catch {
      // Conserva textoNota si falla
    }
  };

  const palabrasEditables = mensajeEditableIA
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="space-y-6">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 rounded-xl border border-tinta/20 bg-white px-3 py-1.5 text-xs font-semibold text-tinta shadow-sm hover:bg-marfil-oscuro"
          >
            <Printer className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
            <span>Imprimir / PDF</span>
          </button>
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

      {ficha.estado_comercial === 'perdida' ? (
        <BloqueoPerdidaNotice
          motivo={ficha.motivo_perdida_nombre}
          onReabrir={handleReabrirOportunidad}
          cargando={procesando}
        />
      ) : null}

      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-turquesa">
              Ficha de Oportunidad #{ficha.id} · Canal {ficha.canal}
            </p>
            <h1 className="mt-1 font-editorial text-2xl font-bold text-tinta sm:text-3xl">
              {ficha.destino} — {ficha.cliente_nombre}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-tinta/75">
              {ficha.cliente_telefono ? (
                <span className="inline-flex items-center gap-1 rounded bg-marfil px-2 py-0.5 font-medium">
                  <Phone className="h-3 w-3 text-turquesa" aria-hidden="true" />
                  <span>{ficha.cliente_telefono}</span>
                </span>
              ) : null}
              {ficha.cliente_correo ? (
                <span className="inline-flex items-center gap-1 rounded bg-marfil px-2 py-0.5 font-medium">
                  <Mail className="h-3 w-3 text-coral" aria-hidden="true" />
                  <span>{ficha.cliente_correo}</span>
                </span>
              ) : null}
              <span>
                Último avance: <strong>{formatearFechaHoraUTC(ficha.ultimo_avance_en)}</strong> (
                {ficha.dias_sin_avance} d en etapa)
              </span>
            </div>
          </div>

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

        {/* Barra visual de progreso de las 9 etapas */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-tinta/70">
            <span>Progreso del recorrido: Etapa {ficha.etapa_orden} de 9</span>
            <span>{ficha.etapa_nombre}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-9 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((paso) => {
              const alcanzado = paso <= Number(ficha.etapa_orden);
              const esActual = paso === Number(ficha.etapa_orden);
              return (
                <div
                  key={paso}
                  className={`h-2 rounded-full transition-all ${
                    esActual
                      ? 'bg-coral ring-2 ring-coral/40'
                      : alcanzado
                      ? 'bg-turquesa'
                      : 'bg-marfil-oscuro'
                  }`}
                  title={`Etapa ${paso}`}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-turquesa/30 bg-turquesa-claro/45 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-turquesa">
            Siguiente acción recomendada para el agente
          </p>
          <p className="mt-1 text-sm font-medium text-tinta">{ficha.siguiente_accion}</p>
        </div>
      </header>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Preferencias del viaje + cálculo por viajero */}
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
                        {m === 'CRC' ? 'CRC (₡ Colón costarricense)' : 'USD ($ Dólar)'}
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
                    Presupuesto total (declarado)
                  </dt>
                  <dd className="mt-1 font-editorial text-lg font-bold text-tinta">
                    {formatearPresupuesto(ficha.presupuesto_total, ficha.moneda)}
                  </dd>
                  <dd className="mt-0.5 text-[11px] text-turquesa font-medium">
                    ≈ {formatearPresupuesto(presupuestoPorViajero, ficha.moneda)} por viajero
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

          {/* Redacción con IA (DeepSeek) con selector de tono y edición previa a aprobación */}
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
                  Express envía únicamente: etapa, sede, siguiente acción, destino, presupuesto/moneda, número de viajeros y fecha preferida. <strong>No se envían nombres ni contactos</strong>. Máximo 100 palabras.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="select-tono-ia" className="block text-xs font-semibold text-tinta">
                  Estilo / tono del borrador
                </label>
                <select
                  id="select-tono-ia"
                  disabled={!permisos.puede_generar_mensaje_ia || generandoIA}
                  value={tonoIA}
                  onChange={(e) => setTonoIA(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/60 px-3 py-2 text-xs font-medium text-tinta"
                >
                  <option value="cálido y consultivo">Cálido y consultivo (Boutique)</option>
                  <option value="ejecutivo y directo">Ejecutivo y directo</option>
                  <option value="breve de recordatorio amable">Breve de recordatorio amable</option>
                </select>
              </div>

              <button
                type="button"
                disabled={!permisos.puede_generar_mensaje_ia || generandoIA}
                onClick={handleGenerarMensaje}
                className="inline-flex items-center gap-2 rounded-xl bg-turquesa px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-45"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>
                  {generandoIA ? 'Solicitando a DeepSeek...' : 'Preparar mensaje con IA'}
                </span>
              </button>
            </div>

            {errorIA ? (
              <div className="mt-4">
                <AlertBanner
                  tipo="aviso"
                  titulo="Aviso del servicio de IA (Express)"
                  mensaje={errorIA}
                  onClose={limpiarErrorIA}
                />
              </div>
            ) : null}

            {resultadoIA ? (
              <div className="mt-4 space-y-3 rounded-xl border border-turquesa/35 bg-marfil/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      aprobadoPorAgente
                        ? 'border-emerald-800/35 bg-emerald-100 text-emerald-950'
                        : 'border-amber-800/35 bg-amber-100 text-amber-950'
                    }`}
                  >
                    {aprobadoPorAgente ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Revisado y aprobado por el agente</span>
                      </>
                    ) : (
                      <span>Estado: {resultadoIA.estado_aprobacion}</span>
                    )}
                  </span>
                  <span className="text-xs text-tinta/70">
                    {palabrasEditables} / 100 palabras · {resultadoIA.proveedor || 'DeepSeek'} ({resultadoIA.modelo})
                  </span>
                </div>

                <div>
                  <label htmlFor="textarea-borrador-ia" className="block text-[11px] font-semibold text-tinta/75">
                    Puede ajustar el borrador antes de aprobarlo y copiarlo:
                  </label>
                  <textarea
                    id="textarea-borrador-ia"
                    rows={4}
                    value={mensajeEditableIA}
                    onChange={(e) => {
                      setMensajeEditableIA(e.target.value);
                      setAprobadoPorAgente(false);
                    }}
                    className="mt-1 w-full rounded-xl border border-tinta/20 bg-white p-3 text-sm leading-relaxed text-tinta focus:border-turquesa"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-tinta/70">{resultadoIA.aviso}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAprobadoPorAgente((prev) => !prev)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        aprobadoPorAgente
                          ? 'border border-tinta/20 bg-white text-tinta'
                          : 'bg-emerald-800 text-white hover:bg-emerald-900'
                      }`}
                    >
                      {aprobadoPorAgente ? 'Marcar como pendiente' : 'Aprobar borrador'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopiarMensaje}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                    >
                      {copiado ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Bitácora de Notas del Agente */}
          <section
            aria-labelledby="titulo-bitacora-notas"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-turquesa" aria-hidden="true" />
              <h2 id="titulo-bitacora-notas" className="font-editorial text-lg font-bold text-tinta">
                Bitácora de notas y observaciones del asesor
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-tinta/70">
              Registre acuerdos, preferencias de hospedaje u horarios de llamada. Agregar una nota no modifica la etapa ni reinicia la antigüedad del último avance.
            </p>

            <form onSubmit={handleAgregarNotaSubmit} className="mt-3 flex flex-wrap gap-2">
              <label htmlFor="input-nueva-nota" className="sr-only">
                Escribir nota comercial
              </label>
              <input
                id="input-nueva-nota"
                type="text"
                required
                minLength={2}
                maxLength={600}
                value={textoNota}
                onChange={(e) => setTextoNota(e.target.value)}
                placeholder="Ej. Prefiere vuelos directos y hotel céntrico con desayuno..."
                className="flex-1 min-w-[220px] rounded-xl border border-tinta/25 bg-marfil/60 px-3.5 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
              />
              <button
                type="submit"
                disabled={procesando}
                className="rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white hover:bg-tinta-suave disabled:opacity-50"
              >
                Guardar nota
              </button>
            </form>

            <div className="mt-4 space-y-2.5">
              {(ficha.notas_agente || []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-tinta/15 bg-marfil/40 p-3 text-xs text-tinta/65">
                  No hay notas registradas aún en esta oportunidad.
                </p>
              ) : (
                (ficha.notas_agente || []).map((nota) => (
                  <article
                    key={nota.id}
                    className="rounded-xl border border-tinta/10 bg-marfil/60 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-tinta/65">
                      <span className="font-bold text-turquesa">{nota.autor}</span>
                      <span>{formatearFechaHoraUTC(nota.fecha)}</span>
                    </div>
                    <p className="mt-1 text-tinta leading-relaxed">{nota.texto}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Columna derecha: Checklist de etapa + Historial cronológico completo */}
        <div className="space-y-6 lg:col-span-5">
          <section
            aria-labelledby="titulo-checklist-etapa"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-turquesa" aria-hidden="true" />
              <h2 id="titulo-checklist-etapa" className="font-editorial text-lg font-bold text-tinta">
                Lista de verificación · Etapa {ficha.etapa_orden}
              </h2>
            </div>
            <p className="mt-1 text-xs text-tinta/70">
              Guía operativa recomendada para <strong>{ficha.etapa_nombre}</strong> antes de avanzar a la siguiente etapa.
            </p>

            <ul className="mt-4 space-y-2.5">
              {(CHECKLIST_POR_ETAPA[Number(ficha.etapa_orden)] || CHECKLIST_POR_ETAPA[1]).map(
                (tarea, idx) => {
                  const clave = `${ficha.id}-${ficha.etapa_orden}-${idx}`;
                  const marcado = Boolean(itemsChecklistMarcados[clave]);
                  return (
                    <li key={clave}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-tinta/10 bg-marfil/60 p-3 text-xs transition hover:border-turquesa">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() =>
                            setItemsChecklistMarcados((prev) => ({
                              ...prev,
                              [clave]: !prev[clave]
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-tinta/30 accent-turquesa"
                        />
                        <span
                          className={
                            marcado ? 'line-through text-tinta/50 font-medium' : 'text-tinta font-medium'
                          }
                        >
                          {tarea}
                        </span>
                      </label>
                    </li>
                  );
                }
              )}
            </ul>
          </section>

          <section
            aria-labelledby="titulo-historial-cronologico"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
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
    </div>
  );
}
