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

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const recetasRepository = new RecetasMySQLRepository(pool);
const procesarRecetaUseCase = new ProcesarRecetaUseCase(recetasRepository);
const recetasController = new RecetasController(procesarRecetaUseCase);

app.use('/', healthRoutes);
app.use('/api/v1/farmacia', recetasRoutesFactory(recetasController));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ aceptada: false, referencia: null, motivo: 'Error interno del servidor.' });
});

module.exports = { app, recetasRepository };
