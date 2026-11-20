import React from 'react';
import {
  Settings,
  Database,
  Sparkles,
  Download,
  RefreshCw,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  BrandRouteDivider,
  AlertBanner
} from '../../components/ui/BrandComponents.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function ConfiguracionView({
  estadoHealth,
  cargandoHealth,
  onVerificarHealth,
  onExportarJSON
}) {
  const {
    cargando: exportando,
    error: errorExport,
    exito: exitoExport,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  const handleDescargarJSON = async () => {
    try {
      await ejecutar(async () => {
        const payload = await onExportarJSON();
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ruta-clara-datos-ficticios-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'Archivo JSON con los datos ficticios exportado correctamente.');
    } catch {
      // Manejado por errorExport
    }
  };

  const mysqlOk = Boolean(estadoHealth?.mysql?.conectado);
  const iaInfo = estadoHealth?.ia || estadoHealth?.claude;
  const iaOk = Boolean(iaInfo?.configurado);
  const proveedorIA = iaInfo?.proveedor || 'DeepSeek';

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Diagnóstico y Portabilidad</span>
            </span>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Configuración del sistema y estado de la API
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Por seguridad arquitectónica, el navegador nunca solicita ni recibe contraseñas de MySQL ni claves de Claude. Toda la configuración reside en el archivo <code>.env</code> del servidor Express.
            </p>
          </div>

          <button
            type="button"
            disabled={cargandoHealth}
            onClick={onVerificarHealth}
            className="inline-flex items-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tinta-suave disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cargandoHealth ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{cargandoHealth ? 'Comprobando...' : 'Comprobar conexión con API'}</span>
          </button>
        </div>
        <BrandRouteDivider className="mt-4" label="Frontend → Express → MySQL / Claude" />
      </header>

      {errorExport ? (
        <AlertBanner
          tipo="error"
          titulo="Error al exportar datos ficticios"
          mensaje={errorExport}
          onClose={limpiarMensajes}
        />
      ) : null}

      {exitoExport ? (
        <AlertBanner
          tipo="exito"
          titulo="Exportación completada"
          mensaje={exitoExport}
          onClose={limpiarMensajes}
        />
      ) : null}

      {/* Estado de conexión con la API, MySQL y Claude */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-turquesa-claro p-2.5 text-turquesa">
                <Database className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-editorial text-lg font-bold text-tinta">
                  Base de Datos MySQL 8.0.16+
                </h2>
                <p className="text-xs text-tinta/65">Conexión mediante mysql2/promise</p>
              </div>
            </div>

            {mysqlOk ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/30 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Conectado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-800/30 bg-red-50 px-3 py-1 text-xs font-bold text-red-900">
                <XCircle className="h-4 w-4 text-red-700" aria-hidden="true" />
                <span>Sin conexión</span>
              </span>
            )}
          </div>

          <dl className="mt-4 space-y-2 rounded-xl bg-marfil/70 p-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-tinta/70">Host / Puerto:</dt>
              <dd className="font-mono font-semibold text-tinta">
                {estadoHealth?.mysql?.host || '127.0.0.1'}:{estadoHealth?.mysql?.port || 3306}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-tinta/70">Esquema (DB_NAME):</dt>
              <dd className="font-mono font-semibold text-tinta">
                {estadoHealth?.mysql?.database || 'ruta_clara'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-tinta/70">Oportunidades registradas:</dt>
              <dd className="font-bold text-tinta">
                {estadoHealth?.mysql?.total_oportunidades ?? '—'}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-tinta/80">
            {estadoHealth?.mysql?.mensaje ||
              'Presione "Comprobar conexión con API" para consultar GET /health.'}
          </p>
        </article>

        <article className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-coral-claro p-2.5 text-coral">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-editorial text-lg font-bold text-tinta">
                  Integración con IA ({proveedorIA})
                </h2>
                <p className="text-xs text-tinta/65">Invocado exclusivamente desde Express</p>
              </div>
            </div>

            {iaOk ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/30 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Clave detectada</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/30 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">
                <XCircle className="h-4 w-4 text-amber-800" aria-hidden="true" />
                <span>Clave no configurada</span>
              </span>
            )}
          </div>

          <dl className="mt-4 space-y-2 rounded-xl bg-marfil/70 p-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-tinta/70">Modelo configurado (DEEPSEEK_MODEL):</dt>
              <dd className="font-mono font-semibold text-tinta">
                {iaInfo?.modelo || 'deepseek-chat'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-tinta/70">Exposición de clave en navegador:</dt>
              <dd className="font-bold text-emerald-800">Ninguna (0 secretos en cliente)</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-tinta/80">
            {iaInfo?.mensaje ||
              'Configure DEEPSEEK_API_KEY en el archivo .env del servidor Express.'}
          </p>
        </article>
      </div>

      {/* Exportación de datos ficticios a JSON */}
      <section
        aria-labelledby="titulo-exportar-json"
        className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="titulo-exportar-json" className="font-editorial text-lg font-bold text-tinta">
              Exportación de datos ficticios a JSON
            </h2>
            <p className="mt-1 text-xs text-tinta/75">
              Descargue un respaldo completo con los catálogos, clientes ficticios, las oportunidades de viaje, su historial de etapas y eventos comerciales.
            </p>
          </div>
          <button
            type="button"
            disabled={exportando}
            onClick={handleDescargarJSON}
            className="inline-flex items-center gap-2 rounded-xl bg-turquesa px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>{exportando ? 'Generando archivo...' : 'Exportar datos ficticios (.json)'}</span>
          </button>
        </div>
      </section>

      {/* Instrucciones para configurar el servidor (sin pedir secretos en la UI) */}
      <section
        aria-labelledby="titulo-instrucciones-servidor"
        className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-turquesa" aria-hidden="true" />
          <h2 id="titulo-instrucciones-servidor" className="font-editorial text-lg font-bold text-tinta">
            Instrucciones para configurar y ejecutar el servidor Express y MySQL
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-tinta/15 bg-marfil/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tinta">
              1. Variables de entorno del backend (.env)
            </h3>
            <p className="mt-1 text-xs text-tinta/75">
              Copie el archivo <code>.env.example</code> a <code>.env</code> en la raíz del proyecto y ajuste los valores en su servidor local:
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded-lg bg-tinta p-3 font-mono text-[11px] leading-relaxed text-marfil">
{`DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ruta_clara
DB_USER=root
DB_PASSWORD=su_password_mysql
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat`}
            </pre>
          </div>

          <div className="rounded-xl border border-tinta/15 bg-marfil/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tinta">
              2. Comandos de inicialización y ejecución
            </h3>
            <p className="mt-1 text-xs text-tinta/75">
              Ejecute la semilla reproducible de 40 oportunidades y levante ambos servidores:
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded-lg bg-tinta p-3 font-mono text-[11px] leading-relaxed text-marfil">
{`# 1. Crear esquema en MySQL 8.0.16+ y poblar las 40 oportunidades
npm run seed

# 2. Iniciar API REST con Express (puerto 3001)
npm run dev:backend

# 3. Iniciar interfaz React en otra terminal (puerto 5173)
npm run dev:frontend

# 4. Ejecutar pruebas unitarias y de integración
npm test`}
            </pre>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-turquesa/30 bg-turquesa-claro/40 p-3.5 text-xs text-tinta">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-turquesa" aria-hidden="true" />
          <p>
            <strong>Garantía de seguridad:</strong> Esta pantalla no incluye formularios para introducir <code>ANTHROPIC_API_KEY</code> ni <code>DB_PASSWORD</code> en el navegador, cumpliendo el principio de aislamiento de credenciales en el backend.
          </p>
        </div>
      </section>
    </div>
  );
}
