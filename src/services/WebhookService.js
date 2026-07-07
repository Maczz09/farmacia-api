const logger = require('../config/logger');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

// Configuración de reintentos: 3 intentos con backoff exponencial (1s, 2s, 4s)
// Esto asegura que si Medicitas-Backend se reinicia justo cuando farmacia
// aprueba una receta, el webhook no se pierda.
const webhookClient = axios.create({
  timeout: 5000, // 5 segundos max
});

axiosRetry(webhookClient, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Reintentar si hay error de red o error 5xx del servidor
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

class WebhookService {
  constructor() {
    this.webhooksRepo = null; // inyectado por initWebhookService() en server.js
  }

  init(webhooksSalientesRepository) {
    this.webhooksRepo = webhooksSalientesRepository;
  }

  /**
   * Entrega cruda de un payload ya encolado (usada por webhooksSalientes.worker.js
   * para reintentar filas PENDIENTE). Lanza si falla — el worker decide qué
   * hacer con el error (reintentar con backoff o marcar FALLIDO_PERMANENTE).
   */
  async intentarEntrega(urlDestino, payload) {
    const apiKey = process.env.FARMACIA_API_KEY;
    if (!apiKey) throw new Error('FARMACIA_API_KEY no configurada');

    await webhookClient.post(urlDestino, payload, {
      headers: { 'X-Webhook-Api-Key': apiKey, 'Content-Type': 'application/json' },
    });
  }

  /**
   * Notifica a Medicitas-Backend sobre el cambio de estado de una receta
   * @param {string} idReceta
   * @param {string} estado - 'RETIRADA' o 'RECHAZADA'
   * @param {string} referenciaFarmacia
   * @param {string} motivoRechazo
   */
  async notificarCambioEstado({ idReceta, estado, referenciaFarmacia, motivoRechazo }) {
    const url = process.env.MEDICITAS_WEBHOOK_URL || 'http://medicitas_backend:3000/api/v1/webhooks/farmacia';
    // Secreto compartido bidireccional: la misma FARMACIA_API_KEY que MediCitas
    // usa para llamarnos autentica nuestros webhooks hacia MediCitas.
    const apiKey = process.env.FARMACIA_API_KEY;
    const payload = { idReceta, estado, referenciaFarmacia, motivoRechazo };

    if (!apiKey) {
      logger.error({ idReceta }, '[WebhookService] FARMACIA_API_KEY no configurada — webhook omitido');
      return;
    }

    try {
      logger.info({ idReceta, estado, url }, '[WebhookService] Enviando webhook de actualización a Medicitas');

      const response = await webhookClient.post(url, payload, {
        headers: {
          'X-Webhook-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      logger.info({ idReceta, status: response.status }, '[WebhookService] Webhook entregado con éxito');
    } catch (error) {
      logger.error({
        idReceta,
        error: error.message,
        url
      }, '[WebhookService] Entrega inmediata falló tras reintentos — se encola en outbox local para reintento en background.');

      // Outbox local: la entrega inmediata (con reintento en memoria) agotó
      // sus intentos. Se persiste para que webhooksSalientes.worker.js siga
      // reintentando con backoff hasta que MediCitas vuelva a responder —
      // así ningún cambio de estado se pierde por una caída transitoria.
      if (this.webhooksRepo) {
        try {
          await this.webhooksRepo.encolar({ tipoEvento: 'RecetaCambioEstado', payload, urlDestino: url });
        } catch (dbError) {
          logger.error({ idReceta, error: dbError.message }, '[WebhookService] CRÍTICO: no se pudo encolar el webhook en el outbox local. Sincronización perdida.');
        }
      }
    }
  }
}

module.exports = new WebhookService();
