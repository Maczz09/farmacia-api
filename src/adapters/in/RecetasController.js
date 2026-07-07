const logger = require('../../config/logger');
const webhookService = require('../../services/WebhookService');
const RecetaExterna = require('../../domain/RecetaExterna');
const { DomainError } = require('../../domain/errors');
const { recetasRetiroCounter } = require('../../config/metrics');

class RecetasController {
  constructor(procesarRecetaUseCase, recetasRepository) {
    this.procesarRecetaUseCase = procesarRecetaUseCase;
    this.recetasRepository     = recetasRepository;
  }

  async enviarReceta(req, res, next) {
    try {
      // req.body ya fue validado por el middleware Zod (recepcionarRecetaSchema).
      const respuesta = await this.procesarRecetaUseCase.ejecutar(req.body);
      res.status(200).json(respuesta);
    } catch (err) { next(err); }
  }

  async listarRecetas(req, res, next) {
    try {
      const { estado, page = 1, limit = 20 } = req.query;
      const estadosValidos = Object.values(RecetaExterna.ESTADOS);
      if (estado && !estadosValidos.includes(estado)) {
        return next(new DomainError('ESTADO_INVALIDO', 400, `Estado inválido. Valores: ${estadosValidos.join(', ')}`));
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
        return next(new DomainError('RECETA_NO_ENCONTRADA', 404, `Receta ${req.params.id} no encontrada`));
      }
      receta.confirmarRetiro();
      await this.recetasRepository.actualizarEstado(receta.idRecetaFarmacia, receta.estado);
      recetasRetiroCounter.inc({ resultado: 'retirada' });

      // Notificar a Medicitas-Backend vía Webhook (fire-and-forget con reintentos internos)
      webhookService.notificarCambioEstado({
        idReceta: receta.referenciaDespacho,
        estado: 'RETIRADA',
        referenciaFarmacia: receta.referenciaInterna
      }).catch(err => logger.error('[Webhook] Error crítico no manejado:', err));

      res.json(this._toDTO(receta));
    } catch (err) {
      next(err);
    }
  }

  async rechazarManual(req, res, next) {
    try {
      // req.body ya fue validado por Zod (rechazarManualSchema).
      const { motivo } = req.body;
      const receta = await this.recetasRepository.findById(req.params.id);
      if (!receta) {
        return next(new DomainError('RECETA_NO_ENCONTRADA', 404, `Receta ${req.params.id} no encontrada`));
      }
      receta.rechazarManualmente(motivo);
      await this.recetasRepository.actualizarEstado(receta.idRecetaFarmacia, receta.estado);
      await this.recetasRepository.guardarMotivoRechazo(receta.idRecetaFarmacia, receta.motivoRechazo);
      recetasRetiroCounter.inc({ resultado: 'rechazada_manual' });

      // Notificar a Medicitas-Backend vía Webhook
      webhookService.notificarCambioEstado({
        idReceta: receta.referenciaDespacho,
        estado: 'RECHAZADA',
        referenciaFarmacia: receta.referenciaInterna,
        motivoRechazo: receta.motivoRechazo
      }).catch(err => logger.error('[Webhook] Error crítico no manejado:', err));

      res.json(this._toDTO(receta));
    } catch (err) {
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
