import React, { useState, useEffect, useCallback } from 'react';
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
  Database
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
import { AlertBanner } from '../components/ui/BrandComponents.jsx';

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

  // Datos principales provenientes de la API Express
  const [resumen, setResumen] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [fichaActiva, setFichaActiva] = useState(null);
  const [colaAtencion, setColaAtencion] = useState(null);
  const [umbralDias, setUmbralDias] = useState(7);
  const [metricas, setMetricas] = useState(null);
  const [estadoHealth, setEstadoHealth] = useState(null);

  // Cliente preseleccionado cuando se pulsa "Nuevo viaje" desde la tarjeta de un cliente
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  // Estados de carga y error
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [cargandoHealth, setCargandoHealth] = useState(false);
  const [errorConexion, setErrorConexion] = useState(null);

  const cargarTodoElEstado = useCallback(async (diasUmbral = umbralDias) => {
    setCargandoGlobal(true);
    setErrorConexion(null);
    try {
      const [resResumen, resClientes, resOportunidades, resAtencion, resEmbudo, resHealth] =
        await Promise.all([
          apiService.obtenerResumen(diasUmbral),
          apiService.listarClientes(''),
          apiService.listarOportunidades({}),
          apiService.obtenerAtencion(diasUmbral),
          apiService.obtenerEmbudo(),
          apiService.obtenerHealth().catch(() => null)
        ]);

      setResumen(resResumen);
      setClientes(resClientes || []);
      setOportunidades(resOportunidades?.oportunidades || []);
      setCatalogos(resOportunidades?.catalogos || null);
      setColaAtencion(resAtencion);
      setMetricas(resEmbudo);
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

  const navegarAPantalla = (idPantalla) => {
    setPantallaActiva(idPantalla);
    setMenuMovilAbierto(false);
    if (idPantalla !== 'ficha') {
      setFichaActiva(null);
    }
  };

  const abrirFichaOportunidad = async (oportunidadId) => {
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
    setFichaActiva(actualizada);
    await cargarTodoElEstado(umbralDias);
    return actualizada;
  };

  const handleCambiarEstadoComercial = async (id, payload) => {
    const actualizada = await apiService.cambiarEstadoOportunidad(id, payload);
    setFichaActiva(actualizada);
    await cargarTodoElEstado(umbralDias);
    return actualizada;
  };

  const handleGenerarMensajeIA = async (id) => {
    return apiService.generarMensajeIA(id);
  };

  // Handlers de Seguimientos
  const handleCambiarUmbralDias = async (nuevoUmbral) => {
    setUmbralDias(nuevoUmbral);
    const resAtencion = await apiService.obtenerAtencion(nuevoUmbral);
    setColaAtencion(resAtencion);
  };

  // Handlers de Campañas y Configuración
  const handleGenerarCampana = async (payload) => {
    return apiService.generarCampanaIA(payload);
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
        claude: { configurado: false, mensaje: 'Servidor Express no alcanzable.' }
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
      {/* Enlace de salto accesible para navegación por teclado */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-tinta focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Saltar al contenido principal
      </a>

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

      {/* Menú lateral azul tinta (#152D39) */}
      <aside
        id="menu-navegacion-lateral"
        aria-label="Navegación principal de Ruta Clara"
        className={`${
          menuMovilAbierto ? 'block' : 'hidden'
        } w-full shrink-0 bg-tinta text-marfil lg:flex lg:w-72 lg:flex-col lg:justify-between`}
      >
        <div className="p-6">
          {/* Identidad de marca en escritorio */}
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

            {/* Línea de recorrido con puntos en el menú lateral */}
            <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-turquesa" />
              <span className="h-0.5 flex-1 bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-coral" />
              <span className="h-0.5 flex-1 bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-turquesa" />
            </div>
          </div>

          {/* Vínculos de las 7 pantallas */}
          <nav className="mt-2 lg:mt-6 space-y-1.5" aria-label="Secciones del CRM">
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

        {/* Pie del menú lateral con estado de conexión */}
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

      {/* Área de trabajo principal en fondo marfil (#F7F5EF) */}
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
              onLimpiarPreseleccionCliente={() => setClientePreseleccionado(null)}
              onCrearOportunidad={handleCrearOportunidad}
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
            />
          ) : null}

          {pantallaActiva === 'campanas' ? (
            <CampanasView
              catalogos={catalogos}
              onGenerarCampana={handleGenerarCampana}
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
