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

    if (!apiKey) {
      logger.error({ idReceta }, '[WebhookService] FARMACIA_API_KEY no configurada — webhook omitido');
      return;
    }

    try {
      logger.info({ idReceta, estado, url }, '[WebhookService] Enviando webhook de actualización a Medicitas');
      
      const payload = {
        idReceta,
        estado,
        referenciaFarmacia,
        motivoRechazo
      };

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
      }, '[WebhookService] Error crítico entregando webhook tras reintentos. Se perderá la sincronización.');
      // En un entorno de nivel 4, esto se metería en una tabla Outbox local 
      // de farmacia-api para reintentar horas después.
    }
  }
}

module.exports = new WebhookService();
