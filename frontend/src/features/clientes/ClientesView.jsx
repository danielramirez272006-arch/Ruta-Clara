import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit3,
  PlusCircle,
  ArrowRight,
  Plane
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
import { formatearPresupuesto, formatearFechaCorta } from '../../utils/formatters.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function ClientesView({
  clientes,
  cargando,
  onBuscarClientes,
  onCrearCliente,
  onActualizarCliente,
  onAbrirOportunidad,
  onSolicitarNuevaOportunidadParaCliente
}) {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');

  const {
    cargando: guardando,
    error: errorAccion,
    exito: exitoAccion,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    onBuscarClientes(terminoBusqueda);
  };

  const handleLimpiarBusqueda = () => {
    setTerminoBusqueda('');
    onBuscarClientes('');
  };

  const handleCrearClienteSubmit = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        await onCrearCliente({
          nombre: nombreNuevo,
          es_ficticio: true
        });
        // Solo limpiamos el campo si la solicitud tuvo éxito (conservamos datos si falla)
        setNombreNuevo('');
      }, 'Cliente ficticio registrado correctamente.');
    } catch {
      // El hook conserva el error y el formulario mantiene nombreNuevo
    }
  };

  const iniciarEdicion = (cliente) => {
    limpiarMensajes();
    setClienteEditandoId(cliente.id);
    setNombreEditado(cliente.nombre);
  };

  const handleGuardarEdicion = async (e, clienteId) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        await onActualizarCliente(clienteId, {
          nombre: nombreEditado,
          es_ficticio: true
        });
        setClienteEditandoId(null);
      }, 'Datos del cliente actualizados correctamente.');
    } catch {
      // Conserva nombreEditado en caso de fallo
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Directorio de Viajeros</span>
              </span>
              <DatoFicticioBadge />
            </div>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Clientes y su historial de oportunidades
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Cada cliente es una entidad independiente y puede contar con múltiples oportunidades de viaje simultáneas o históricas.
            </p>
          </div>
        </div>
        <BrandRouteDivider className="mt-4" label="Relación 1 a N con oportunidades" />
      </header>

      {errorAccion ? (
        <AlertBanner
          tipo="error"
          titulo="No se pudo completar la operación"
          mensaje={errorAccion}
          onClose={limpiarMensajes}
        />
      ) : null}

      {exitoAccion ? (
        <AlertBanner
          tipo="exito"
          titulo="Operación confirmada"
          mensaje={exitoAccion}
          onClose={limpiarMensajes}
        />
      ) : null}

      {/* Panel de búsqueda y creación de cliente ficticio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="form-crear-cliente-titulo"
          className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm lg:col-span-5"
        >
          <h2 id="form-crear-cliente-titulo" className="font-editorial text-lg font-bold text-tinta">
            Registrar nuevo cliente ficticio
          </h2>
          <p className="mt-0.5 text-xs text-tinta/70">
            Todos los perfiles creados se etiquetan como datos ficticios académicos.
          </p>

          <form onSubmit={handleCrearClienteSubmit} className="mt-4 space-y-3" noValidate>
            <div>
              <label
                htmlFor="input-nombre-nuevo-cliente"
                className="block text-xs font-semibold text-tinta"
              >
                Nombre completo del cliente (ficticio) *
              </label>
              <input
                id="input-nombre-nuevo-cliente"
                type="text"
                required
                minLength={2}
                maxLength={140}
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Ej. Julieta Alvarado Mora (Ficticio)"
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3.5 py-2 text-sm text-tinta placeholder:text-tinta/45 focus:border-turquesa focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-tinta-suave disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>{guardando ? 'Guardando cliente...' : 'Crear cliente ficticio'}</span>
            </button>
          </form>
        </section>

        <section
          aria-labelledby="form-buscar-cliente-titulo"
          className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm lg:col-span-7"
        >
          <h2 id="form-buscar-cliente-titulo" className="font-editorial text-lg font-bold text-tinta">
            Buscar y filtrar clientes
          </h2>
          <p className="mt-0.5 text-xs text-tinta/70">
            Consulte por nombre o revise cuáles viajeros tienen dos o más oportunidades independientes.
          </p>

          <form onSubmit={handleBuscarSubmit} className="mt-4 flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <label htmlFor="input-buscar-cliente" className="sr-only">
                Buscar cliente por nombre
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-tinta/45"
                aria-hidden="true"
              />
              <input
                id="input-buscar-cliente"
                type="search"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar por nombre de viajero..."
                className="w-full rounded-xl border border-tinta/25 bg-marfil/50 pl-10 pr-3.5 py-2 text-sm text-tinta placeholder:text-tinta/45 focus:border-turquesa focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-turquesa px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Buscar
            </button>
            {terminoBusqueda ? (
              <button
                type="button"
                onClick={handleLimpiarBusqueda}
                className="rounded-xl border border-tinta/20 bg-marfil px-3.5 py-2 text-sm font-semibold text-tinta hover:bg-marfil-oscuro"
              >
                Limpiar
              </button>
            ) : null}
          </form>
        </section>
      </div>

      {/* Lista de clientes con sus oportunidades de viaje */}
      {cargando ? (
        <LoadingState mensaje="Consultando clientes y oportunidades..." />
      ) : clientes.length === 0 ? (
        <EmptyState
          titulo="No se encontraron clientes"
          descripcion="No hay clientes que coincidan con la búsqueda actual."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clientes.map((cliente) => {
            const estaEditando = clienteEditandoId === cliente.id;
            const ops = cliente.oportunidades || [];

            return (
              <article
                key={cliente.id}
                className="flex flex-col justify-between rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta text-xs font-bold text-white">
                        #{cliente.id}
                      </span>
                      <div>
                        {estaEditando ? (
                          <form
                            onSubmit={(e) => handleGuardarEdicion(e, cliente.id)}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <label htmlFor={`edit-cliente-${cliente.id}`} className="sr-only">
                              Editar nombre de cliente
                            </label>
                            <input
                              id={`edit-cliente-${cliente.id}`}
                              type="text"
                              required
                              value={nombreEditado}
                              onChange={(e) => setNombreEditado(e.target.value)}
                              className="rounded-lg border border-turquesa bg-marfil px-2.5 py-1 text-sm font-semibold text-tinta"
                            />
                            <button
                              type="submit"
                              disabled={guardando}
                              className="rounded-lg bg-turquesa px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setClienteEditandoId(null)}
                              className="rounded-lg border border-tinta/20 px-2 py-1 text-xs font-semibold text-tinta"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <h3 className="font-editorial text-lg font-bold text-tinta">
                            {cliente.nombre}
                          </h3>
                        )}
                        <div className="mt-0.5 flex items-center gap-2">
                          <DatoFicticioBadge visible={Boolean(cliente.es_ficticio)} />
                          <span className="text-xs text-tinta/65">
                            {ops.length} {ops.length === 1 ? 'oportunidad de viaje' : 'oportunidades de viaje'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!estaEditando ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg border border-tinta/20 bg-marfil px-2.5 py-1.5 text-xs font-semibold text-tinta hover:bg-marfil-oscuro"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSolicitarNuevaOportunidadParaCliente(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
                          <span>Nuevo viaje</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Lista de oportunidades independientes de este cliente */}
                  <div className="mt-4 space-y-2.5">
                    {ops.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-tinta/20 bg-marfil/40 p-3 text-xs text-tinta/70">
                        Sin oportunidades registradas aún. Use &ldquo;Nuevo viaje&rdquo; para abrirle una cotización.
                      </p>
                    ) : (
                      ops.map((op) => (
                        <div
                          key={op.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tinta/15 bg-marfil/55 p-3"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-sm font-bold text-tinta">
                                <Plane className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                                <span>{op.destino}</span>
                              </span>
                              <SedeBadge nombre={op.sede_nombre} />
                              <EstadoComercialBadge
                                estado={op.estado_comercial}
                                motivo={op.motivo_perdida_nombre}
                              />
                            </div>
                            <p className="mt-1 text-xs text-tinta/75">
                              Etapa {op.etapa_orden}: <strong>{op.etapa_nombre}</strong> · Salida:{' '}
                              {formatearFechaCorta(op.fecha_salida)} · {op.viajeros}{' '}
                              {op.viajeros === 1 ? 'viajero' : 'viajeros'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-tinta">
                              {formatearPresupuesto(op.presupuesto_total, op.moneda)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAbrirOportunidad(op.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-turquesa px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                            >
                              <span>Ficha</span>
                              <ArrowRight className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
