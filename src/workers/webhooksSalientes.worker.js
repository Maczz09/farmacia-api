const cron = require('node-cron');
const logger = require('../config/logger');
const webhookService = require('../services/WebhookService');
const { webhooksSalientesPendientesGauge } = require('../config/metrics');

// Reintenta en background los webhooks que la entrega inmediata (en
// WebhookService.notificarCambioEstado) no pudo completar — outbox local
// para que ningún cambio de estado se pierda por una caída transitoria de
// MediCitas. Corre cada 30s; cada fila respeta su propio backoff
// (proximo_intento_en) calculado por el repositorio.
function iniciarWorkerWebhooksSalientes(webhooksSalientesRepository) {
  cron.schedule('*/30 * * * * *', async () => {
    let pendientes;
    try {
      pendientes = await webhooksSalientesRepository.obtenerPendientes(20);
    } catch (err) {
      logger.error({ err: err.message }, '[WebhooksSalientes] Error consultando pendientes');
      return;
    }

    for (const item of pendientes) {
      try {
        await webhookService.intentarEntrega(item.url_destino, item.payload);
        await webhooksSalientesRepository.marcarEntregado(item.id);
        logger.info({ id: item.id, tipoEvento: item.tipo_evento, intentos: item.intentos + 1 }, '[WebhooksSalientes] Entregado en reintento de background');
      } catch (err) {
        const resultado = await webhooksSalientesRepository.marcarReintento(item.id, item.intentos, err.message);
        if (resultado === 'FALLIDO_PERMANENTE') {
          logger.error({ id: item.id, tipoEvento: item.tipo_evento, payload: item.payload }, '[WebhooksSalientes] ALERTA: webhook agotó reintentos — requiere reconciliación manual');
        } else {
          logger.warn({ id: item.id, tipoEvento: item.tipo_evento, intentos: item.intentos + 1, err: err.message }, '[WebhooksSalientes] Reintento fallido, reprogramado');
        }
      }
    }

    try {
      webhooksSalientesPendientesGauge.set(await webhooksSalientesRepository.contarPendientes());
    } catch { /* no crítico — se reintenta en el próximo ciclo */ }
  });
  logger.info('[WebhooksSalientes] Worker de outbox iniciado (cada 30s).');
}

module.exports = { iniciarWorkerWebhooksSalientes };
