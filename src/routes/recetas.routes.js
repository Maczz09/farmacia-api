const express = require('express');
const router = express.Router();
const bearerAuthMiddleware = require('../middleware/bearerAuth.middleware');
const backpressureMiddleware = require('../middleware/backpressure.middleware');

module.exports = (controller) => {
  router.post('/recepcionar-receta', backpressureMiddleware, bearerAuthMiddleware,
    (req, res, next) => controller.enviarReceta(req, res, next));
  return router;
};
