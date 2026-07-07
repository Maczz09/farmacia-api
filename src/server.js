// DEBE ser el primer require: instala los hooks de auto-instrumentación antes
// de que cualquier módulo (express, http, mysql2) sea cargado por primera vez.
require('./tracing');

const logger = require('./config/logger');
require('dotenv').config();
const { app, recetasRepository } = require('./app');
const { iniciarWorkerExpiracionInterna } = require('./workers/expiracionInterna.worker');
const { iniciarWorkerWebhooksSalientes } = require('./workers/webhooksSalientes.worker');
const WebhooksSalientesMySQLRepository = require('./adapters/out/WebhooksSalientesMySQLRepository');
const webhookService = require('./services/WebhookService');
const pool = require('./config/database');

const PORT = process.env.PORT || 4002;

const webhooksSalientesRepository = new WebhooksSalientesMySQLRepository(pool);
webhookService.init(webhooksSalientesRepository);

app.listen(PORT, () => {
  logger.info(`farmacia-api escuchando en puerto ${PORT}`);
  iniciarWorkerExpiracionInterna(recetasRepository);
  iniciarWorkerWebhooksSalientes(webhooksSalientesRepository);
});
