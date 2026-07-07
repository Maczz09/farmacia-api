const express = require('express');
const router  = express.Router();
const bearerAuthMiddleware   = require('../middleware/bearerAuth.middleware');
const backpressureMiddleware = require('../middleware/backpressure.middleware');
const { validate } = require('../middleware/validate.middleware');
const { recepcionarRecetaSchema, rechazarManualSchema } = require('../schemas/recetas.schemas');

module.exports = (controller) => {
  // Recibir una receta desde el sistema externo (MediCitas)
  router.post('/recepcionar-receta', backpressureMiddleware, bearerAuthMiddleware, validate(recepcionarRecetaSchema),
    (req, res, next) => controller.enviarReceta(req, res, next));

  // Listar recetas (con filtro opcional por estado y paginación)
  router.get('/recetas', bearerAuthMiddleware,
    (req, res, next) => controller.listarRecetas(req, res, next));

  // Confirmar que el paciente retiró su medicamento
  router.patch('/recetas/:id/confirmar-retiro', bearerAuthMiddleware,
    (req, res, next) => controller.confirmarRetiro(req, res, next));

  // Rechazar manualmente una receta aceptada (farmacéutico)
  router.patch('/recetas/:id/rechazar', bearerAuthMiddleware, validate(rechazarManualSchema),
    (req, res, next) => controller.rechazarManual(req, res, next));

  return router;
};
