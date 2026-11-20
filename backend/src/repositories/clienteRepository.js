export class ClienteRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listarClientes({ busqueda = '' } = {}, conn = this.pool) {
    let sql = `
      SELECT
        c.id,
        c.nombre,
        c.es_ficticio,
        c.creado_en
      FROM clientes c
    `;
    const params = [];

    if (busqueda && busqueda.trim().length > 0) {
      sql += ' WHERE LOWER(c.nombre) LIKE LOWER(?)';
      params.push(`%${busqueda.trim()}%`);
    }

    sql += ' ORDER BY c.id DESC';
    const [clientes] = await conn.execute(sql, params);
    return clientes;
  }

  async obtenerClientePorId(id, conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, nombre, es_ficticio, creado_en FROM clientes WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async crearCliente({ nombre, es_ficticio = 1, creado_en }, conn = this.pool) {
    const [result] = await conn.execute(
      'INSERT INTO clientes (nombre, es_ficticio, creado_en) VALUES (?, ?, ?)',
      [nombre, es_ficticio ? 1 : 0, creado_en]
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
