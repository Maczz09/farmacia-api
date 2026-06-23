class IRecetasRepository {
  async findByReferenciaDespacho(referenciaDespacho) { throw new Error('No implementado'); }
  async save(receta) { throw new Error('No implementado'); }
  async findAceptadasVencidas(diasLimite) { throw new Error('No implementado'); }
  async actualizarEstado(idRecetaFarmacia, nuevoEstado) { throw new Error('No implementado'); }
}
module.exports = IRecetasRepository;
