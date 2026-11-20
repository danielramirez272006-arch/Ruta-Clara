import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  RotateCcw,
  LayoutGrid,
  Table,
  PlusCircle,
  ArrowRight,
  Plane,
  Users,
  Calendar
} from 'lucide-react';
import {
  BrandRouteDivider,
  EstadoComercialBadge,
  SedeBadge,
  DatoFicticioBadge,
  AlertBanner,
  LoadingState,
  EmptyState
} from '../../components/ui/BrandComponents.jsx';
import {
  formatearPresupuesto,
  formatearFechaCorta,
  CANALES_LISTA,
  MONEDAS_LISTA,
  ETAPAS_LISTA,
  SEDES_LISTA
} from '../../utils/formatters.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function OportunidadesView({
  oportunidades,
  catalogos,
  clientes,
  cargando,
  clientePreseleccionado,
  onLimpiarPreseleccionCliente,
  onCrearOportunidad,
  onAbrirOportunidad
}) {
  const [vista, setVista] = useState('kanban'); // 'kanban' | 'tabla'
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Estado del formulario de creación (se abre automáticamente si viene un cliente preseleccionado)
  const [mostrarFormCrear, setMostrarFormCrear] = useState(Boolean(clientePreseleccionado));
  const [modoCliente, setModoCliente] = useState('existente'); // 'existente' | 'nuevo'
  const [formCrear, setFormCrear] = useState({
    cliente_id: clientePreseleccionado ? String(clientePreseleccionado.id) : '',
    cliente_nombre: '',
    destino: 'Oaxaca',
    sede_id: '1',
    canal: 'WhatsApp',
    presupuesto_total: '45000',
    moneda: 'MXN',
    viajeros: '2',
    fecha_salida: '2027-02-15'
  });

  // Sincronizar cuando se solicita crear oportunidad desde la pantalla de Clientes
  React.useEffect(() => {
    if (clientePreseleccionado) {
      setMostrarFormCrear(true);
      setModoCliente('existente');
      setFormCrear((prev) => ({
        ...prev,
        cliente_id: String(clientePreseleccionado.id)
      }));
    }
  }, [clientePreseleccionado]);

  const {
    cargando: creando,
    error: errorCrear,
    exito: exitoCrear,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  const sedes = catalogos?.sedes?.length ? catalogos.sedes : SEDES_LISTA;
  const etapas = catalogos?.etapas?.length ? catalogos.etapas : ETAPAS_LISTA;

  const oportunidadesFiltradas = useMemo(() => {
    return (oportunidades || []).filter((op) => {
      if (filtroSede && Number(op.sede_id) !== Number(filtroSede)) return false;
      if (filtroCanal && op.canal !== filtroCanal) return false;
      if (filtroEtapa && Number(op.etapa_id) !== Number(filtroEtapa)) return false;
      if (filtroEstado && op.estado_comercial !== filtroEstado) return false;

      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const coincideCliente = String(op.cliente_nombre || '').toLowerCase().includes(q);
        const coincideDestino = String(op.destino || '').toLowerCase().includes(q);
        if (!coincideCliente && !coincideDestino) return false;
      }

      return true;
    });
  }, [oportunidades, filtroSede, filtroCanal, filtroEtapa, filtroEstado, busqueda]);

  const hayFiltrosActivos = Boolean(
    busqueda.trim() || filtroSede || filtroCanal || filtroEtapa || filtroEstado
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroSede('');
    setFiltroCanal('');
    setFiltroEtapa('');
    setFiltroEstado('');
  };

  const handleCambioForm = (campo, valor) => {
    setFormCrear((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleCrearSubmit = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        const payload = {
          destino: formCrear.destino,
          sede_id: Number(formCrear.sede_id),
          canal: formCrear.canal,
          presupuesto_total: Number(formCrear.presupuesto_total),
          moneda: formCrear.moneda,
          viajeros: Number(formCrear.viajeros),
          fecha_salida: formCrear.fecha_salida
        };

        if (modoCliente === 'existente') {
          payload.cliente_id = Number(formCrear.cliente_id);
        } else {
          payload.cliente_nombre = formCrear.cliente_nombre;
          payload.es_ficticio = 1;
        }

        const creada = await onCrearOportunidad(payload);

        // Si tuvo éxito, limpiamos solo campos de texto y cerramos preselección
        setFormCrear((prev) => ({
          ...prev,
          cliente_nombre: '',
          destino: ''
        }));
        if (onLimpiarPreseleccionCliente) {
          onLimpiarPreseleccionCliente();
        }
        return creada;
      }, 'Oportunidad creada en la etapa 1 ("Consulta recibida") con su registro inicial en el historial.');
    } catch {
      // Si falla la validación (ej. presupuesto negativo o viajeros fuera de rango), el formulario conserva los datos
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Gestión del Embudo</span>
              </span>
              <DatoFicticioBadge />
            </div>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Oportunidades de viaje (9 etapas)
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Consulte el tablero Kanban o la vista de tabla. Nota: los presupuestos declarados están en MXN, USD o EUR y nunca se suman entre monedas distintas ni se presentan como ingresos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label="Cambiar vista de oportunidades"
              className="inline-flex rounded-xl border border-tinta/20 bg-marfil p-1"
            >
              <button
                type="button"
                onClick={() => setVista('kanban')}
                aria-pressed={vista === 'kanban'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  vista === 'kanban'
                    ? 'bg-tinta text-white shadow-sm'
                    : 'text-tinta hover:bg-marfil-oscuro'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tablero Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setVista('tabla')}
                aria-pressed={vista === 'tabla'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  vista === 'tabla'
                    ? 'bg-tinta text-white shadow-sm'
                    : 'text-tinta hover:bg-marfil-oscuro'
                }`}
              >
                <Table className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Vista de Tabla</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                limpiarMensajes();
                setMostrarFormCrear((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-turquesa px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{mostrarFormCrear ? 'Ocultar formulario' : 'Nueva oportunidad'}</span>
            </button>
          </div>
        </div>
        <BrandRouteDivider className="mt-4" label="9 etapas del recorrido comercial" />
      </header>

      {errorCrear ? (
        <AlertBanner
          tipo="error"
          titulo="Error de validación al crear la oportunidad"
          mensaje={errorCrear}
          onClose={limpiarMensajes}
        />
      ) : null}

      {exitoCrear ? (
        <AlertBanner
          tipo="exito"
          titulo="Oportunidad registrada"
          mensaje={exitoCrear}
          onClose={limpiarMensajes}
        />
      ) : null}

      {/* Formulario para crear oportunidad (cliente existente o nuevo) */}
      {mostrarFormCrear ? (
        <section
          aria-labelledby="titulo-form-nueva-oportunidad"
          className="rounded-2xl border-2 border-turquesa/40 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="titulo-form-nueva-oportunidad" className="font-editorial text-lg font-bold text-tinta">
                Registrar nueva oportunidad de viaje
              </h2>
              <p className="text-xs text-tinta/70">
                Se iniciará en la etapa 1 (&ldquo;Consulta recibida&rdquo;). Puede asignarla a un cliente existente o crear uno nuevo.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-tinta/20 bg-marfil p-1">
              <button
                type="button"
                onClick={() => setModoCliente('existente')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  modoCliente === 'existente' ? 'bg-tinta text-white' : 'text-tinta'
                }`}
              >
                Cliente existente
              </button>
              <button
                type="button"
                onClick={() => setModoCliente('nuevo')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  modoCliente === 'nuevo' ? 'bg-tinta text-white' : 'text-tinta'
                }`}
              >
                Cliente nuevo
              </button>
            </div>
          </div>

          <form onSubmit={handleCrearSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
            {modoCliente === 'existente' ? (
              <div className="sm:col-span-2">
                <label htmlFor="select-cliente-existente" className="block text-xs font-semibold text-tinta">
                  Seleccionar cliente existente *
                </label>
                <select
                  id="select-cliente-existente"
                  required
                  value={formCrear.cliente_id}
                  onChange={(e) => handleCambioForm('cliente_id', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
                >
                  <option value="">— Seleccione un viajero —</option>
                  {(clientes || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} · {c.nombre} ({c.total_oportunidades || 0} viajes)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="input-cliente-nuevo-op" className="block text-xs font-semibold text-tinta">
                  Nombre del nuevo cliente ficticio *
                </label>
                <input
                  id="input-cliente-nuevo-op"
                  type="text"
                  required
                  value={formCrear.cliente_nombre}
                  onChange={(e) => handleCambioForm('cliente_nombre', e.target.value)}
                  placeholder="Ej. Rodrigo Solano Vega (Ficticio)"
                  className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
                />
              </div>
            )}

            <div>
              <label htmlFor="input-destino-op" className="block text-xs font-semibold text-tinta">
                Destino deseado *
              </label>
              <input
                id="input-destino-op"
                type="text"
                required
                value={formCrear.destino}
                onChange={(e) => handleCambioForm('destino', e.target.value)}
                placeholder="Cancún, Oaxaca, Madrid, Bogotá..."
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="select-sede-op" className="block text-xs font-semibold text-tinta">
                Sede de atención *
              </label>
              <select
                id="select-sede-op"
                value={formCrear.sede_id}
                onChange={(e) => handleCambioForm('sede_id', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              >
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="input-presupuesto-op" className="block text-xs font-semibold text-tinta">
                Presupuesto total (&gt; 0) *
              </label>
              <input
                id="input-presupuesto-op"
                type="number"
                step="0.01"
                required
                value={formCrear.presupuesto_total}
                onChange={(e) => handleCambioForm('presupuesto_total', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="select-moneda-op" className="block text-xs font-semibold text-tinta">
                Moneda *
              </label>
              <select
                id="select-moneda-op"
                value={formCrear.moneda}
                onChange={(e) => handleCambioForm('moneda', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              >
                {MONEDAS_LISTA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="input-viajeros-op" className="block text-xs font-semibold text-tinta">
                Número de viajeros (1 a 50) *
              </label>
              <input
                id="input-viajeros-op"
                type="number"
                min={1}
                max={50}
                required
                value={formCrear.viajeros}
                onChange={(e) => handleCambioForm('viajeros', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="input-fecha-salida-op" className="block text-xs font-semibold text-tinta">
                Fecha deseada de salida *
              </label>
              <input
                id="input-fecha-salida-op"
                type="date"
                required
                value={formCrear.fecha_salida}
                onChange={(e) => handleCambioForm('fecha_salida', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="select-canal-op" className="block text-xs font-semibold text-tinta">
                Canal de contacto *
              </label>
              <select
                id="select-canal-op"
                value={formCrear.canal}
                onChange={(e) => handleCambioForm('canal', e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-sm text-tinta focus:border-turquesa focus:bg-white"
              >
                {CANALES_LISTA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={creando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-tinta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tinta-suave disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4 text-coral" aria-hidden="true" />
                <span>{creando ? 'Registrando oportunidad...' : 'Guardar oportunidad'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormCrear(false);
                  if (onLimpiarPreseleccionCliente) onLimpiarPreseleccionCliente();
                }}
                className="rounded-xl border border-tinta/20 bg-marfil px-4 py-2.5 text-sm font-semibold text-tinta hover:bg-marfil-oscuro"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Barra de búsqueda y 4 filtros obligatorios + botón limpiar */}
      <section
        aria-label="Filtros y búsqueda de oportunidades"
        className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="input-buscar-oportunidad" className="block text-xs font-semibold text-tinta">
              Buscar por cliente o destino
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-tinta/45"
                aria-hidden="true"
              />
              <input
                id="input-buscar-oportunidad"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. Valeria, Cancún, Oaxaca, Madrid..."
                className="w-full rounded-xl border border-tinta/25 bg-marfil/50 pl-9 pr-3 py-2 text-xs text-tinta placeholder:text-tinta/45 focus:border-turquesa focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filtro-sede" className="block text-xs font-semibold text-tinta">
              Sede
            </label>
            <select
              id="filtro-sede"
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-2.5 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-canal" className="block text-xs font-semibold text-tinta">
              Canal
            </label>
            <select
              id="filtro-canal"
              value={filtroCanal}
              onChange={(e) => setFiltroCanal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-2.5 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
            >
              <option value="">Todos los canales</option>
              {CANALES_LISTA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-etapa" className="block text-xs font-semibold text-tinta">
              Etapa
            </label>
            <select
              id="filtro-etapa"
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-2.5 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
            >
              <option value="">Las 9 etapas</option>
              {etapas.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.orden}. {et.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-estado" className="block text-xs font-semibold text-tinta">
              Estado comercial
            </label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-2.5 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="abierta">Abierta</option>
              <option value="perdida">Perdida</option>
              <option value="cerrada">Ciclo cerrado</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-tinta/10 pt-3 text-xs text-tinta/75">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
            <span>
              Mostrando <strong>{oportunidadesFiltradas.length}</strong> de{' '}
              <strong>{(oportunidades || []).length}</strong> oportunidades
            </span>
          </div>
          <button
            type="button"
            disabled={!hayFiltrosActivos}
            onClick={limpiarFiltros}
            className="inline-flex items-center gap-1.5 rounded-lg border border-tinta/20 bg-marfil px-3 py-1.5 text-xs font-semibold text-tinta transition hover:bg-marfil-oscuro disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </section>

      {/* Contenido principal: Tablero Kanban de 9 etapas o Vista de Tabla */}
      {cargando ? (
        <LoadingState mensaje="Cargando oportunidades del embudo..." />
      ) : oportunidadesFiltradas.length === 0 ? (
        <EmptyState
          titulo="No hay oportunidades con los filtros seleccionados"
          descripcion="Limpie los filtros activos o cree una nueva oportunidad de viaje."
          accion={
            hayFiltrosActivos ? (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white"
              >
                Restablecer filtros
              </button>
            ) : null
          }
        />
      ) : vista === 'kanban' ? (
        <section aria-label="Tablero Kanban de 9 etapas" className="overflow-x-auto pb-4">
          <div className="grid min-w-[2350px] grid-cols-9 gap-3.5">
            {etapas.map((etapa) => {
              const itemsEtapa = oportunidadesFiltradas.filter(
                (o) => Number(o.etapa_id) === Number(etapa.id)
              );
              const esSeguimientoCotizacion = Number(etapa.orden) === 4;

              return (
                <div
                  key={etapa.id}
                  className={`flex flex-col rounded-2xl border p-3.5 ${
                    esSeguimientoCotizacion
                      ? 'border-coral/60 bg-coral-claro/40'
                      : 'border-tinta/15 bg-white/90'
                  }`}
                >
                  <div className="border-b border-tinta/10 pb-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tinta text-[11px] font-bold text-white">
                          {etapa.orden}
                        </span>
                        <h3 className="font-editorial text-sm font-bold text-tinta">
                          {etapa.nombre}
                        </h3>
                      </span>
                      <span className="rounded-full bg-marfil-oscuro px-2 py-0.5 text-xs font-bold text-tinta">
                        {itemsEtapa.length}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-tinta/65">
                      {etapa.meta_conversion !== null
                        ? `Meta transición: ${Number(etapa.meta_conversion)}%`
                        : 'Etapa final posviaje'}
                    </p>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {itemsEtapa.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-tinta/15 p-4 text-center text-xs text-tinta/55">
                        Sin oportunidades
                      </p>
                    ) : (
                      itemsEtapa.map((op) => (
                        <article
                          key={op.id}
                          className={`rounded-xl border p-3 shadow-sm transition hover:border-turquesa ${
                            op.estado_comercial === 'perdida'
                              ? 'border-red-800/25 bg-red-50/40'
                              : 'border-tinta/15 bg-marfil/65'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-turquesa">
                              <Plane className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{op.destino}</span>
                            </span>
                            <SedeBadge nombre={op.sede_nombre} />
                          </div>

                          <h4 className="mt-1.5 text-xs font-bold text-tinta">
                            {op.cliente_nombre}
                          </h4>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <EstadoComercialBadge
                              estado={op.estado_comercial}
                              motivo={op.motivo_perdida_nombre}
                            />
                            <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-tinta/75">
                              {op.canal}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1 border-t border-tinta/10 pt-2 text-[11px] text-tinta/75">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3 text-turquesa" aria-hidden="true" />
                                <span>{op.viajeros} viaj.</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-coral" aria-hidden="true" />
                                <span>{formatearFechaCorta(op.fecha_salida)}</span>
                              </span>
                            </div>
                            <p className="font-semibold text-tinta">
                              {formatearPresupuesto(op.presupuesto_total, op.moneda)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAbrirOportunidad(op.id)}
                            className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                          >
                            <span>Abrir ficha #{op.id}</span>
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* Vista alternativa de Tabla */
        <section
          aria-label="Tabla de oportunidades de viaje"
          className="overflow-hidden rounded-2xl border border-tinta/15 bg-white shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-tinta/15 bg-marfil text-tinta/75">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Destino</th>
                  <th className="px-4 py-3 font-semibold">Etapa actual</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Sede / Canal</th>
                  <th className="px-4 py-3 font-semibold">Presupuesto declarado</th>
                  <th className="px-4 py-3 font-semibold">Salida / Viajeros</th>
                  <th className="px-4 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta/10">
                {oportunidadesFiltradas.map((op) => (
                  <tr key={op.id} className="hover:bg-marfil/60">
                    <td className="px-4 py-3 font-bold text-tinta">#{op.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-tinta">{op.cliente_nombre}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-turquesa">{op.destino}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tinta text-[10px] font-bold text-white">
                          {op.etapa_orden}
                        </span>
                        <span className="font-medium text-tinta">{op.etapa_nombre}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoComercialBadge
                        estado={op.estado_comercial}
                        motivo={op.motivo_perdida_nombre}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SedeBadge nombre={op.sede_nombre} />
                        <span className="text-tinta/70">· {op.canal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-tinta">
                      {formatearPresupuesto(op.presupuesto_total, op.moneda)}
                    </td>
                    <td className="px-4 py-3 text-tinta/80">
                      {formatearFechaCorta(op.fecha_salida)} ({op.viajeros} viaj.)
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAbrirOportunidad(op.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                      >
                        <span>Ver ficha</span>
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
