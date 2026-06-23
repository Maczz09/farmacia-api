function bearerAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== process.env.FARMACIA_API_KEY) {
    return res.status(401).json({ aceptada: false, referencia: null, motivo: 'Token de autorización inválido.' });
  }
  next();
}

module.exports = bearerAuthMiddleware;
