export class CatalogoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listarSedes(conn = this.pool) {
    const [rows] = await conn.execute('SELECT id, nombre FROM sedes ORDER BY id ASC');
    return rows;
  }

  async obtenerSedePorId(id, conn = this.pool) {
    const [rows] = await conn.execute('SELECT id, nombre FROM sedes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async obtenerSedePorNombre(nombre, conn = this.pool) {
    const [rows] = await conn.execute('SELECT id, nombre FROM sedes WHERE LOWER(nombre) = LOWER(?)', [nombre]);
    return rows[0] || null;
  }

  async listarEtapas(conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, nombre, orden, meta_conversion FROM etapas ORDER BY orden ASC'
    );
    return rows;
  }

  async obtenerEtapaPorId(id, conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, nombre, orden, meta_conversion FROM etapas WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async obtenerEtapaPorOrden(orden, conn = this.pool) {
    const [rows] = await conn.execute(
      'SELECT id, nombre, orden, meta_conversion FROM etapas WHERE orden = ?',
      [orden]
    );
    return rows[0] || null;
  }

  async listarMotivosPerdida(conn = this.pool) {
    const [rows] = await conn.execute('SELECT id, nombre FROM motivos_perdida ORDER BY id ASC');
    return rows;
  }

  async obtenerMotivoPerdidaPorId(id, conn = this.pool) {
    const [rows] = await conn.execute('SELECT id, nombre FROM motivos_perdida WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async verificarSaludConexion() {
    const [rows] = await this.pool.execute('SELECT 1 AS ok');
    return rows.length > 0 && Number(rows[0].ok) === 1;
  }
}
