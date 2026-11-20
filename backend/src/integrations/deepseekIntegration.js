import { AppError } from '../middleware/errorHandler.js';
import { getEnvConfig } from '../config/env.js';

export function contarPalabras(texto) {
  if (!texto || typeof texto !== 'string') return 0;
  return texto
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Construye el prompt para la IA (DeepSeek / Claude) garantizando privacidad:
 * Incluye ÚNICAMENTE: Etapa, Sede, Siguiente acción, Destino, Presupuesto y moneda,
 * Número de viajeros y Fecha preferida.
 * NO incluye nombres de clientes, correos, teléfonos ni identificadores personales.
 */
export function construirPromptMensajeOportunidad({
  etapa,
  sede,
  siguiente_accion,
  destino,
  presupuesto_total,
  moneda,
  viajeros,
  fecha_salida,
  tono = 'cálido y consultivo'
}) {
  return [
    'Eres un asistente editorial para un asesor de la agencia de viajes boutique "Ruta Clara".',
    'Redacta un mensaje breve en español para que el asesor lo revise antes de enviarlo a un viajero.',
    '',
    'CONTEXTO OPERATIVO DE LA OPORTUNIDAD (sin datos personales):',
    `- Etapa actual en el embudo: ${etapa}`,
    `- Sede de atención: ${sede}`,
    `- Siguiente acción recomendada: ${siguiente_accion}`,
    `- Destino de interés: ${destino}`,
    `- Presupuesto declarado: ${Number(presupuesto_total).toFixed(2)} ${moneda}`,
    `- Número de viajeros: ${viajeros}`,
    `- Fecha preferida de salida: ${fecha_salida}`,
    `- Tono solicitado por el asesor: ${tono}`,
    '',
    'REGLAS ESTRICTAS DE REDACCIÓN:',
    `1. Escribe exclusivamente en español, con tono ${tono}, profesional y claro.`,
    '2. Extensión máxima obligatoria: 100 palabras.',
    '3. NO inventes precios, tarifas adicionales, descuentos, cupos, disponibilidad de vuelos/hoteles, requisitos migratorios, visados, confirmaciones de pago ni reservas.',
    '4. No incluyas nombres propios ni datos de contacto; usa un saludo cordial neutro (por ejemplo: "Hola, un gusto saludarle desde Ruta Clara...").',
    '5. Entrega únicamente el cuerpo del mensaje listo para revisión humana.'
  ].join('\n');
}

export function construirPromptCampana({ objetivo, sede }) {
  return [
    'Eres el estratega de comunicación de la agencia de viajes boutique "Ruta Clara" (lema: "Cada viaje, un camino claro").',
    'Genera exactamente 3 borradores distintos para redes sociales en español.',
    '',
    'DATOS DE LA CAMPAÑA:',
    `- Sede: ${sede}`,
    `- Objetivo comercial: ${objetivo}`,
    '',
    'REGLAS ESTRICTAS:',
    '1. Devuelve exclusivamente un objeto JSON válido con la propiedad "borradores", que sea un arreglo de 3 objetos.',
    '2. Cada objeto debe tener: "red_social" (ej. "Instagram", "Facebook", "Historia / Reel"), "titulo" y "texto" (máximo 90 palabras cada texto).',
    '3. NO inventes precios, descuentos porcentuales, disponibilidad garantizada, requisitos migratorios ni promociones engañosas.',
    '4. Mantén un estilo boutique, inspirador y transparente.'
  ].join('\n');
}

/**
 * Cliente de integración con IA (DeepSeek por defecto, o Claude si se configura),
 * llamado exclusivamente desde Express.
 * Si falta DEEPSEEK_API_KEY (y ANTHROPIC_API_KEY), devuelve un error claro 503
 * y NUNCA presenta plantillas prefabricadas como IA real.
 */
export class DeepSeekIntegration {
  constructor(customFetch = globalThis.fetch) {
    this.fetchImpl = customFetch;
  }

  _obtenerConfiguracionActiva() {
    const { deepseek, anthropic } = getEnvConfig();

    if (deepseek.apiKey) {
      return {
        proveedor: 'DeepSeek',
        tipo: 'deepseek',
        apiKey: deepseek.apiKey,
        model: deepseek.model,
        baseUrl: deepseek.baseUrl
      };
    }

    if (anthropic.apiKey) {
      return {
        proveedor: 'Claude',
        tipo: 'anthropic',
        apiKey: anthropic.apiKey,
        model: anthropic.model
      };
    }

    throw new AppError(
      'La clave DEEPSEEK_API_KEY no está configurada en el servidor Express (.env). Configúrela en el backend para habilitar la redacción con DeepSeek. Por transparencia académica, no se devuelven plantillas prefabricadas como si fueran respuestas reales de IA.',
      503,
      'IA_API_KEY_FALTANTE'
    );
  }

  async _llamarProveedorIA(prompt, maxTokens = 350) {
    const config = this._obtenerConfiguracionActiva();

    if (config.tipo === 'deepseek') {
      let response;
      try {
        response = await this.fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              {
                role: 'system',
                content: 'Eres un asistente comercial experto en turismo boutique de Ruta Clara. Respondes siempre en español claro y conciso.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });
      } catch {
        throw new AppError(
          'No fue posible conectar con el servicio de DeepSeek. Verifique la conexión de red del servidor Express.',
          502,
          'IA_ERROR_RED'
        );
      }

      if (!response.ok) {
        throw new AppError(
          `El proveedor de IA (DeepSeek) devolvió un error (HTTP ${response.status}). Verifique la validez de DEEPSEEK_API_KEY y el saldo/modelo en el servidor.`,
          502,
          'IA_PROVEEDOR_ERROR'
        );
      }

      const data = await response.json();
      const texto = data?.choices?.[0]?.message?.content?.trim();
      if (!texto) {
        throw new AppError(
          'DeepSeek devolvió una respuesta vacía o con formato no reconocido.',
          502,
          'IA_RESPUESTA_INVALIDA'
        );
      }

      return {
        texto,
        modelo: data.model || config.model,
        proveedor: 'DeepSeek'
      };
    }

    // Respaldo compatible si el usuario colocó ANTHROPIC_API_KEY
    let response;
    try {
      response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    } catch {
      throw new AppError(
        'No fue posible conectar con el servicio de IA. Verifique la conexión de red del servidor Express.',
        502,
        'IA_ERROR_RED'
      );
    }

    if (!response.ok) {
      throw new AppError(
        `El proveedor de IA devolvió un error (HTTP ${response.status}). Verifique la validez de la clave API en el servidor.`,
        502,
        'IA_PROVEEDOR_ERROR'
      );
    }

    const data = await response.json();
    const texto = data?.content?.[0]?.text?.trim();
    if (!texto) {
      throw new AppError(
        'El proveedor de IA devolvió una respuesta vacía o con formato no reconocido.',
        502,
        'IA_RESPUESTA_INVALIDA'
      );
    }

    return {
      texto,
      modelo: data.model || config.model,
      proveedor: 'Claude'
    };
  }

  async generarMensajeSeguimiento(contextoOportunidad, opciones = {}) {
    const tono =
      typeof opciones.tono === 'string' && opciones.tono.trim().length > 0
        ? opciones.tono.trim()
        : 'cálido y consultivo';

    const promptSeguro = construirPromptMensajeOportunidad({
      etapa: contextoOportunidad.etapa_nombre,
      sede: contextoOportunidad.sede_nombre,
      siguiente_accion: contextoOportunidad.siguiente_accion,
      destino: contextoOportunidad.destino,
      presupuesto_total: contextoOportunidad.presupuesto_total,
      moneda: contextoOportunidad.moneda,
      viajeros: contextoOportunidad.viajeros,
      fecha_salida: contextoOportunidad.fecha_salida,
      tono
    });

    const { texto, modelo, proveedor } = await this._llamarProveedorIA(promptSeguro, 300);

    // Garantizar límite máximo de 100 palabras
    const palabras = texto.split(/\s+/).filter(Boolean);
    const mensajeRecortado = palabras.length > 100
      ? `${palabras.slice(0, 100).join(' ')}...`
      : texto;

    return {
      mensaje: mensajeRecortado,
      palabras: contarPalabras(mensajeRecortado),
      estado_aprobacion: 'Pendiente de aprobación humana',
      proveedor,
      modelo,
      contexto_enviado: {
        etapa: contextoOportunidad.etapa_nombre,
        sede: contextoOportunidad.sede_nombre,
        siguiente_accion: contextoOportunidad.siguiente_accion,
        destino: contextoOportunidad.destino,
        presupuesto_total: Number(contextoOportunidad.presupuesto_total),
        moneda: contextoOportunidad.moneda,
        viajeros: Number(contextoOportunidad.viajeros),
        fecha_salida: contextoOportunidad.fecha_salida
      },
      aviso: 'Este borrador requiere revisión del asesor. No envía mensajes por WhatsApp ni confirma precios, cupos, pagos o reservas.'
    };
  }

  async generarBorradoresCampana({ objetivo, sede }) {
    const prompt = construirPromptCampana({ objetivo, sede });
    const { texto, modelo, proveedor } = await this._llamarProveedorIA(prompt, 700);

    let borradores = [];
    try {
      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : texto);
      if (Array.isArray(parsed.borradores) && parsed.borradores.length >= 3) {
        borradores = parsed.borradores.slice(0, 3).map((b, idx) => ({
          id: idx + 1,
          red_social: String(b.red_social || `Borrador ${idx + 1}`),
          titulo: String(b.titulo || `Propuesta ${idx + 1} - Sede ${sede}`),
          texto: String(b.texto || '').trim(),
          estado: 'Pendiente de aprobación'
        }));
      }
    } catch {
      const bloques = texto
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean);

      const redes = ['Instagram Post', 'Historia / Reel', 'Facebook / Comunidad'];
      borradores = [0, 1, 2].map((i) => ({
        id: i + 1,
        red_social: redes[i],
        titulo: `Propuesta ${i + 1} — Sede ${sede}`,
        texto: bloques[i] || texto,
        estado: 'Pendiente de aprobación'
      }));
    }

    return {
      objetivo,
      sede,
      estado: 'Pendiente de aprobación',
      publicado_automaticamente: false,
      proveedor,
      modelo,
      borradores
    };
  }
}

export { DeepSeekIntegration as ClaudeIntegration };
