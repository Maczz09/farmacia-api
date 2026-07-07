const RecetaExterna = require('../domain/RecetaExterna');
const { randomUUID } = require('crypto');
const { recetasProcesadasCounter } = require('../config/metrics');

class ProcesarRecetaUseCase {
  constructor(recetasRepository) {
    this.repo = recetasRepository;
  }

  async ejecutar({ referenciaDespacho, idEncuentroClinico, farmacia, medicamento, dosis, cantidad }) {
    // Idempotencia: si ya se decidió antes para este referenciaDespacho,
    // se devuelve la MISMA decisión — nunca se reevalúa el stock dos veces.
    const existente = await this.repo.findByReferenciaDespacho(referenciaDespacho);
    if (existente) {
      return existente.toRespuestaHTTP();
    }

    const receta = new RecetaExterna({
      idRecetaFarmacia: randomUUID(),
      referenciaDespacho,
      idEncuentroClinico: idEncuentroClinico || null,
      farmaciaCodigo: farmacia,
      medicamento, dosis, cantidad,
    });

    const { hayStock, motivo } = RecetaExterna.evaluarStock({ medicamento, cantidad });
    if (hayStock) {
      receta.aceptar();
    } else {
      receta.rechazarPorStock(motivo);
    }
    recetasProcesadasCounter.inc({ resultado: hayStock ? 'aceptada' : 'rechazada_stock' });

    await this.repo.save(receta);
    return receta.toRespuestaHTTP();
  }
}

module.exports = ProcesarRecetaUseCase;
