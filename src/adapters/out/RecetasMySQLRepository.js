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
        (id_receta_farmacia, referencia_despacho, farmacia_codigo, medicamento, dosis, cantidad,
         estado, referencia_interna, motivo_rechazo, fecha_recepcion, fecha_limite_retiro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receta.idRecetaFarmacia, receta.referenciaDespacho, receta.farmaciaCodigo,
       receta.medicamento, receta.dosis, receta.cantidad, receta.estado,
       receta.referenciaInterna, receta.motivoRechazo, receta.fechaRecepcion, receta.fechaLimiteRetiro]
    );
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

  _mapToEntity(row) {
    return new RecetaExterna({
      idRecetaFarmacia: row.id_receta_farmacia, referenciaDespacho: row.referencia_despacho,
      farmaciaCodigo: row.farmacia_codigo, medicamento: row.medicamento, dosis: row.dosis,
      cantidad: row.cantidad, estado: row.estado, referenciaInterna: row.referencia_interna,
      motivoRechazo: row.motivo_rechazo, fechaRecepcion: row.fecha_recepcion,
      fechaLimiteRetiro: row.fecha_limite_retiro,
    });
  }
}

module.exports = RecetasMySQLRepository;
