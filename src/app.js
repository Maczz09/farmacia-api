const logger = require('./config/logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const pool = require('./config/database');
const RecetasMySQLRepository = require('./adapters/out/RecetasMySQLRepository');
const ProcesarRecetaUseCase = require('./application/ProcesarRecetaUseCase');
const RecetasController = require('./adapters/in/RecetasController');
const recetasRoutesFactory = require('./routes/recetas.routes');
const healthRoutes = require('./routes/health.routes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { correlationIdMiddleware } = require('./middleware/correlationId.middleware');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { metricsMiddleware } = require('./middleware/metrics.middleware');
const { register } = require('./config/metrics');

const app = express();
app.use(helmet());
app.use(cors());
app.use(metricsMiddleware);
app.use(correlationIdMiddleware);
app.use(express.json());

const recetasRepository = new RecetasMySQLRepository(pool);
const procesarRecetaUseCase = new ProcesarRecetaUseCase(recetasRepository);
const recetasController = new RecetasController(procesarRecetaUseCase, recetasRepository);

app.use('/', healthRoutes);

// Endpoint de métricas para Prometheus (scrape interno, sin autenticación
// como el resto del stack — no expone datos de negocio, solo agregados).
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use('/api/v2/farmacia', recetasRoutesFactory(recetasController));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);

module.exports = { app, recetasRepository };
