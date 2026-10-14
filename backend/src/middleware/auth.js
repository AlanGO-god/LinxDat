// US01 - Autenticación (JWT) y autorización por rol.
import jwt from 'jsonwebtoken';

export const ROL_ADMIN = 'administrador';
export const ROL_ESTUDIANTE = 'estudiante';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('Falta la variable JWT_SECRET (defínela en tu archivo .env).');
}
if (process.env.NODE_ENV === 'production' && SECRET === 'cambia_este_secreto') {
  throw new Error('JWT_SECRET sigue con el valor de ejemplo: cámbialo antes de publicar.');
}

const EXPIRACION = '8h';

// Genera el token de sesión con lo mínimo necesario (id y rol).
export function firmarToken(usuario) {
  return jwt.sign({ rol: usuario.rol, nombre: usuario.nombre }, SECRET, {
    subject: String(usuario.id),
    expiresIn: EXPIRACION,
  });
}

// Exige un token válido: Authorization: Bearer <token>. Deja el usuario en req.usuario.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
  try {
    const payload = jwt.verify(token, SECRET);
    req.usuario = { id: Number(payload.sub), rol: payload.rol, nombre: payload.nombre };
    next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo' });
  }
}

// Exige que el usuario autenticado tenga alguno de los roles indicados.
// Debe usarse después de requireAuth.
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };

// Atajo: autenticado y con rol administrador (funciones de la US03, etc.)
export const requireAdmin = [requireAuth, requireRole(ROL_ADMIN)];