import React, { useState } from 'react';
import {
  Megaphone,
  Sparkles,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import {
  BrandRouteDivider,
  SedeBadge,
  AlertBanner
} from '../../components/ui/BrandComponents.jsx';
import { SEDES_LISTA } from '../../utils/formatters.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function CampanasView({ catalogos, onGenerarCampana }) {
  const sedes = catalogos?.sedes?.length ? catalogos.sedes : SEDES_LISTA;

  // Conservamos datos del formulario cuando falle una solicitud
  const [objetivo, setObjetivo] = useState(
    'Impulsar escapadas culturales y gastronómicas a Oaxaca y Madrid para viajeros en pareja durante la próxima temporada.'
  );
  const [sedeId, setSedeId] = useState(String(sedes[0]?.id || 1));
  const [resultadoCampana, setResultadoCampana] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  const {
    cargando,
    error,
    limpiarMensajes,
    ejecutar
  } = useAsyncAction();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ejecutar(async () => {
        const res = await onGenerarCampana({
          objetivo,
          sede_id: Number(sedeId)
        });
        setResultadoCampana(res);
      });
    } catch {
      // El hook mantiene el mensaje de error claro y el formulario conserva objetivo y sedeId
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
              Generador de campañas para redes sociales
            </h1>
            <p className="mt-1 text-sm text-tinta/75">
              Genere tres borradores mediante DeepSeek (vía Express) según el objetivo comercial y la sede. Todos los textos quedan en estado <strong>&ldquo;Pendiente de aprobación&rdquo;</strong> y nunca se publican automáticamente.
            </p>
          </div>
        </div>
        <BrandRouteDivider className="mt-4" label="Revisión humana obligatoria" />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulario con objetivo y sede */}
        <section
          aria-labelledby="titulo-form-campana"
          className="rounded-2xl border border-tinta/15 bg-white p-6 shadow-sm lg:col-span-5"
        >
          <h2 id="titulo-form-campana" className="font-editorial text-lg font-bold text-tinta">
            Configurar campaña
          </h2>
          <p className="mt-1 text-xs text-tinta/70">
            Claude redactará tres propuestas sin inventar precios, descuentos, disponibilidad ni requisitos migratorios.
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
                Si <code>ANTHROPIC_API_KEY</code> no está configurada en el servidor Express, el sistema mostrará un error explícito en lugar de simular borradores con plantillas prefabricadas.
              </p>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-tinta-suave disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-coral" aria-hidden="true" />
              <span>
                {cargando ? 'Generando 3 borradores con Claude...' : 'Generar tres borradores con IA'}
              </span>
            </button>
          </form>
        </section>

        {/* Resultado de los 3 borradores */}
        <section
          aria-labelledby="titulo-borradores-campana"
          className="space-y-4 lg:col-span-7"
        >
          {error ? (
            <AlertBanner
              tipo="aviso"
              titulo="No se pudieron generar los borradores con Claude"
              mensaje={error}
              onClose={limpiarMensajes}
            />
          ) : null}

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
                <div className="flex items-center gap-2">
                  <SedeBadge nombre={resultadoCampana.sede} />
                  <span className="rounded-full border border-amber-800/35 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
                    {resultadoCampana.estado || 'Pendiente de aprobación'}
                  </span>
                </div>
                <span className="text-xs text-tinta/65">
                  No se publica automáticamente · Modelo: {resultadoCampana.modelo}
                </span>
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
                        {b.estado || 'Pendiente de aprobación'}
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
