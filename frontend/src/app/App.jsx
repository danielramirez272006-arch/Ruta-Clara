import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Compass,
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  BarChart3,
  Megaphone,
  Settings,
  Menu,
  X,
  Database,
  Search,
  Plane,
  ArrowRight
} from 'lucide-react';
import { apiService } from '../services/api.js';
import { InicioView } from '../features/inicio/InicioView.jsx';
import { ClientesView } from '../features/clientes/ClientesView.jsx';
import { OportunidadesView } from '../features/oportunidades/OportunidadesView.jsx';
import { FichaOportunidadView } from '../features/oportunidades/FichaOportunidadView.jsx';
import { SeguimientosView } from '../features/seguimientos/SeguimientosView.jsx';
import { MetricasView } from '../features/metricas/MetricasView.jsx';
import { CampanasView } from '../features/campanas/CampanasView.jsx';
import { ConfiguracionView } from '../features/configuracion/ConfiguracionView.jsx';
import { AlertBanner, EstadoComercialBadge, SedeBadge } from '../components/ui/BrandComponents.jsx';
import { formatearPresupuesto } from '../utils/formatters.js';

const ELEMENTOS_MENU = [
  { id: 'inicio', etiqueta: 'Inicio', icono: LayoutDashboard },
  { id: 'clientes', etiqueta: 'Clientes', icono: Users },
  { id: 'oportunidades', etiqueta: 'Oportunidades', icono: Briefcase },
  { id: 'seguimientos', etiqueta: 'Seguimientos', icono: Clock },
  { id: 'metricas', etiqueta: 'Métricas', icono: BarChart3 },
  { id: 'campanas', etiqueta: 'Campañas IA', icono: Megaphone },
  { id: 'configuracion', etiqueta: 'Configuración', icono: Settings }
];

export function App() {
  const [pantallaActiva, setPantallaActiva] = useState('inicio');
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  // Buscador global rápido (Ctrl + K)
  const [buscadorGlobalAbierto, setBuscadorGlobalAbierto] = useState(false);
  const [queryGlobal, setQueryGlobal] = useState('');

  // Datos principales provenientes de la API Express
  const [resumen, setResumen] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [fichaActiva, setFichaActiva] = useState(null);
  const [colaAtencion, setColaAtencion] = useState(null);
  const [umbralDias, setUmbralDias] = useState(7);
  const [metricas, setMetricas] = useState(null);
  const [campanasGuardadas, setCampanasGuardadas] = useState([]);
  const [estadoHealth, setEstadoHealth] = useState(null);

  // Preselecciones interactivas entre pantallas
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);
  const [etapaPreseleccionadaId, setEtapaPreseleccionadaId] = useState(null);

  // Estados de carga y error
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [cargandoHealth, setCargandoHealth] = useState(false);
  const [errorConexion, setErrorConexion] = useState(null);

  const cargarTodoElEstado = useCallback(async (diasUmbral = umbralDias) => {
    setCargandoGlobal(true);
    setErrorConexion(null);
    try {
      const [
        resResumen,
        resClientes,
        resOportunidades,
        resAtencion,
        resEmbudo,
        resCampanas,
        resHealth
      ] = await Promise.all([
        apiService.obtenerResumen(diasUmbral),
        apiService.listarClientes(''),
        apiService.listarOportunidades({}),
        apiService.obtenerAtencion(diasUmbral),
        apiService.obtenerEmbudo(),
        apiService.listarCampanasGuardadas().catch(() => []),
        apiService.obtenerHealth().catch(() => null)
      ]);

      setResumen(resResumen);
      setClientes(resClientes || []);
      setOportunidades(resOportunidades?.oportunidades || []);
      setCatalogos(resOportunidades?.catalogos || null);
      setColaAtencion(resAtencion);
      setMetricas(resEmbudo);
      setCampanasGuardadas(resCampanas || []);
      if (resHealth) {
        setEstadoHealth(resHealth);
      }
    } catch (err) {
      setErrorConexion(
        err.message ||
          'No se pudo sincronizar con la API Express. Verifique que el servidor backend y MySQL estén activos.'
      );
      try {
        const healthFallback = await apiService.obtenerHealth();
        setEstadoHealth(healthFallback);
      } catch {
        // Ignorar
      }
    } finally {
      setCargandoGlobal(false);
    }
  }, [umbralDias]);

  useEffect(() => {
    cargarTodoElEstado(7);
  }, [cargarTodoElEstado]);

  // Atajo de teclado Ctrl + K o Cmd + K para abrir el buscador global
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscadorGlobalAbierto((prev) => !prev);
      } else if (e.key === 'Escape' && buscadorGlobalAbierto) {
        setBuscadorGlobalAbierto(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [buscadorGlobalAbierto]);

  const resultadosBusquedaGlobal = useMemo(() => {
    const q = queryGlobal.trim().toLowerCase();
    if (!q) return (oportunidades || []).slice(0, 6);
    return (oportunidades || [])
      .filter(
        (op) =>
          String(op.id) === q ||
          String(op.cliente_nombre || '').toLowerCase().includes(q) ||
          String(op.destino || '').toLowerCase().includes(q) ||
          String(op.etapa_nombre || '').toLowerCase().includes(q) ||
          String(op.sede_nombre || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [oportunidades, queryGlobal]);

  const navegarAPantalla = (idPantalla) => {
    setPantallaActiva(idPantalla);
    setMenuMovilAbierto(false);
    if (idPantalla !== 'ficha') {
      setFichaActiva(null);
    }
  };

  const abrirFichaOportunidad = async (oportunidadId) => {
    setBuscadorGlobalAbierto(false);
    setPantallaActiva('ficha');
    setMenuMovilAbierto(false);
    setCargandoFicha(true);
    try {
      const ficha = await apiService.obtenerOportunidad(oportunidadId);
      setFichaActiva(ficha);
    } catch (err) {
      setErrorConexion(err.message);
    } finally {
      setCargandoFicha(false);
    }
  };

  const filtrarOportunidadesPorEtapa = (etapaId) => {
    setEtapaPreseleccionadaId(etapaId);
    setPantallaActiva('oportunidades');
  };

  // Handlers de Clientes
  const handleBuscarClientes = async (termino) => {
    const lista = await apiService.listarClientes(termino);
    setClientes(lista || []);
  };

  const handleCrearCliente = async (payload) => {
    const creado = await apiService.crearCliente(payload);
    await cargarTodoElEstado(umbralDias);
    return creado;
  };

  const handleActualizarCliente = async (id, payload) => {
    const actualizado = await apiService.actualizarCliente(id, payload);
    await cargarTodoElEstado(umbralDias);
    return actualizado;
  };

  const handleSolicitarNuevaOportunidadParaCliente = (cliente) => {
    setClientePreseleccionado(cliente);
    setPantallaActiva('oportunidades');
  };

  // Handlers de Oportunidades y Ficha
  const handleCrearOportunidad = async (payload) => {
    const creada = await apiService.crearOportunidad(payload);
    await cargarTodoElEstado(umbralDias);
    return creada;
  };

  const handleEditarPreferencias = async (id, payload) => {
    const actualizada = await apiService.editarPreferenciasOportunidad(id, payload);
    setFichaActiva(actualizada);
    await cargarTodoElEstado(umbralDias);
    return actualizada;
  };

  const handleAvanzarEtapa = async (id, etapaDestinoId) => {
    const actualizada = await apiService.avanzarEtapaOportunidad(id, etapaDestinoId);
    if (fichaActiva && Number(fichaActiva.id) === Number(id)) {
      setFichaActiva(actualizada);
    }
    await cargarTodoElEstado(umbralDias);
    return actualizada;
  };

  const handleCambiarEstadoComercial = async (id, payload) => {
    const actualizada = await apiService.cambiarEstadoOportunidad(id, payload);
    setFichaActiva(actualizada);
    await cargarTodoElEstado(umbralDias);
    return actualizada;
  };

  const handleGenerarMensajeIA = async (id, tono = 'cálido y consultivo') => {
    return apiService.generarMensajeIA(id, tono);
  };

  const handleAgregarNota = async (id, payload) => {
    const actualizada = await apiService.agregarNotaOportunidad(id, payload);
    setFichaActiva(actualizada);
    return actualizada;
  };

  // Handlers de Seguimientos
  const handleCambiarUmbralDias = async (nuevoUmbral) => {
    setUmbralDias(nuevoUmbral);
    const resAtencion = await apiService.obtenerAtencion(nuevoUmbral);
    setColaAtencion(resAtencion);
  };

  // Handlers de Campañas y Configuración
  const handleGenerarCampana = async (payload) => {
    const creada = await apiService.generarCampanaIA(payload);
    const lista = await apiService.listarCampanasGuardadas().catch(() => []);
    setCampanasGuardadas(lista || []);
    return creada;
  };

  const handleAprobarCampana = async (campanaId) => {
    const lista = await apiService.aprobarCampanaIA(campanaId);
    setCampanasGuardadas(lista || []);
    return lista;
  };

  const handleVerificarHealth = async () => {
    setCargandoHealth(true);
    try {
      const h = await apiService.obtenerHealth();
      setEstadoHealth(h);
    } catch (err) {
      setEstadoHealth({
        ok: false,
        mysql: { conectado: false, mensaje: err.message },
        ia: { configurado: false, mensaje: 'Servidor Express no alcanzable.' }
      });
    } finally {
      setCargandoHealth(false);
    }
  };

  const handleExportarJSON = async () => {
    return apiService.exportarDatosJSON();
  };

  return (
    <div className="min-h-screen bg-marfil text-tinta flex flex-col lg:flex-row">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-tinta focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Saltar al contenido principal
      </a>

      {/* Modal de Búsqueda Global Rápida (Ctrl + K) */}
      {buscadorGlobalAbierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buscador rápido de oportunidades y clientes"
          className="fixed inset-0 z-50 flex items-start justify-center bg-tinta/60 p-4 pt-16 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-tinta/20 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-tinta/10 pb-3">
              <div className="flex flex-1 items-center gap-2.5">
                <Search className="h-5 w-5 text-turquesa" aria-hidden="true" />
                <input
                  type="search"
                  autoFocus
                  value={queryGlobal}
                  onChange={(e) => setQueryGlobal(e.target.value)}
                  placeholder="Buscar por ID, viajero, destino (Cancún, Oaxaca, Madrid, Bogotá) o etapa..."
                  className="w-full bg-transparent text-sm font-medium text-tinta placeholder:text-tinta/45 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setBuscadorGlobalAbierto(false)}
                className="rounded-lg border border-tinta/15 bg-marfil px-2.5 py-1 text-xs font-semibold text-tinta"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-tinta/10">
              {resultadosBusquedaGlobal.length === 0 ? (
                <p className="py-6 text-center text-xs text-tinta/65">
                  No se encontraron oportunidades con &ldquo;{queryGlobal}&rdquo;.
                </p>
              ) : (
                resultadosBusquedaGlobal.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => abrirFichaOportunidad(op.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-marfil"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-tinta">
                          <Plane className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
                          <span>
                            #{op.id} · {op.destino} — {op.cliente_nombre}
                          </span>
                        </span>
                        <SedeBadge nombre={op.sede_nombre} />
                        <EstadoComercialBadge
                          estado={op.estado_comercial}
                          motivo={op.motivo_perdida_nombre}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-tinta/70">
                        Etapa {op.etapa_orden}: {op.etapa_nombre} ·{' '}
                        {formatearPresupuesto(op.presupuesto_total, op.moneda)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-turquesa" aria-hidden="true" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Barra superior para móvil y tableta */}
      <div className="flex items-center justify-between border-b border-white/10 bg-tinta px-4 py-3.5 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-turquesa text-white">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <span className="font-editorial text-lg font-bold tracking-tight">Ruta Clara</span>
            <p className="text-[11px] text-marfil/75">Cada viaje, un camino claro</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBuscadorGlobalAbierto(true)}
            className="rounded-xl border border-white/15 p-2 text-marfil hover:bg-tinta-suave"
            aria-label="Abrir buscador rápido"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMenuMovilAbierto((prev) => !prev)}
            aria-expanded={menuMovilAbierto}
            aria-controls="menu-navegacion-lateral"
            aria-label={menuMovilAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            className="rounded-xl border border-white/15 p-2 text-marfil hover:bg-tinta-suave"
          >
            {menuMovilAbierto ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menú lateral azul tinta (#152D39) */}
      <aside
        id="menu-navegacion-lateral"
        aria-label="Navegación principal de Ruta Clara"
        className={`${
          menuMovilAbierto ? 'block' : 'hidden'
        } w-full shrink-0 bg-tinta text-marfil lg:flex lg:w-72 lg:flex-col lg:justify-between`}
      >
        <div className="p-6">
          <div className="hidden lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-turquesa text-white shadow-sm">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <span className="font-editorial text-xl font-bold tracking-tight text-white">
                  Ruta Clara
                </span>
                <p className="text-xs text-marfil/75">“Cada viaje, un camino claro”</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-turquesa" />
              <span className="h-0.5 flex-1 bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-coral" />
              <span className="h-0.5 flex-1 bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-turquesa" />
            </div>

            {/* Botón de buscador rápido Ctrl + K en el menú lateral */}
            <button
              type="button"
              onClick={() => setBuscadorGlobalAbierto(true)}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/15 bg-tinta-suave/70 px-3 py-2 text-xs text-marfil/80 transition hover:border-turquesa hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
                <span>Buscar viaje o cliente...</span>
              </span>
              <kbd className="rounded bg-tinta px-1.5 py-0.5 font-mono text-[10px] text-marfil/75">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <nav className="mt-2 lg:mt-5 space-y-1.5" aria-label="Secciones del CRM">
            {ELEMENTOS_MENU.map((item) => {
              const Icono = item.icono;
              const activo =
                pantallaActiva === item.id ||
                (pantallaActiva === 'ficha' && item.id === 'oportunidades');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navegarAPantalla(item.id)}
                  aria-current={activo ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    activo
                      ? 'bg-turquesa text-white font-semibold shadow-sm'
                      : 'text-marfil/80 hover:bg-tinta-suave hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icono
                      className={`h-4 w-4 ${activo ? 'text-white' : 'text-coral'}`}
                      aria-hidden="true"
                    />
                    <span>{item.etiqueta}</span>
                  </span>

                  {item.id === 'seguimientos' && colaAtencion?.total_pendientes > 0 ? (
                    <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-tinta">
                      {colaAtencion.total_pendientes}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-5 text-xs text-marfil/75">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <Database className="h-3.5 w-3.5 text-turquesa" aria-hidden="true" />
              <span>Estado MySQL</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                estadoHealth?.mysql?.conectado
                  ? 'bg-emerald-900/60 text-emerald-200'
                  : 'bg-red-900/60 text-red-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  estadoHealth?.mysql?.conectado ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span>{estadoHealth?.mysql?.conectado ? 'Conectado' : 'Verificar'}</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-marfil/65">
            Sedes: Desamparados y Puntarenas · Datos académicos ficticios claramente identificados.
          </p>
        </div>
      </aside>

      <main id="contenido-principal" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {errorConexion ? (
            <AlertBanner
              tipo="error"
              titulo="Estado de conexión con el servidor Express / MySQL"
              mensaje={errorConexion}
              onClose={() => setErrorConexion(null)}
              accion={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => cargarTodoElEstado(umbralDias)}
                    className="rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                  >
                    Reintentar sincronización
                  </button>
                  <button
                    type="button"
                    onClick={() => navegarAPantalla('configuracion')}
                    className="rounded-lg border border-tinta/30 bg-white px-3 py-1.5 text-xs font-semibold text-tinta"
                  >
                    Ver instrucciones de Configuración
                  </button>
                </div>
              }
            />
          ) : null}

          {pantallaActiva === 'inicio' ? (
            <InicioView
              resumen={resumen}
              cargando={cargandoGlobal}
              error={errorConexion}
              onRecargar={() => cargarTodoElEstado(umbralDias)}
              onAbrirOportunidad={abrirFichaOportunidad}
              onIrAPantalla={navegarAPantalla}
              onFiltrarOportunidadesPorEtapa={filtrarOportunidadesPorEtapa}
            />
          ) : null}

          {pantallaActiva === 'clientes' ? (
            <ClientesView
              clientes={clientes}
              cargando={cargandoGlobal}
              onBuscarClientes={handleBuscarClientes}
              onCrearCliente={handleCrearCliente}
              onActualizarCliente={handleActualizarCliente}
              onAbrirOportunidad={abrirFichaOportunidad}
              onSolicitarNuevaOportunidadParaCliente={handleSolicitarNuevaOportunidadParaCliente}
            />
          ) : null}

          {pantallaActiva === 'oportunidades' ? (
            <OportunidadesView
              oportunidades={oportunidades}
              catalogos={catalogos}
              clientes={clientes}
              cargando={cargandoGlobal}
              clientePreseleccionado={clientePreseleccionado}
              etapaPreseleccionadaId={etapaPreseleccionadaId}
              onLimpiarPreseleccionCliente={() => setClientePreseleccionado(null)}
              onLimpiarPreseleccionEtapa={() => setEtapaPreseleccionadaId(null)}
              onCrearOportunidad={handleCrearOportunidad}
              onAvanzarEtapa={handleAvanzarEtapa}
              onAbrirOportunidad={abrirFichaOportunidad}
            />
          ) : null}

          {pantallaActiva === 'ficha' ? (
            <FichaOportunidadView
              ficha={fichaActiva}
              catalogos={catalogos}
              cargandoFicha={cargandoFicha}
              onVolver={() => navegarAPantalla('oportunidades')}
              onEditarPreferencias={handleEditarPreferencias}
              onAvanzarEtapa={handleAvanzarEtapa}
              onCambiarEstadoComercial={handleCambiarEstadoComercial}
              onGenerarMensajeIA={handleGenerarMensajeIA}
              onAgregarNota={handleAgregarNota}
            />
          ) : null}

          {pantallaActiva === 'seguimientos' ? (
            <SeguimientosView
              colaAtencion={colaAtencion}
              umbralDias={umbralDias}
              cargando={cargandoGlobal}
              error={errorConexion}
              onCambiarUmbralDias={handleCambiarUmbralDias}
              onAbrirOportunidad={abrirFichaOportunidad}
            />
          ) : null}

          {pantallaActiva === 'metricas' ? (
            <MetricasView
              metricas={metricas}
              cargando={cargandoGlobal}
              error={errorConexion}
              onRecargar={() => cargarTodoElEstado(umbralDias)}
              onFiltrarOportunidadesPorEtapa={filtrarOportunidadesPorEtapa}
            />
          ) : null}

          {pantallaActiva === 'campanas' ? (
            <CampanasView
              catalogos={catalogos}
              campanasGuardadas={campanasGuardadas}
              onGenerarCampana={handleGenerarCampana}
              onAprobarCampana={handleAprobarCampana}
            />
          ) : null}

          {pantallaActiva === 'configuracion' ? (
            <ConfiguracionView
              estadoHealth={estadoHealth}
              cargandoHealth={cargandoHealth}
              onVerificarHealth={handleVerificarHealth}
              onExportarJSON={handleExportarJSON}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
