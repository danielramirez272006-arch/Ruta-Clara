import { withTransaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { CatalogoRepository } from '../repositories/catalogoRepository.js';
import { ClienteRepository } from '../repositories/clienteRepository.js';
import { OportunidadRepository } from '../repositories/oportunidadRepository.js';
import {
  calcularMetricasEmbudo,
  calcularColaSeguimientos,
  obtenerSiguienteAccionPorOrden
} from './metricasService.js';

export function fechaActualUTCMySQL() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export class CrmService {
  constructor(pool, claudeIntegration) {
    this.pool = pool;
    this.catalogoRepo = new CatalogoRepository(pool);
    this.clienteRepo = new ClienteRepository(pool);
    this.oportunidadRepo = new OportunidadRepository(pool);
    this.claudeIntegration = claudeIntegration;
  }

  _enriquecerOportunidad(op, ahora = new Date()) {
    if (!op) return null;
    const orden = Number(op.etapa_orden || op.etapa_id);
    const fechaStr = String(op.ultimo_avance_en).includes('T')
      ? op.ultimo_avance_en
      : `${String(op.ultimo_avance_en).replace(' ', 'T')}Z`;
    const diasSinAvance = Math.max(
      0,
      Math.floor((ahora.getTime() - new Date(fechaStr).getTime()) / 86400000)
    );

    const bloqueadaPorPerdida = op.estado_comercial === 'perdida';
    const enUltimaEtapa = orden >= 9;

    return {
      ...op,
      presupuesto_total: Number(op.presupuesto_total),
      viajeros: Number(op.viajeros),
      etapa_orden: orden,
      dias_sin_avance: diasSinAvance,
      siguiente_accion: bloqueadaPorPerdida
        ? 'Oportunidad marcada como perdida. Reábrala si el viajero retoma el interés para desbloquear avances y edición.'
        : obtenerSiguienteAccionPorOrden(orden),
      permisos: {
        puede_avanzar: !bloqueadaPorPerdida && !enUltimaEtapa,
        puede_editar_preferencias: !bloqueadaPorPerdida,
        puede_generar_mensaje_ia: !bloqueadaPorPerdida,
        puede_registrar_perdida: !bloqueadaPorPerdida && !enUltimaEtapa,
        puede_reabrir: bloqueadaPorPerdida
      }
    };
  }

  async listarClientes({ busqueda = '' } = {}) {
    const [clientes, oportunidades] = await Promise.all([
      this.clienteRepo.listarClientes({ busqueda }),
      this.oportunidadRepo.listarOportunidades({})
    ]);

    const ahora = new Date();
    const oportunidadesPorCliente = new Map();
    for (const op of oportunidades) {
      const cId = Number(op.cliente_id);
      if (!oportunidadesPorCliente.has(cId)) {
        oportunidadesPorCliente.set(cId, []);
      }
      oportunidadesPorCliente.get(cId).push(this._enriquecerOportunidad(op, ahora));
    }

    return clientes.map((c) => {
      const lista = oportunidadesPorCliente.get(Number(c.id)) || [];
      return {
        ...c,
        es_ficticio: Boolean(c.es_ficticio),
        total_oportunidades: lista.length,
        oportunidades: lista
      };
    });
  }

  async obtenerClienteConOportunidades(clienteId) {
    const cliente = await this.clienteRepo.obtenerClientePorId(clienteId);
    if (!cliente) {
      throw new AppError(`No se encontró el cliente con ID ${clienteId}.`, 404, 'CLIENTE_NO_ENCONTRADO');
    }

    const oportunidadesRaw = await this.oportunidadRepo.listarOportunidades({ cliente_id: clienteId });
    const ahora = new Date();
    const oportunidades = oportunidadesRaw.map((o) => this._enriquecerOportunidad(o, ahora));

    return {
      ...cliente,
      es_ficticio: Boolean(cliente.es_ficticio),
      total_oportunidades: oportunidades.length,
      oportunidades
    };
  }

  async crearCliente(payload) {
    const creadoEn = fechaActualUTCMySQL();
    const nuevo = await this.clienteRepo.crearCliente({
      nombre: payload.nombre,
      telefono: payload.telefono ?? null,
      correo: payload.correo ?? null,
      preferencia_contacto: payload.preferencia_contacto || 'WhatsApp',
      es_ficticio: payload.es_ficticio ?? 1,
      creado_en: creadoEn
    });
    return {
      ...nuevo,
      es_ficticio: Boolean(nuevo.es_ficticio),
      total_oportunidades: 0,
      oportunidades: []
    };
  }

  async actualizarCliente(clienteId, payload) {
    const existente = await this.clienteRepo.obtenerClientePorId(clienteId);
    if (!existente) {
      throw new AppError(`No se encontró el cliente con ID ${clienteId}.`, 404, 'CLIENTE_NO_ENCONTRADO');
    }
    await this.clienteRepo.actualizarCliente(clienteId, payload);
    return this.obtenerClienteConOportunidades(clienteId);
  }

  async listarOportunidades(filtros = {}) {
    const [oportunidadesRaw, sedes, etapas, motivosPerdida] = await Promise.all([
      this.oportunidadRepo.listarOportunidades(filtros),
      this.catalogoRepo.listarSedes(),
      this.catalogoRepo.listarEtapas(),
      this.catalogoRepo.listarMotivosPerdida()
    ]);

    const ahora = new Date();
    const oportunidades = oportunidadesRaw.map((o) => this._enriquecerOportunidad(o, ahora));

    return {
      oportunidades,
      catalogos: {
        sedes,
        etapas: etapas.map((e) => ({
          ...e,
          siguiente_accion: obtenerSiguienteAccionPorOrden(e.orden)
        })),
        motivos_perdida: motivosPerdida
      }
    };
  }

  async obtenerFichaOportunidad(oportunidadId) {
    const opRaw = await this.oportunidadRepo.obtenerOportunidadPorId(oportunidadId);
    if (!opRaw) {
      throw new AppError(
        `No se encontró la oportunidad de viaje con ID ${oportunidadId}.`,
        404,
        'OPORTUNIDAD_NO_ENCONTRADA'
      );
    }

    const [historialEtapas, eventosComerciales, etapas, notas] = await Promise.all([
      this.oportunidadRepo.listarHistorialDeOportunidad(oportunidadId),
      this.oportunidadRepo.listarEventosDeOportunidad(oportunidadId),
      this.catalogoRepo.listarEtapas(),
      this.oportunidadRepo.listarNotasDeOportunidad(oportunidadId)
    ]);

    const op = this._enriquecerOportunidad(opRaw);
    const siguienteEtapa = etapas.find((e) => Number(e.orden) === Number(op.etapa_orden) + 1) || null;

    // Construir línea de tiempo cronológica unificada (avances de etapa + pérdidas + reaperturas)
    const cronologia = [
      ...historialEtapas.map((h) => ({
        id: `etapa-${h.id}`,
        tipo_registro: 'etapa',
        etapa_id: h.etapa_id,
        etapa_nombre: h.etapa_nombre,
        etapa_orden: h.etapa_orden,
        descripcion: `Alcanzó la etapa ${h.etapa_orden}: ${h.etapa_nombre}`,
        fecha: h.fecha
      })),
      ...eventosComerciales.map((ev) => ({
        id: `evento-${ev.id}`,
        tipo_registro: ev.tipo,
        etapa_id: ev.etapa_id,
        etapa_nombre: ev.etapa_nombre,
        etapa_orden: ev.etapa_orden,
        motivo_perdida_id: ev.motivo_perdida_id,
        motivo_perdida_nombre: ev.motivo_perdida_nombre,
        descripcion:
          ev.tipo === 'perdida'
            ? `Pérdida registrada en "${ev.etapa_nombre}" — Motivo: ${ev.motivo_perdida_nombre}`
            : `Oportunidad reabierta en "${ev.etapa_nombre}" (conserva antigüedad de etapa)`,
        fecha: ev.fecha
      }))
    ].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

    return {
      ...op,
      siguiente_etapa: siguienteEtapa
        ? {
            id: siguienteEtapa.id,
            nombre: siguienteEtapa.nombre,
            orden: siguienteEtapa.orden,
            siguiente_accion: obtenerSiguienteAccionPorOrden(siguienteEtapa.orden),
            aviso_confirmacion: `Pasará de "${op.etapa_nombre}" a "${siguienteEtapa.nombre}". Cambiar una etapa solo actualiza el CRM: no confirma pagos ni reservas con proveedores.`
          }
        : null,
      historial_etapas: historialEtapas,
      eventos_comerciales: eventosComerciales,
      notas_agente: notas,
      cronologia
    };
  }

  async agregarNotaOportunidad(oportunidadId, payloadNota) {
    const op = await this.oportunidadRepo.obtenerOportunidadPorId(oportunidadId);
    if (!op) {
      throw new AppError(
        `No se encontró la oportunidad con ID ${oportunidadId}.`,
        404,
        'OPORTUNIDAD_NO_ENCONTRADA'
      );
    }

    const fechaUTC = fechaActualUTCMySQL();
    await this.oportunidadRepo.crearNotaOportunidad({
      oportunidad_id: oportunidadId,
      autor: payloadNota.autor || 'Asesor Ruta Clara',
      texto: payloadNota.texto,
      fecha: fechaUTC
    });

    return this.obtenerFichaOportunidad(oportunidadId);
  }

  /**
   * Crea una nueva oportunidad en la etapa 1 ("Consulta recibida") junto con su
   * primer registro en historial_etapas dentro de una transacción.
   * Permite asociarla a un cliente existente o crear un cliente nuevo en la misma transacción.
   */
  async crearOportunidad(payload) {
    const nuevaId = await withTransaction(this.pool, async (conn) => {
      const sede = await this.catalogoRepo.obtenerSedePorId(payload.sede_id, conn);
      if (!sede) {
        throw new AppError(`La sede con ID ${payload.sede_id} no existe.`, 400, 'SEDE_NO_EXISTE');
      }

      const etapaInicial = await this.catalogoRepo.obtenerEtapaPorOrden(1, conn);
      if (!etapaInicial) {
        throw new AppError('No se encontró la etapa inicial (orden 1) en el catálogo.', 500, 'CATALOGO_ETAPAS_INCOMPLETO');
      }

      const ahoraUTC = fechaActualUTCMySQL();
      let clienteId = payload.cliente_id;

      if (clienteId) {
        const clienteExistente = await this.clienteRepo.obtenerClientePorId(clienteId, conn);
        if (!clienteExistente) {
          throw new AppError(`El cliente con ID ${clienteId} no existe.`, 404, 'CLIENTE_NO_ENCONTRADO');
        }
      } else {
        const nuevoCliente = await this.clienteRepo.crearCliente(
          {
            nombre: payload.nuevo_cliente.nombre,
            es_ficticio: payload.nuevo_cliente.es_ficticio ?? 1,
            creado_en: ahoraUTC
          },
          conn
        );
        clienteId = nuevoCliente.id;
      }

      const oportunidadId = await this.oportunidadRepo.crearOportunidad(
        {
          cliente_id: clienteId,
          sede_id: payload.sede_id,
          etapa_id: etapaInicial.id,
          destino: payload.destino,
          presupuesto_total: payload.presupuesto_total,
          moneda: payload.moneda,
          viajeros: payload.viajeros,
          fecha_salida: payload.fecha_salida,
          canal: payload.canal,
          estado_comercial: 'abierta',
          motivo_perdida_id: null,
          creado_en: ahoraUTC,
          ultimo_avance_en: ahoraUTC,
          editado_en: ahoraUTC
        },
        conn
      );

      await this.oportunidadRepo.registrarHistorialEtapa(
        {
          oportunidad_id: oportunidadId,
          etapa_id: etapaInicial.id,
          fecha: ahoraUTC
        },
        conn
      );

      return oportunidadId;
    });

    return this.obtenerFichaOportunidad(nuevaId);
  }

  /**
   * Edita las preferencias del viaje sin reiniciar ultimo_avance_en.
   * Bloqueado si la oportunidad está perdida.
   */
  async editarPreferencias(oportunidadId, camposPreferencias) {
    await withTransaction(this.pool, async (conn) => {
      const actual = await this.oportunidadRepo.obtenerOportunidadParaActualizar(oportunidadId, conn);
      if (!actual) {
        throw new AppError(
          `No se encontró la oportunidad con ID ${oportunidadId}.`,
          404,
          'OPORTUNIDAD_NO_ENCONTRADA'
        );
      }

      if (actual.estado_comercial === 'perdida') {
        throw new AppError(
          'No se pueden editar las preferencias de una oportunidad perdida. Reábrala primero.',
          409,
          'OPORTUNIDAD_PERDIDA_BLOQUEADA'
        );
      }

      if (camposPreferencias.sede_id !== undefined) {
        const sede = await this.catalogoRepo.obtenerSedePorId(camposPreferencias.sede_id, conn);
        if (!sede) {
          throw new AppError(`La sede con ID ${camposPreferencias.sede_id} no existe.`, 400, 'SEDE_NO_EXISTE');
        }
      }

      const editadoEnUTC = fechaActualUTCMySQL();
      await this.oportunidadRepo.actualizarPreferencias(oportunidadId, camposPreferencias, editadoEnUTC, conn);
    });

    return this.obtenerFichaOportunidad(oportunidadId);
  }

  /**
   * Avanza una oportunidad EXACTAMENTE a la siguiente etapa inmediata (orden + 1).
   * - Utiliza transacción y bloqueo de fila FOR UPDATE.
   * - Bloquea avances si la oportunidad está perdida o ya se encuentra en la etapa 9.
   * - Si el cliente envía etapa_id / orden destino y no corresponde a orden + 1, rechaza con 400.
   */
  async avanzarEtapa(oportunidadId, body = {}, opcionesPrueba = {}) {
    await withTransaction(this.pool, async (conn) => {
      const actual = await this.oportunidadRepo.obtenerOportunidadParaActualizar(oportunidadId, conn);
      if (!actual) {
        throw new AppError(
          `No se encontró la oportunidad con ID ${oportunidadId}.`,
          404,
          'OPORTUNIDAD_NO_ENCONTRADA'
        );
      }

      if (actual.estado_comercial === 'perdida') {
        throw new AppError(
          'La oportunidad está marcada como perdida. Debe reabrirla antes de avanzar de etapa.',
          409,
          'OPORTUNIDAD_PERDIDA_BLOQUEADA'
        );
      }

      const ordenActual = Number(actual.etapa_orden);
      if (ordenActual >= 9) {
        throw new AppError(
          'La oportunidad ya se encuentra en la última etapa del embudo (Seguimiento posviaje).',
          409,
          'ULTIMA_ETAPA_ALCANZADA'
        );
      }

      const siguienteOrden = ordenActual + 1;
      const siguienteEtapa = await this.catalogoRepo.obtenerEtapaPorOrden(siguienteOrden, conn);
      if (!siguienteEtapa) {
        throw new AppError('No existe la siguiente etapa en el catálogo.', 500, 'ETAPA_SIGUIENTE_NO_ENCONTRADA');
      }

      // Si el cliente especificó explícitamente una etapa destino, validar que sea estrictamente la siguiente
      if (body && body.etapa_id !== undefined && body.etapa_id !== null && body.etapa_id !== '') {
        if (Number(body.etapa_id) !== Number(siguienteEtapa.id)) {
          throw new AppError(
            `Solo se permite avanzar secuencialmente a la siguiente etapa inmediata ("${siguienteEtapa.nombre}"). No se permite saltar ni retroceder etapas.`,
            400,
            'AVANCE_NO_SECUENCIAL'
          );
        }
      }

      const ahoraUTC = fechaActualUTCMySQL();
      const nuevoEstado = Number(siguienteEtapa.orden) === 9 ? 'cerrada' : 'abierta';

      await this.oportunidadRepo.actualizarEtapa(
        oportunidadId,
        {
          nuevaEtapaId: siguienteEtapa.id,
          nuevoEstadoComercial: nuevoEstado,
          fechaUTC: ahoraUTC
        },
        conn
      );

      // Gancho opcional para verificar reversión atómica de transacciones en pruebas automatizadas
      if (opcionesPrueba.simularFalloDespuesDeUpdate) {
        throw new Error('Fallo simulado antes de registrar historial para comprobar ROLLBACK transaccional');
      }

      await this.oportunidadRepo.registrarHistorialEtapa(
        {
          oportunidad_id: oportunidadId,
          etapa_id: siguienteEtapa.id,
          fecha: ahoraUTC
        },
        conn
      );
    });

    return this.obtenerFichaOportunidad(oportunidadId);
  }

  /**
   * Registra pérdida con motivo o reapertura conservando la etapa, el historial y la antigüedad (ultimo_avance_en).
   */
  async cambiarEstadoComercial(oportunidadId, cambioValidado) {
    await withTransaction(this.pool, async (conn) => {
      const actual = await this.oportunidadRepo.obtenerOportunidadParaActualizar(oportunidadId, conn);
      if (!actual) {
        throw new AppError(
          `No se encontró la oportunidad con ID ${oportunidadId}.`,
          404,
          'OPORTUNIDAD_NO_ENCONTRADA'
        );
      }

      const ahoraUTC = fechaActualUTCMySQL();

      if (cambioValidado.tipo === 'perdida') {
        if (actual.estado_comercial === 'perdida') {
          throw new AppError(
            'La oportunidad ya se encuentra registrada como perdida.',
            409,
            'OPORTUNIDAD_YA_PERDIDA'
          );
        }

        const motivo = await this.catalogoRepo.obtenerMotivoPerdidaPorId(cambioValidado.motivo_perdida_id, conn);
        if (!motivo) {
          throw new AppError(
            `El motivo de pérdida con ID ${cambioValidado.motivo_perdida_id} no existe en el catálogo.`,
            400,
            'MOTIVO_PERDIDA_INVALIDO'
          );
        }

        await this.oportunidadRepo.actualizarEstadoComercial(
          oportunidadId,
          {
            estado_comercial: 'perdida',
            motivo_perdida_id: motivo.id,
            fechaUTC: ahoraUTC
          },
          conn
        );

        await this.oportunidadRepo.registrarEventoComercial(
          {
            oportunidad_id: oportunidadId,
            etapa_id: actual.etapa_id,
            tipo: 'perdida',
            motivo_perdida_id: motivo.id,
            fecha: ahoraUTC
          },
          conn
        );
      } else {
        // Reapertura
        if (actual.estado_comercial !== 'perdida') {
          throw new AppError(
            'Solo se puede reabrir una oportunidad que esté actualmente marcada como perdida.',
            409,
            'OPORTUNIDAD_NO_ESTA_PERDIDA'
          );
        }

        const estadoAlReabrir = Number(actual.etapa_orden) === 9 ? 'cerrada' : 'abierta';

        await this.oportunidadRepo.actualizarEstadoComercial(
          oportunidadId,
          {
            estado_comercial: estadoAlReabrir,
            motivo_perdida_id: null,
            fechaUTC: ahoraUTC
          },
          conn
        );

        await this.oportunidadRepo.registrarEventoComercial(
          {
            oportunidad_id: oportunidadId,
            etapa_id: actual.etapa_id,
            tipo: 'reapertura',
            motivo_perdida_id: null,
            fecha: ahoraUTC
          },
          conn
        );
      }
    });

    return this.obtenerFichaOportunidad(oportunidadId);
  }

  async obtenerMetricasEmbudo() {
    const [etapas, oportunidades, historialEtapas, motivosPerdida] = await Promise.all([
      this.catalogoRepo.listarEtapas(),
      this.oportunidadRepo.listarOportunidades({}),
      this.oportunidadRepo.listarTodoHistorialEtapas(),
      this.catalogoRepo.listarMotivosPerdida()
    ]);

    return calcularMetricasEmbudo({
      etapas,
      oportunidades,
      historialEtapas,
      motivosPerdida
    });
  }

  async obtenerColaAtencion(umbralDias = 7) {
    const oportunidades = await this.oportunidadRepo.listarOportunidades({});
    const cola = calcularColaSeguimientos(oportunidades, umbralDias, new Date());

    return {
      umbral_dias: umbralDias,
      umbral_prioridad_alta: umbralDias * 2,
      total_pendientes: cola.length,
      total_prioridad_alta: cola.filter((i) => i.es_prioridad_alta).length,
      seguimientos: cola
    };
  }

  async obtenerResumenInicio(umbralDias = 7) {
    const [metricas, colaAtencion, oportunidades, sedes] = await Promise.all([
      this.obtenerMetricasEmbudo(),
      this.obtenerColaAtencion(umbralDias),
      this.oportunidadRepo.listarOportunidades({}),
      this.catalogoRepo.listarSedes()
    ]);

    // 1. Oportunidades activas: estado_comercial === 'abierta' y orden < 9
    const oportunidadesActivas = oportunidades.filter(
      (o) => o.estado_comercial === 'abierta' && Number(o.etapa_orden) < 9
    ).length;

    // 2. Reservas alcanzadas: oportunidades cuyo historial alcanzó la etapa 7 ("Reserva confirmada")
    const etapaReserva = metricas.etapas.find((e) => Number(e.orden) === 7);
    const reservasAlcanzadas = etapaReserva ? etapaReserva.alcanzaron : 0;

    // 3. Viajes cerrados: oportunidades que completaron el ciclo en la etapa 9 ("Seguimiento posviaje")
    const etapaPosviaje = metricas.etapas.find((e) => Number(e.orden) === 9);
    const viajesCerrados = etapaPosviaje ? etapaPosviaje.actuales : 0;

    // 4. Pérdidas confirmadas
    const perdidasConfirmadas = metricas.perdidas_confirmadas.total;

    // 5. Distribución por canal
    const canalesBase = ['Instagram', 'Referido', 'Web', 'WhatsApp'];
    const mapaCanales = new Map(canalesBase.map((c) => [c, 0]));
    for (const op of oportunidades) {
      mapaCanales.set(op.canal, (mapaCanales.get(op.canal) || 0) + 1);
    }
    const totalOp = oportunidades.length || 1;
    const distribucionCanal = Array.from(mapaCanales.entries()).map(([canal, cantidad]) => ({
      canal,
      cantidad,
      porcentaje: (cantidad / totalOp) * 100
    }));

    // 6. Distribución por sede
    const distribucionSede = sedes.map((s) => {
      const cantidad = oportunidades.filter((o) => Number(o.sede_id) === Number(s.id)).length;
      return {
        sede_id: s.id,
        sede_nombre: s.nombre,
        cantidad,
        porcentaje: (cantidad / totalOp) * 100
      };
    });

    return {
      kpis: {
        total_oportunidades: oportunidades.length,
        oportunidades_activas: oportunidadesActivas,
        reservas_alcanzadas: reservasAlcanzadas,
        viajes_cerrados: viajesCerrados,
        perdidas_confirmadas: perdidasConfirmadas
      },
      resumen_embudo: metricas.etapas,
      mayor_brecha: metricas.mayor_brecha,
      seguimientos_pendientes: {
        umbral_dias: colaAtencion.umbral_dias,
        total: colaAtencion.total_pendientes,
        prioridad_alta: colaAtencion.total_prioridad_alta,
        destacados: colaAtencion.seguimientos.slice(0, 6)
      },
      distribucion_canal: distribucionCanal,
      distribucion_sede: distribucionSede,
      perdidas_detalle: metricas.perdidas_confirmadas
    };
  }

  async generarMensajeIA(oportunidadId, opciones = {}) {
    const op = await this.obtenerFichaOportunidad(oportunidadId);

    if (op.estado_comercial === 'perdida') {
      throw new AppError(
        'No se puede generar un mensaje con IA para una oportunidad marcada como perdida. Reábrala primero si el viajero retomó el contacto.',
        409,
        'OPORTUNIDAD_PERDIDA_BLOQUEADA'
      );
    }

    return this.claudeIntegration.generarMensajeSeguimiento(op, opciones);
  }

  async listarCampanasGuardadas() {
    return this.oportunidadRepo.listarCampanasGuardadas();
  }

  async aprobarCampanaGuardada(campanaId) {
    await this.oportunidadRepo.actualizarEstadoCampana(campanaId, 'Aprobada por el agente');
    return this.oportunidadRepo.listarCampanasGuardadas();
  }

  async generarCampanaIA(payloadValidado) {
    let nombreSede = payloadValidado.sede_nombre;
    let idSede = payloadValidado.sede_id || 1;
    if (payloadValidado.sede_id) {
      const sede = await this.catalogoRepo.obtenerSedePorId(payloadValidado.sede_id);
      if (!sede) {
        throw new AppError(`La sede con ID ${payloadValidado.sede_id} no existe.`, 400, 'SEDE_NO_EXISTE');
      }
      nombreSede = sede.nombre;
      idSede = sede.id;
    } else if (nombreSede) {
      const sedePorNombre = await this.catalogoRepo.obtenerSedePorNombre(nombreSede);
      if (!sedePorNombre) {
        throw new AppError(
          `La sede '${nombreSede}' no existe en el catálogo (use Desamparados o Puntarenas).`,
          400,
          'SEDE_NO_EXISTE'
        );
      }
      nombreSede = sedePorNombre.nombre;
      idSede = sedePorNombre.id;
    }

    const generada = await this.claudeIntegration.generarBorradoresCampana({
      objetivo: payloadValidado.objetivo,
      sede: nombreSede
    });

    const idGuardada = await this.oportunidadRepo.guardarCampanaGenerada({
      sede_id: idSede,
      sede_nombre: nombreSede,
      objetivo: payloadValidado.objetivo,
      proveedor: generada.proveedor,
      modelo: generada.modelo,
      estado: generada.estado,
      borradores: generada.borradores,
      creado_en: fechaActualUTCMySQL()
    });

    return {
      ...generada,
      id: idGuardada
    };
  }

  async exportarDatosFicticiosJSON() {
    const [sedes, etapas, motivosPerdida, clientes, oportunidades, historialEtapas, eventosComerciales] =
      await Promise.all([
        this.catalogoRepo.listarSedes(),
        this.catalogoRepo.listarEtapas(),
        this.catalogoRepo.listarMotivosPerdida(),
        this.clienteRepo.listarClientes({}),
        this.oportunidadRepo.listarOportunidades({}),
        this.oportunidadRepo.listarTodoHistorialEtapas(),
        this.oportunidadRepo.listarTodosEventosComerciales()
      ]);

    return {
      proyecto: 'Ruta Clara — CRM para agentes de viajes',
      exportado_en_utc: new Date().toISOString(),
      aviso_privacidad: 'Todos los registros de clientes y oportunidades marcados con es_ficticio=1 son datos académicos demostrativos.',
      catalogos: {
        sedes,
        etapas,
        motivos_perdida: motivosPerdida
      },
      datos: {
        clientes,
        oportunidades,
        historial_etapas: historialEtapas,
        eventos_comerciales: eventosComerciales
      }
    };
  }
}
