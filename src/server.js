require('dotenv').config();
const { app, recetasRepository } = require('./app');
const { iniciarWorkerExpiracionInterna } = require('./workers/expiracionInterna.worker');

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`farmacia-api escuchando en puerto ${PORT}`);
  iniciarWorkerExpiracionInterna(recetasRepository);
});
