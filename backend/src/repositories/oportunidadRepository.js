export class OportunidadRepository {
  constructor(pool) {
    this.pool = pool;
  }

  _baseSelectQuery() {
    return `
      SELECT
        o.id,
        o.cliente_id,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        c.correo AS cliente_correo,
        c.preferencia_contacto AS cliente_preferencia_contacto,
        c.es_ficticio AS cliente_es_ficticio,
        o.sede_id,
        s.nombre AS sede_nombre,
        o.etapa_id,
        e.nombre AS etapa_nombre,
        e.orden AS etapa_orden,
        e.meta_conversion AS etapa_meta_conversion,
        o.destino,
        o.presupuesto_total,
        o.moneda,
        o.viajeros,
        o.fecha_salida,
        o.canal,
        o.estado_comercial,
        o.motivo_perdida_id,
        mp.nombre AS motivo_perdida_nombre,
        o.creado_en,
        o.ultimo_avance_en,
        o.editado_en
      FROM oportunidades o
      INNER JOIN clientes c ON c.id = o.cliente_id
      INNER JOIN sedes s ON s.id = o.sede_id
      INNER JOIN etapas e ON e.id = o.etapa_id
      LEFT JOIN motivos_perdida mp ON mp.id = o.motivo_perdida_id
    `;
  }

  async listarOportunidades(filtros = {}, conn = this.pool) {
    const where = [];
    const params = [];

    if (filtros.cliente_id) {
      where.push('o.cliente_id = ?');
      params.push(Number(filtros.cliente_id));
    }

    if (filtros.sede_id) {
      where.push('o.sede_id = ?');
      params.push(Number(filtros.sede_id));
    }

    if (filtros.etapa_id) {
      where.push('o.etapa_id = ?');
      params.push(Number(filtros.etapa_id));
    }

    if (filtros.canal) {
      where.push('o.canal = ?');
      params.push(filtros.canal.trim());
    }

    if (filtros.estado_comercial) {
      where.push('o.estado_comercial = ?');
      params.push(filtros.estado_comercial.trim().toLowerCase());
    }

    if (filtros.busqueda && filtros.busqueda.trim().length > 0) {
      const q = `%${filtros.busqueda.trim()}%`;
      where.push('(LOWER(c.nombre) LIKE LOWER(?) OR LOWER(o.destino) LIKE LOWER(?))');
      params.push(q, q);
    }

    let sql = this._baseSelectQuery();
    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }
    sql += ' ORDER BY o.ultimo_avance_en ASC, o.id ASC';

    const [rows] = await conn.execute(sql, params);
    return rows;
  }

  async obtenerOportunidadPorId(id, conn = this.pool) {
    const sql = `${this._baseSelectQuery()} WHERE o.id = ?`;
    const [rows] = await conn.execute(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Bloquea la fila de la oportunidad con FOR UPDATE dentro de una transacción
   * para evitar cambios simultáneos inconsistentes al avanzar de etapa o cambiar estado.
   */
  async obtenerOportunidadParaActualizar(id, conn) {
    const sql = `
      SELECT
        o.id,
        o.cliente_id,
        o.sede_id,
        o.etapa_id,
        e.orden AS etapa_orden,
        e.nombre AS etapa_nombre,
        o.destino,
        o.presupuesto_total,
        o.moneda,
        o.viajeros,
        o.fecha_salida,
        o.canal,
        o.estado_comercial,
        o.motivo_perdida_id,
        o.creado_en,
        o.ultimo_avance_en,
        o.editado_en
      FROM oportunidades o
      INNER JOIN etapas e ON e.id = o.etapa_id
      WHERE o.id = ?
      FOR UPDATE
    `;
    const [rows] = await conn.execute(sql, [id]);
    return rows[0] || null;
  }

  async crearOportunidad(datos, conn) {
    const [result] = await conn.execute(
      `INSERT INTO oportunidades (
        cliente_id, sede_id, etapa_id, destino, presupuesto_total,
        moneda, viajeros, fecha_salida, canal, estado_comercial,
        motivo_perdida_id, creado_en, ultimo_avance_en, editado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.cliente_id,
        datos.sede_id,
        datos.etapa_id,
        datos.destino,
        datos.presupuesto_total,
        datos.moneda,
        datos.viajeros,
        datos.fecha_salida,
        datos.canal,
        datos.estado_comercial || 'abierta',
        datos.motivo_perdida_id ?? null,
        datos.creado_en,
        datos.ultimo_avance_en,
        datos.editado_en
      ]
    );
    return result.insertId;
  }

  /**
   * Actualiza preferencias del viaje sin modificar ultimo_avance_en.
   */
  async actualizarPreferencias(id, campos, editadoEnUTC, conn = this.pool) {
    const sets = [];
    const params = [];

    const permitidos = ['destino', 'presupuesto_total', 'moneda', 'viajeros', 'fecha_salida', 'sede_id', 'canal'];
    for (const key of permitidos) {
      if (campos[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(campos[key]);
      }
    }

    sets.push('editado_en = ?');
    params.push(editadoEnUTC);
    params.push(id);

    await conn.execute(`UPDATE oportunidades SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  async actualizarEtapa(id, { nuevaEtapaId, nuevoEstadoComercial, fechaUTC }, conn) {
    await conn.execute(
      `UPDATE oportunidades
       SET etapa_id = ?, estado_comercial = ?, ultimo_avance_en = ?, editado_en = ?
       WHERE id = ?`,
      [nuevaEtapaId, nuevoEstadoComercial, fechaUTC, fechaUTC, id]
    );
  }

  /**
   * Cambia estado comercial (perdida / abierta) SIN modificar ultimo_avance_en,
   * de modo que al reabrir se conserve intacta la antigüedad de la etapa.
   */
  async actualizarEstadoComercial(id, { estado_comercial, motivo_perdida_id, fechaUTC }, conn) {
    await conn.execute(
      `UPDATE oportunidades
       SET estado_comercial = ?, motivo_perdida_id = ?, editado_en = ?
       WHERE id = ?`,
      [estado_comercial, motivo_perdida_id, fechaUTC, id]
    );
  }

  async registrarHistorialEtapa({ oportunidad_id, etapa_id, fecha }, conn) {
    const [result] = await conn.execute(
      'INSERT INTO historial_etapas (oportunidad_id, etapa_id, fecha) VALUES (?, ?, ?)',
      [oportunidad_id, etapa_id, fecha]
    );
    return result.insertId;
  }

  async listarHistorialDeOportunidad(oportunidadId, conn = this.pool) {
    const [rows] = await conn.execute(
      `SELECT
        h.id,
        h.oportunidad_id,
        h.etapa_id,
        e.nombre AS etapa_nombre,
        e.orden AS etapa_orden,
        h.fecha
      FROM historial_etapas h
      INNER JOIN etapas e ON e.id = h.etapa_id
      WHERE h.oportunidad_id = ?
      ORDER BY e.orden ASC, h.fecha ASC`,
      [oportunidadId]
    );
    return rows;
  }

  async listarTodoHistorialEtapas(conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, oportunidad_id, etapa_id, fecha FROM historial_etapas ORDER BY oportunidad_id ASC, etapa_id ASC'
    );
    return rows;
  }

  async registrarEventoComercial({ oportunidad_id, etapa_id, tipo, motivo_perdida_id = null, fecha }, conn) {
    const [result] = await conn.execute(
      `INSERT INTO eventos_comerciales (oportunidad_id, etapa_id, tipo, motivo_perdida_id, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      [oportunidad_id, etapa_id, tipo, motivo_perdida_id, fecha]
    );
    return result.insertId;
  }

  async listarEventosDeOportunidad(oportunidadId, conn = this.pool) {
    const [rows] = await conn.execute(
      `SELECT
        ev.id,
        ev.oportunidad_id,
        ev.etapa_id,
        e.nombre AS etapa_nombre,
        e.orden AS etapa_orden,
        ev.tipo,
        ev.motivo_perdida_id,
        mp.nombre AS motivo_perdida_nombre,
        ev.fecha
      FROM eventos_comerciales ev
      INNER JOIN etapas e ON e.id = ev.etapa_id
      LEFT JOIN motivos_perdida mp ON mp.id = ev.motivo_perdida_id
      WHERE ev.oportunidad_id = ?
      ORDER BY ev.fecha ASC, ev.id ASC`,
      [oportunidadId]
    );
    return rows;
  }

  async listarTodosEventosComerciales(conn = this.pool) {
    const [rows] = await conn.execute(
      `SELECT
        ev.id,
        ev.oportunidad_id,
        ev.etapa_id,
        ev.tipo,
        ev.motivo_perdida_id,
        mp.nombre AS motivo_perdida_nombre,
        ev.fecha
      FROM eventos_comerciales ev
      LEFT JOIN motivos_perdida mp ON mp.id = ev.motivo_perdida_id
      ORDER BY ev.fecha ASC, ev.id ASC`
    );
    return rows;
  }

  async listarNotasDeOportunidad(oportunidadId, conn = this.pool) {
    try {
      const [rows] = await conn.execute(
        `SELECT id, oportunidad_id, autor, texto, fecha
         FROM notas_oportunidad
         WHERE oportunidad_id = ?
         ORDER BY fecha DESC, id DESC`,
        [oportunidadId]
      );
      return rows;
    } catch {
      return [];
    }
  }

  async crearNotaOportunidad({ oportunidad_id, autor, texto, fecha }, conn = this.pool) {
    const [result] = await conn.execute(
      `INSERT INTO notas_oportunidad (oportunidad_id, autor, texto, fecha)
       VALUES (?, ?, ?, ?)`,
      [oportunidad_id, autor, texto, fecha]
    );
    const [rows] = await conn.execute(
      'SELECT id, oportunidad_id, autor, texto, fecha FROM notas_oportunidad WHERE id = ?',
      [result.insertId]
    );
    return rows[0] || { id: result.insertId, oportunidad_id, autor, texto, fecha };
  }

  async listarCampanasGuardadas(conn = this.pool) {
    try {
      const [rows] = await conn.execute(
        `SELECT id, sede_id, sede_nombre, objetivo, proveedor, modelo, estado, borradores_json, creado_en
         FROM campanas_guardadas
         ORDER BY creado_en DESC, id DESC
         LIMIT 20`
      );
      return rows.map((r) => ({
        ...r,
        borradores:
          typeof r.borradores_json === 'string'
            ? JSON.parse(r.borradores_json)
            : r.borradores_json || []
      }));
    } catch {
      return [];
    }
  }

  async guardarCampanaGenerada(
    { sede_id, sede_nombre, objetivo, proveedor, modelo, estado, borradores, creado_en },
    conn = this.pool
  ) {
    try {
      const [result] = await conn.execute(
        `INSERT INTO campanas_guardadas (sede_id, sede_nombre, objetivo, proveedor, modelo, estado, borradores_json, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sede_id,
          sede_nombre,
          objetivo,
          proveedor || 'DeepSeek',
          modelo || 'deepseek-chat',
          estado || 'Pendiente de aprobación',
          JSON.stringify(borradores || []),
          creado_en
        ]
      );
      return result.insertId;
    } catch {
      return null;
    }
  }

  async actualizarEstadoCampana(campanaId, nuevoEstado, conn = this.pool) {
    await conn.execute('UPDATE campanas_guardadas SET estado = ? WHERE id = ?', [
      nuevoEstado,
      campanaId
    ]);
  }
}
