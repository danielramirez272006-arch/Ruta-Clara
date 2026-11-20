import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit3,
  PlusCircle,
  ArrowRight,
  Plane,
  Phone,
  Mail,
  MessageSquare
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
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [preferenciaNueva, setPreferenciaNueva] = useState('WhatsApp');

  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [formEdit, setFormEdit] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    preferencia_contacto: 'WhatsApp'
  });

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
          telefono: telefonoNuevo,
          correo: correoNuevo,
          preferencia_contacto: preferenciaNueva,
          es_ficticio: true
        });
        setNombreNuevo('');
        setTelefonoNuevo('');
        setCorreoNuevo('');
      }, 'Cliente ficticio registrado correctamente con sus datos de contacto.');
    } catch {
      // Conserva datos en formulario si ocurre error
    }
  };

  const iniciarEdicion = (cliente) => {
    limpiarMensajes();
    setClienteEditandoId(cliente.id);
    setFormEdit({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      preferencia_contacto: cliente.preferencia_contacto || 'WhatsApp'
    });
  };

  const handleGuardarEdicion = async (e, clienteId) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        await onActualizarCliente(clienteId, {
          ...formEdit,
          es_ficticio: true
        });
        setClienteEditandoId(null);
      }, 'Datos del cliente actualizados correctamente.');
    } catch {
      // Conserva edición en caso de fallo
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
              Clientes, preferencias de contacto y oportunidades
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Cada cliente puede tener múltiples oportunidades de viaje independientes. Nota de privacidad: los teléfonos y correos ficticios son para uso exclusivo del asesor y <strong>nunca se envían a DeepSeek</strong>.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="form-crear-cliente-titulo"
          className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm lg:col-span-6"
        >
          <h2 id="form-crear-cliente-titulo" className="font-editorial text-lg font-bold text-tinta">
            Registrar nuevo cliente ficticio
          </h2>
          <p className="mt-0.5 text-xs text-tinta/70">
            Incluya datos ficticios opcionales de contacto para facilitar el seguimiento manual del asesor.
          </p>

          <form onSubmit={handleCrearClienteSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <label htmlFor="input-nombre-nuevo-cliente" className="block text-xs font-semibold text-tinta">
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

            <div>
              <label htmlFor="input-tel-nuevo-cliente" className="block text-xs font-semibold text-tinta">
                Teléfono (ficticio opcional)
              </label>
              <input
                id="input-tel-nuevo-cliente"
                type="text"
                value={telefonoNuevo}
                onChange={(e) => setTelefonoNuevo(e.target.value)}
                placeholder="+506 8000-0000"
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="input-correo-nuevo-cliente" className="block text-xs font-semibold text-tinta">
                Correo (ficticio opcional)
              </label>
              <input
                id="input-correo-nuevo-cliente"
                type="email"
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
                placeholder="viajero@rutaclara-demo.cr"
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="select-pref-contacto" className="block text-xs font-semibold text-tinta">
                Canal preferido de contacto
              </label>
              <select
                id="select-pref-contacto"
                value={preferenciaNueva}
                onChange={(e) => setPreferenciaNueva(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/50 px-3 py-2 text-xs text-tinta focus:border-turquesa focus:bg-white"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Correo">Correo electrónico</option>
                <option value="Llamada">Llamada telefónica</option>
                <option value="Instagram">Instagram DM</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-tinta-suave disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4 text-coral" aria-hidden="true" />
                <span>{guardando ? 'Guardando...' : 'Crear cliente'}</span>
              </button>
            </div>
          </form>
        </section>

        <section
          aria-labelledby="form-buscar-cliente-titulo"
          className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm lg:col-span-6"
        >
          <h2 id="form-buscar-cliente-titulo" className="font-editorial text-lg font-bold text-tinta">
            Buscar y filtrar clientes
          </h2>
          <p className="mt-0.5 text-xs text-tinta/70">
            Busque por nombre, correo o teléfono ficticio, o revise cuáles viajeros tienen múltiples viajes.
          </p>

          <form onSubmit={handleBuscarSubmit} className="mt-4 flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <label htmlFor="input-buscar-cliente" className="sr-only">
                Buscar cliente
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
                placeholder="Buscar por nombre, correo o teléfono..."
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

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-tinta/10 pt-4 text-xs">
            <div className="rounded-xl bg-marfil/70 p-3">
              <span className="text-tinta/70">Total de clientes listados</span>
              <p className="mt-0.5 font-editorial text-xl font-bold text-tinta">{clientes.length}</p>
            </div>
            <div className="rounded-xl bg-marfil/70 p-3">
              <span className="text-tinta/70">Clientes con 2+ viajes</span>
              <p className="mt-0.5 font-editorial text-xl font-bold text-turquesa">
                {clientes.filter((c) => (c.oportunidades || []).length >= 2).length}
              </p>
            </div>
          </div>
        </section>
      </div>

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
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta text-xs font-bold text-white">
                        #{cliente.id}
                      </span>
                      <div>
                        <h3 className="font-editorial text-lg font-bold text-tinta">
                          {cliente.nombre}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <DatoFicticioBadge visible={Boolean(cliente.es_ficticio)} />
                          <span className="text-xs font-medium text-tinta/65">
                            {ops.length} {ops.length === 1 ? 'oportunidad' : 'oportunidades'}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-tinta/75">
                          {cliente.telefono ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 text-turquesa" aria-hidden="true" />
                              <span>{cliente.telefono}</span>
                            </span>
                          ) : null}
                          {cliente.correo ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 text-coral" aria-hidden="true" />
                              <span>{cliente.correo}</span>
                            </span>
                          ) : null}
                          {cliente.preferencia_contacto ? (
                            <span className="inline-flex items-center gap-1 rounded bg-marfil px-1.5 py-0.5 text-[11px] font-semibold text-tinta">
                              <MessageSquare className="h-3 w-3 text-turquesa" aria-hidden="true" />
                              <span>Prefiere: {cliente.preferencia_contacto}</span>
                            </span>
                          ) : null}
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

                  {estaEditando ? (
                    <form
                      onSubmit={(e) => handleGuardarEdicion(e, cliente.id)}
                      className="mt-3 grid grid-cols-1 gap-2.5 rounded-xl border border-turquesa/40 bg-marfil/70 p-3 sm:grid-cols-2"
                    >
                      <div className="sm:col-span-2">
                        <label htmlFor={`edit-nombre-${cliente.id}`} className="block text-[11px] font-semibold text-tinta">
                          Nombre *
                        </label>
                        <input
                          id={`edit-nombre-${cliente.id}`}
                          type="text"
                          required
                          value={formEdit.nombre}
                          onChange={(e) => setFormEdit((p) => ({ ...p, nombre: e.target.value }))}
                          className="mt-0.5 w-full rounded-lg border border-tinta/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-tinta"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-tel-${cliente.id}`} className="block text-[11px] font-semibold text-tinta">
                          Teléfono ficticio
                        </label>
                        <input
                          id={`edit-tel-${cliente.id}`}
                          type="text"
                          value={formEdit.telefono}
                          onChange={(e) => setFormEdit((p) => ({ ...p, telefono: e.target.value }))}
                          className="mt-0.5 w-full rounded-lg border border-tinta/25 bg-white px-2.5 py-1.5 text-xs text-tinta"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-correo-${cliente.id}`} className="block text-[11px] font-semibold text-tinta">
                          Correo ficticio
                        </label>
                        <input
                          id={`edit-correo-${cliente.id}`}
                          type="email"
                          value={formEdit.correo}
                          onChange={(e) => setFormEdit((p) => ({ ...p, correo: e.target.value }))}
                          className="mt-0.5 w-full rounded-lg border border-tinta/25 bg-white px-2.5 py-1.5 text-xs text-tinta"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-pref-${cliente.id}`} className="block text-[11px] font-semibold text-tinta">
                          Canal preferido
                        </label>
                        <select
                          id={`edit-pref-${cliente.id}`}
                          value={formEdit.preferencia_contacto}
                          onChange={(e) => setFormEdit((p) => ({ ...p, preferencia_contacto: e.target.value }))}
                          className="mt-0.5 w-full rounded-lg border border-tinta/25 bg-white px-2.5 py-1.5 text-xs text-tinta"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Correo">Correo electrónico</option>
                          <option value="Llamada">Llamada telefónica</option>
                          <option value="Instagram">Instagram DM</option>
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="submit"
                          disabled={guardando}
                          className="rounded-lg bg-turquesa px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setClienteEditandoId(null)}
                          className="rounded-lg border border-tinta/20 bg-white px-3 py-1.5 text-xs font-semibold text-tinta"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : null}

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
