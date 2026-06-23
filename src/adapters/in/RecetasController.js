class RecetasController {
  constructor(procesarRecetaUseCase) {
    this.procesarRecetaUseCase = procesarRecetaUseCase;
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
}

module.exports = RecetasController;
