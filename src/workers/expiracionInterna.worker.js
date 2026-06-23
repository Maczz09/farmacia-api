const cron = require('node-cron');

function iniciarWorkerExpiracionInterna(recetasRepository) {
  cron.schedule('0 7 * * *', async () => {
    const vencidas = await recetasRepository.findAceptadasVencidas();
    for (const receta of vencidas) {
      await recetasRepository.actualizarEstado(receta.idRecetaFarmacia, 'NO_RETIRADA_FARMACIA');
      console.log(`[ExpiracionInterna] Receta ${receta.idRecetaFarmacia} marcada NO_RETIRADA_FARMACIA.`);
    }
  });
  console.log('[ExpiracionInterna] Worker iniciado.');
}

module.exports = { iniciarWorkerExpiracionInterna };
