// TEMPORAL hasta implementar la US01 (login con roles).
// Cuando exista el login, aquí se verificará el token JWT y que el rol sea "administrador".
// En producción se bloquea a propósito para que nunca se publique sin autenticación.
export function requireAdmin(_req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res
      .status(403)
      .json({ error: 'Acceso restringido: falta implementar la autenticación (US01).' });
  }
  next();
}