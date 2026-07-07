'use strict';

const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total de errores HTTP (4xx y 5xx)',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// --- Métricas de negocio ---

const recetasProcesadasCounter = new client.Counter({
  name: 'farmacia_recetas_procesadas_total',
  help: 'Total de recetas recibidas de MediCitas, por resultado',
  labelNames: ['resultado'], // aceptada | rechazada_stock
  registers: [register],
});

const recetasRetiroCounter = new client.Counter({
  name: 'farmacia_recetas_retiro_total',
  help: 'Total de recetas resueltas en mostrador, por resultado',
  labelNames: ['resultado'], // retirada | rechazada_manual
  registers: [register],
});

// --- Métricas SRE (Outbox de webhooks) ---

const webhooksSalientesPendientesGauge = new client.Gauge({
  name: 'webhooks_salientes_pendientes',
  help: 'Cantidad de webhooks salientes en estado PENDIENTE (outbox local hacia MediCitas)',
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  recetasProcesadasCounter,
  recetasRetiroCounter,
  webhooksSalientesPendientesGauge,
};

// Inicializa las series en 0 para que Grafana no muestre "No data" antes del primer evento.
recetasProcesadasCounter.inc({ resultado: 'aceptada' }, 0);
recetasProcesadasCounter.inc({ resultado: 'rechazada_stock' }, 0);
recetasRetiroCounter.inc({ resultado: 'retirada' }, 0);
recetasRetiroCounter.inc({ resultado: 'rechazada_manual' }, 0);
