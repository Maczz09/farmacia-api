const MAX_CONCURRENTES = parseInt(process.env.MAX_SOLICITUDES_CONCURRENTES || '50');
let enCurso = 0;

function backpressureMiddleware(req, res, next) {
  if (enCurso >= MAX_CONCURRENTES) {
    return res.status(503).json({
      aceptada: false, referencia: null,
      motivo: 'Servicio saturado. Intente nuevamente en unos segundos.',
    });
  }
  enCurso++;
  res.on('finish', () => { enCurso--; });
  res.on('close', () => { enCurso--; });
  next();
}

module.exports = backpressureMiddleware;
