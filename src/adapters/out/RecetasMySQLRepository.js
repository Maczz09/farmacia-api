const RecetaExterna = require('../../domain/RecetaExterna');

class RecetasMySQLRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByReferenciaDespacho(referenciaDespacho) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM recetas_recibidas WHERE referencia_despacho = ? LIMIT 1',
      [referenciaDespacho]
    );
    return rows.length ? this._mapToEntity(rows[0]) : null;
  }

  async save(receta) {
    await this.pool.execute(
      `INSERT INTO recetas_recibidas
        (id_receta_farmacia, referencia_despacho, id_encuentro_clinico, farmacia_codigo,
         medicamento, dosis, cantidad, estado, referencia_interna, motivo_rechazo,
         fecha_recepcion, fecha_limite_retiro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receta.idRecetaFarmacia, receta.referenciaDespacho, receta.idEncuentroClinico,
       receta.farmaciaCodigo, receta.medicamento, receta.dosis, receta.cantidad,
       receta.estado, receta.referenciaInterna, receta.motivoRechazo,
       receta.fechaRecepcion, receta.fechaLimiteRetiro]
    );
  }

  async findAll({ estado, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const where  = estado ? 'WHERE estado = ?' : '';
    const params = estado ? [estado] : [];

    const [[{ total }]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM recetas_recibidas ${where}`, params
    );
    const [rows] = await this.pool.query(
      `SELECT * FROM recetas_recibidas ${where}
       ORDER BY fecha_recepcion DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return { total, page, limit, rows: rows.map((r) => this._mapToEntity(r)) };
  }

  async findById(idRecetaFarmacia) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM recetas_recibidas WHERE id_receta_farmacia = ? LIMIT 1',
      [idRecetaFarmacia]
    );
    return rows.length ? this._mapToEntity(rows[0]) : null;
  }

  async findAceptadasVencidas(diasLimite) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM recetas_recibidas WHERE estado = 'ACEPTADA' AND fecha_limite_retiro <= NOW()`
    );
    return rows.map((r) => this._mapToEntity(r));
  }

  async actualizarEstado(idRecetaFarmacia, nuevoEstado) {
    await this.pool.execute(
      'UPDATE recetas_recibidas SET estado = ? WHERE id_receta_farmacia = ?',
      [nuevoEstado, idRecetaFarmacia]
    );
  }

  async guardarMotivoRechazo(idRecetaFarmacia, motivo) {
    await this.pool.execute(
      'UPDATE recetas_recibidas SET motivo_rechazo = ? WHERE id_receta_farmacia = ?',
      [motivo, idRecetaFarmacia]
    );
  }

  _mapToEntity(row) {
    return new RecetaExterna({
      idRecetaFarmacia: row.id_receta_farmacia, referenciaDespacho: row.referencia_despacho,
      idEncuentroClinico: row.id_encuentro_clinico || null,
      farmaciaCodigo: row.farmacia_codigo, medicamento: row.medicamento, dosis: row.dosis,
      cantidad: row.cantidad, estado: row.estado, referenciaInterna: row.referencia_interna,
      motivoRechazo: row.motivo_rechazo, fechaRecepcion: row.fecha_recepcion,
      fechaLimiteRetiro: row.fecha_limite_retiro,
    });
  }
}

module.exports = RecetasMySQLRepository;
