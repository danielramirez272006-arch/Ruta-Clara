export class ClienteRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listarClientes({ busqueda = '' } = {}, conn = this.pool) {
    let sql = `
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.correo,
        c.preferencia_contacto,
        c.es_ficticio,
        c.creado_en
      FROM clientes c
    `;
    const params = [];

    if (busqueda && busqueda.trim().length > 0) {
      const q = `%${busqueda.trim()}%`;
      sql += ' WHERE (LOWER(c.nombre) LIKE LOWER(?) OR LOWER(COALESCE(c.correo, \'\')) LIKE LOWER(?) OR LOWER(COALESCE(c.telefono, \'\')) LIKE LOWER(?))';
      params.push(q, q, q);
    }

    sql += ' ORDER BY c.id DESC';
    const [clientes] = await conn.execute(sql, params);
    return clientes;
  }

  async obtenerClientePorId(id, conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, nombre, telefono, correo, preferencia_contacto, es_ficticio, creado_en FROM clientes WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async crearCliente(
    {
      nombre,
      telefono = null,
      correo = null,
      preferencia_contacto = 'WhatsApp',
      es_ficticio = 1,
      creado_en
    },
    conn = this.pool
  ) {
    const [result] = await conn.execute(
      `INSERT INTO clientes (nombre, telefono, correo, preferencia_contacto, es_ficticio, creado_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, telefono, correo, preferencia_contacto, es_ficticio ? 1 : 0, creado_en]
    );
    return this.obtenerClientePorId(result.insertId, conn);
  }

  async actualizarCliente(id, campos, conn = this.pool) {
    const sets = [];
    const params = [];

    if (campos.nombre !== undefined) {
      sets.push('nombre = ?');
      params.push(campos.nombre);
    }
    if (campos.telefono !== undefined) {
      sets.push('telefono = ?');
      params.push(campos.telefono);
    }
    if (campos.correo !== undefined) {
      sets.push('correo = ?');
      params.push(campos.correo);
    }
    if (campos.preferencia_contacto !== undefined) {
      sets.push('preferencia_contacto = ?');
      params.push(campos.preferencia_contacto);
    }
    if (campos.es_ficticio !== undefined) {
      sets.push('es_ficticio = ?');
      params.push(campos.es_ficticio ? 1 : 0);
    }

    if (sets.length === 0) {
      return this.obtenerClientePorId(id, conn);
    }

    params.push(id);
    await conn.execute(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.obtenerClientePorId(id, conn);
  }
}
