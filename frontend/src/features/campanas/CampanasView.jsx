import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  History
} from 'lucide-react';
import {
  BrandRouteDivider,
  SedeBadge,
  AlertBanner
} from '../../components/ui/BrandComponents.jsx';
import { SEDES_LISTA, formatearFechaHoraUTC } from '../../utils/formatters.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function CampanasView({
  catalogos,
  campanasGuardadas = [],
  onGenerarCampana,
  onAprobarCampana
}) {
  const sedes = catalogos?.sedes?.length ? catalogos.sedes : SEDES_LISTA;

  const [objetivo, setObjetivo] = useState(
    'Impulsar escapadas culturales y gastronómicas a Oaxaca y Madrid para viajeros en pareja durante la próxima temporada.'
  );
  const [sedeId, setSedeId] = useState(String(sedes[0]?.id || 1));
  const [resultadoCampana, setResultadoCampana] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  const {
    cargando,
    error,
    exito,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  useEffect(() => {
    if (!resultadoCampana && campanasGuardadas.length > 0) {
      setResultadoCampana(campanasGuardadas[0]);
    }
  }, [campanasGuardadas, resultadoCampana]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        const res = await onGenerarCampana({
          objetivo,
          sede_id: Number(sedeId)
        });
        setResultadoCampana(res);
      }, 'Tres borradores generados y guardados en el historial de campañas.');
    } catch {
      // Conserva los datos del formulario
    }
  };

  const handleCopiarTexto = async (borrador) => {
    try {
      await navigator.clipboard.writeText(`${borrador.titulo}\n\n${borrador.texto}`);
      setCopiadoId(borrador.id);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  const handleAprobar = async (campanaId) => {
    if (!campanaId || !onAprobarCampana) return;
    await ejecutar(async () => {
      const lista = await onAprobarCampana(campanaId);
      const actualizada = (lista || []).find((c) => Number(c.id) === Number(campanaId));
      if (actualizada) {
        setResultadoCampana(actualizada);
      } else {
        setResultadoCampana((prev) =>
          prev ? { ...prev, estado: 'Aprobada por el agente' } : prev
        );
      }
    }, 'Campaña marcada como "Aprobada por el agente" (lista para publicación manual).');
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa-claro px-3 py-1 text-xs font-semibold text-turquesa">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Comunicación Editorial con IA</span>
            </span>
            <h1 className="mt-2 font-editorial text-2xl font-bold text-tinta">
              Generador e historial de campañas para redes sociales
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Genere tres borradores mediante DeepSeek (vía Express) según el objetivo comercial y la sede. Todos los textos nacen en estado <strong>&ldquo;Pendiente de aprobación&rdquo;</strong>, se guardan en MySQL y nunca se publican automáticamente.
            </p>
          </div>
        </div>
        <BrandRouteDivider className="mt-4" label="Revisión humana obligatoria" />
      </header>

      {error ? (
        <AlertBanner
          tipo="aviso"
          titulo="No se pudieron generar los borradores con IA"
          mensaje={error}
          onClose={limpiarMensajes}
        />
      ) : null}

      {exito ? (
        <AlertBanner
          tipo="exito"
          titulo="Campaña actualizada"
          mensaje={exito}
          onClose={limpiarMensajes}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <section
            aria-labelledby="titulo-form-campana"
            className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm"
          >
            <h2 id="titulo-form-campana" className="font-editorial text-lg font-bold text-tinta">
              Configurar nueva campaña
            </h2>
            <p className="mt-1 text-xs text-tinta/70">
              DeepSeek redactará tres propuestas sin inventar precios, descuentos, disponibilidad ni requisitos migratorios.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
              <div>
                <label htmlFor="select-sede-campana" className="block text-xs font-semibold text-tinta">
                  Sede de Ruta Clara *
                </label>
                <select
                  id="select-sede-campana"
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/60 px-3.5 py-2.5 text-sm text-tinta focus:border-turquesa focus:bg-white"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="textarea-objetivo-campana" className="block text-xs font-semibold text-tinta">
                  Objetivo comercial de la campaña (5 a 300 caracteres) *
                </label>
                <textarea
                  id="textarea-objetivo-campana"
                  rows={4}
                  required
                  minLength={5}
                  maxLength={300}
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Describa el propósito de la campaña y el perfil de interés..."
                  className="mt-1 w-full rounded-xl border border-tinta/25 bg-marfil/60 p-3.5 text-sm text-tinta placeholder:text-tinta/45 focus:border-turquesa focus:bg-white"
                />
              </div>

              <div className="rounded-xl border border-tinta/15 bg-marfil/70 p-3 text-xs text-tinta/80">
                <div className="flex items-center gap-1.5 font-semibold text-tinta">
                  <ShieldCheck className="h-4 w-4 text-turquesa" aria-hidden="true" />
                  <span>Política de transparencia académica</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  Si <code>DEEPSEEK_API_KEY</code> no está configurada en el servidor Express, el sistema mostrará un error explícito en lugar de simular borradores con plantillas prefabricadas.
                </p>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-tinta-suave disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 text-coral" aria-hidden="true" />
                <span>
                  {cargando ? 'Generando 3 borradores con DeepSeek...' : 'Generar tres borradores con IA'}
                </span>
              </button>
            </form>
          </section>

          {/* Historial de campañas guardadas en MySQL */}
          {campanasGuardadas.length > 0 ? (
            <section
              aria-labelledby="titulo-historial-campanas"
              className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-turquesa" aria-hidden="true" />
                <h3 id="titulo-historial-campanas" className="font-editorial text-base font-bold text-tinta">
                  Campañas guardadas en MySQL ({campanasGuardadas.length})
                </h3>
              </div>
              <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {campanasGuardadas.map((c) => {
                  const seleccionada = resultadoCampana?.id && Number(resultadoCampana.id) === Number(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setResultadoCampana(c)}
                        className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                          seleccionada
                            ? 'border-turquesa bg-turquesa-claro/50'
                            : 'border-tinta/15 bg-marfil/50 hover:bg-marfil'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-tinta">
                            #{c.id} · Sede {c.sede_nombre || c.sede}
                          </span>
                          <span className="text-[11px] font-semibold text-turquesa">{c.estado}</span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-tinta/75">{c.objetivo}</p>
                        {c.creado_en ? (
                          <p className="mt-0.5 text-[10px] text-tinta/55">
                            {formatearFechaHoraUTC(c.creado_en)}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Resultado de los 3 borradores */}
        <section
          aria-labelledby="titulo-borradores-campana"
          className="space-y-4 lg:col-span-7"
        >
          {!resultadoCampana ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-tinta/25 bg-white/75 p-10 text-center">
              <Sparkles className="h-8 w-8 text-turquesa" aria-hidden="true" />
              <h2 id="titulo-borradores-campana" className="mt-3 font-editorial text-lg font-bold text-tinta">
                Espacio de revisión de borradores
              </h2>
              <p className="mt-1 max-w-md text-xs text-tinta/75">
                Complete el objetivo y la sede para solicitar a Express la generación de tres propuestas para redes sociales.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-tinta/15 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SedeBadge nombre={resultadoCampana.sede_nombre || resultadoCampana.sede} />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      resultadoCampana.estado === 'Aprobada por el agente'
                        ? 'border-emerald-800/35 bg-emerald-100 text-emerald-950'
                        : 'border-amber-800/35 bg-amber-100 text-amber-950'
                    }`}
                  >
                    {resultadoCampana.estado === 'Aprobada por el agente' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    ) : null}
                    <span>{resultadoCampana.estado || 'Pendiente de aprobación'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {resultadoCampana.id && resultadoCampana.estado !== 'Aprobada por el agente' ? (
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => handleAprobar(resultadoCampana.id)}
                      className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
                    >
                      Aprobar campaña
                    </button>
                  ) : null}
                  <span className="text-xs text-tinta/65">
                    No se publica automáticamente · {resultadoCampana.modelo}
                  </span>
                </div>
              </div>

              {(resultadoCampana.borradores || []).map((b) => (
                <article
                  key={b.id}
                  className="rounded-2xl border border-tinta/15 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-turquesa">
                        Borrador #{b.id} · {b.red_social}
                      </span>
                      <h3 className="mt-0.5 font-editorial text-base font-bold text-tinta">
                        {b.titulo}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-amber-800/30 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                        {resultadoCampana.estado || b.estado || 'Pendiente de aprobación'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopiarTexto(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-tinta px-3 py-1.5 text-xs font-semibold text-white hover:bg-tinta-suave"
                      >
                        {copiadoId === b.id ? (
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

                  <p className="mt-3 whitespace-pre-line rounded-xl border border-tinta/10 bg-marfil/60 p-3.5 text-sm leading-relaxed text-tinta">
                    {b.texto}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
