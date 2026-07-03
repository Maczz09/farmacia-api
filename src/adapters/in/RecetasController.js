const logger = require('../../config/logger');
const webhookService = require('../../services/WebhookService');
const RecetaExterna = require('../../domain/RecetaExterna');

class RecetasController {
  constructor(procesarRecetaUseCase, recetasRepository) {
    this.procesarRecetaUseCase = procesarRecetaUseCase;
    this.recetasRepository     = recetasRepository;
  }

  async enviarReceta(req, res, next) {
    try {
      const { referenciaDespacho, farmacia, medicamento, dosis, cantidad } = req.body;
      if (!referenciaDespacho || !farmacia || !medicamento || !dosis || cantidad === undefined) {
        return res.status(400).json({
          aceptada: false, referencia: null,
          motivo: 'Datos incompletos: referenciaDespacho, farmacia, medicamento, dosis y cantidad son obligatorios.',
        });
      }
      const respuesta = await this.procesarRecetaUseCase.ejecutar(req.body);
      res.status(200).json(respuesta);
    } catch (err) { next(err); }
  }

  async listarRecetas(req, res, next) {
    try {
      const { estado, page = 1, limit = 20 } = req.query;
      const estadosValidos = Object.values(RecetaExterna.ESTADOS);
      if (estado && !estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Valores: ${estadosValidos.join(', ')}` });
      }
      const resultado = await this.recetasRepository.findAll({
        estado: estado || null,
        page:   parseInt(page,  10),
        limit:  Math.min(parseInt(limit, 10), 100),
      });
      res.json({
        total:   resultado.total,
        page:    resultado.page,
        limit:   resultado.limit,
        recetas: resultado.rows.map((r) => this._toDTO(r)),
      });
    } catch (err) { next(err); }
  }

  async confirmarRetiro(req, res, next) {
    try {
      const receta = await this.recetasRepository.findById(req.params.id);
      if (!receta) {
        return res.status(404).json({ error: `Receta ${req.params.id} no encontrada` });
      }
      receta.confirmarRetiro();
      await this.recetasRepository.actualizarEstado(receta.idRecetaFarmacia, receta.estado);
      
      // Notificar a Medicitas-Backend vía Webhook (fire-and-forget con reintentos internos)
      webhookService.notificarCambioEstado({
        idReceta: receta.referenciaDespacho,
        estado: 'RETIRADA',
        referenciaFarmacia: receta.referenciaInterna
      }).catch(err => logger.error('[Webhook] Error crítico no manejado:', err));

      res.json(this._toDTO(receta));
    } catch (err) {
      if (err.message?.startsWith('No se puede confirmar retiro')) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }

  async rechazarManual(req, res, next) {
    try {
      const { motivo } = req.body;
      const receta = await this.recetasRepository.findById(req.params.id);
      if (!receta) {
        return res.status(404).json({ error: `Receta ${req.params.id} no encontrada` });
      }
      receta.rechazarManualmente(motivo);
      await this.recetasRepository.actualizarEstado(receta.idRecetaFarmacia, receta.estado);
      await this.recetasRepository.guardarMotivoRechazo(receta.idRecetaFarmacia, receta.motivoRechazo);
      
      // Notificar a Medicitas-Backend vía Webhook
      webhookService.notificarCambioEstado({
        idReceta: receta.referenciaDespacho,
        estado: 'RECHAZADA',
        referenciaFarmacia: receta.referenciaInterna,
        motivoRechazo: receta.motivoRechazo
      }).catch(err => logger.error('[Webhook] Error crítico no manejado:', err));

      res.json(this._toDTO(receta));
    } catch (err) {
      if (err.message?.startsWith('Solo se puede rechazar')) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }

  _toDTO(receta) {
    return {
      id:                   receta.idRecetaFarmacia,
      referenciaDespacho:   receta.referenciaDespacho,
      idEncuentroClinico:   receta.idEncuentroClinico,
      farmacia:             receta.farmaciaCodigo,
      medicamento:          receta.medicamento,
      dosis:                receta.dosis,
      cantidad:             receta.cantidad,
      estado:               receta.estado,
      referenciaInterna:    receta.referenciaInterna,
      motivoRechazo:        receta.motivoRechazo,
      fechaRecepcion:       receta.fechaRecepcion,
      fechaLimiteRetiro:    receta.fechaLimiteRetiro,
    };
  }
}

module.exports = RecetasController;
