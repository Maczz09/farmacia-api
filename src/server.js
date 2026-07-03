// DEBE ser el primer require: instala los hooks de auto-instrumentación antes
// de que cualquier módulo (express, http, mysql2) sea cargado por primera vez.
require('./tracing');

const logger = require('./config/logger');
require('dotenv').config();
const { app, recetasRepository } = require('./app');
const { iniciarWorkerExpiracionInterna } = require('./workers/expiracionInterna.worker');

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  logger.info(`farmacia-api escuchando en puerto ${PORT}`);
  iniciarWorkerExpiracionInterna(recetasRepository);
});
