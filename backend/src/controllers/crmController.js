import { getEnvConfig } from '../config/env.js';
import {
  validarIdNumerico,
  validarClientePayload,
  validarCrearOportunidad,
  validarPreferenciasViaje,
  validarCambioEstadoComercial,
  validarUmbralDias,
  validarCampanaPayload,
  validarNotaOportunidadPayload
} from '../validators/schemas.js';

export class CrmController {
  constructor(crmService) {
    this.crmService = crmService;
  }

  health = async (_req, res) => {
    const env = getEnvConfig();
    let dbConectada = false;
    let dbMensaje = 'Conexión con MySQL verificada correctamente.';
    let totalOportunidades = 0;

    try {
      dbConectada = await this.crmService.catalogoRepo.verificarSaludConexion();
      const ops = await this.crmService.oportunidadRepo.listarOportunidades({});
      totalOportunidades = ops.length;
    } catch {
      dbConectada = false;
      dbMensaje = 'Sin conexión activa a MySQL. Verifique que el servicio MySQL 8.0.16+ esté iniciado y ejecute npm run seed.';
    }

    const deepseekConfigurado = Boolean(env.deepseek.apiKey);
    const claudeConfigurado = Boolean(env.anthropic.apiKey);
    const iaConfigurada = deepseekConfigurado || claudeConfigurado;
    const proveedorActivo = deepseekConfigurado
      ? 'DeepSeek'
      : claudeConfigurado
      ? 'Claude'
      : 'DeepSeek';
    const modeloActivo = deepseekConfigurado
      ? env.deepseek.model
      : claudeConfigurado
      ? env.anthropic.model
      : env.deepseek.model;

    res.status(dbConectada ? 200 : 503).json({
      ok: dbConectada,
      servicio: 'Ruta Clara API REST',
      timestamp_utc: new Date().toISOString(),
      mysql: {
        conectado: dbConectada,
        host: env.db.host,
        port: env.db.port,
        database: env.db.database,
        total_oportunidades: totalOportunidades,
        mensaje: dbMensaje
      },
      ia: {
        proveedor: proveedorActivo,
        configurado: iaConfigurada,
        modelo: modeloActivo,
        mensaje: iaConfigurada
          ? `Clave DEEPSEEK_API_KEY detectada en el servidor Express (${modeloActivo}).`
          : 'DEEPSEEK_API_KEY no configurada en el servidor (.env). Las funciones de IA devolverán un aviso claro sin usar plantillas falsas.'
      },
      claude: {
        configurado: iaConfigurada,
        proveedor: proveedorActivo,
        modelo: modeloActivo,
        mensaje: iaConfigurada
          ? `Clave de IA (${proveedorActivo}) detectada en el servidor Express.`
          : 'DEEPSEEK_API_KEY no configurada en el servidor (.env). Las funciones de IA devolverán un aviso claro sin usar plantillas falsas.'
      }
    });
  };

  listarClientes = async (req, res, next) => {
    try {
      const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda : '';
      const clientes = await this.crmService.listarClientes({ busqueda });
      res.status(200).json({ ok: true, data: clientes });
    } catch (err) {
      next(err);
    }
  };

  obtenerCliente = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const cliente = await this.crmService.obtenerClienteConOportunidades(id);
      res.status(200).json({ ok: true, data: cliente });
    } catch (err) {
      next(err);
    }
  };

  crearCliente = async (req, res, next) => {
    try {
      const payload = validarClientePayload(req.body, false);
      const creado = await this.crmService.crearCliente(payload);
      res.status(201).json({ ok: true, data: creado });
    } catch (err) {
      next(err);
    }
  };

  actualizarCliente = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const payload = validarClientePayload(req.body, true);
      const actualizado = await this.crmService.actualizarCliente(id, payload);
      res.status(200).json({ ok: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  listarProspectos = async (req, res, next) => {
    try {
      const filtros = {
        busqueda: typeof req.query.busqueda === 'string' ? req.query.busqueda : '',
        sede_id: req.query.sede_id ? validarIdNumerico(req.query.sede_id, 'sede_id') : null,
        etapa_id: req.query.etapa_id ? validarIdNumerico(req.query.etapa_id, 'etapa_id') : null,
        cliente_id: req.query.cliente_id ? validarIdNumerico(req.query.cliente_id, 'cliente_id') : null,
        canal: typeof req.query.canal === 'string' ? req.query.canal : '',
        estado_comercial: typeof req.query.estado_comercial === 'string' ? req.query.estado_comercial : ''
      };
      const resultado = await this.crmService.listarOportunidades(filtros);
      res.status(200).json({ ok: true, data: resultado });
    } catch (err) {
      next(err);
    }
  };

  obtenerProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const ficha = await this.crmService.obtenerFichaOportunidad(id);
      res.status(200).json({ ok: true, data: ficha });
    } catch (err) {
      next(err);
    }
  };

  crearProspecto = async (req, res, next) => {
    try {
      const payload = validarCrearOportunidad(req.body);
      const creado = await this.crmService.crearOportunidad(payload);
      res.status(201).json({ ok: true, data: creado });
    } catch (err) {
      next(err);
    }
  };

  avanzarEtapaProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const actualizado = await this.crmService.avanzarEtapa(id, req.body || {});
      res.status(200).json({
        ok: true,
        aviso_crm: 'La etapa fue actualizada en el CRM. Recuerde que este cambio no confirma pagos ni reservas con proveedores.',
        data: actualizado
      });
    } catch (err) {
      next(err);
    }
  };

  editarPreferenciasProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const campos = validarPreferenciasViaje(req.body, true);
      const actualizado = await this.crmService.editarPreferencias(id, campos);
      res.status(200).json({ ok: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  cambiarEstadoProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const cambio = validarCambioEstadoComercial(req.body);
      const actualizado = await this.crmService.cambiarEstadoComercial(id, cambio);
      res.status(200).json({ ok: true, data: actualizado });
    } catch (err) {
      next(err);
    }
  };

  obtenerEmbudo = async (_req, res, next) => {
    try {
      const metricas = await this.crmService.obtenerMetricasEmbudo();
      res.status(200).json({ ok: true, data: metricas });
    } catch (err) {
      next(err);
    }
  };

  obtenerAtencion = async (req, res, next) => {
    try {
      const dias = validarUmbralDias(req.query.dias);
      const cola = await this.crmService.obtenerColaAtencion(dias);
      res.status(200).json({ ok: true, data: cola });
    } catch (err) {
      next(err);
    }
  };

  obtenerResumen = async (req, res, next) => {
    try {
      const dias = validarUmbralDias(req.query.dias);
      const resumen = await this.crmService.obtenerResumenInicio(dias);
      res.status(200).json({ ok: true, data: resumen });
    } catch (err) {
      next(err);
    }
  };

  generarMensajeProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const tono = typeof req.body?.tono === 'string' ? req.body.tono : 'cálido y consultivo';
      const resultado = await this.crmService.generarMensajeIA(id, { tono });
      res.status(200).json({ ok: true, data: resultado });
    } catch (err) {
      next(err);
    }
  };

  agregarNotaProspecto = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const notaPayload = validarNotaOportunidadPayload(req.body);
      const fichaActualizada = await this.crmService.agregarNotaOportunidad(id, notaPayload);
      res.status(201).json({ ok: true, data: fichaActualizada });
    } catch (err) {
      next(err);
    }
  };

  listarCampanas = async (_req, res, next) => {
    try {
      const lista = await this.crmService.listarCampanasGuardadas();
      res.status(200).json({ ok: true, data: lista });
    } catch (err) {
      next(err);
    }
  };

  aprobarCampana = async (req, res, next) => {
    try {
      const id = validarIdNumerico(req.params.id, 'id');
      const lista = await this.crmService.aprobarCampanaGuardada(id);
      res.status(200).json({ ok: true, data: lista });
    } catch (err) {
      next(err);
    }
  };

  generarCampana = async (req, res, next) => {
    try {
      const payload = validarCampanaPayload(req.body);
      const resultado = await this.crmService.generarCampanaIA(payload);
      res.status(200).json({ ok: true, data: resultado });
    } catch (err) {
      next(err);
    }
  };

  exportarDatos = async (_req, res, next) => {
    try {
      const exportacion = await this.crmService.exportarDatosFicticiosJSON();
      res.status(200).json({ ok: true, data: exportacion });
    } catch (err) {
      next(err);
    }
  };
}
