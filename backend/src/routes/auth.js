import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { firmarToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// Mensaje único para usuario inexistente o contraseña incorrecta:
// no se revela cuál de los dos datos falló.
const MSG_CREDENCIALES = 'Correo o contraseña incorrectos';

// Hash falso para gastar el mismo tiempo cuando el correo no existe.
const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente', 10);

const publico = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol });

// ---- Límite de intentos fallidos (en memoria: se reinicia al reiniciar el servidor) ----
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map(); // "ip|correo" -> { n, desde }

const vigente = (r) => r && Date.now() - r.desde <= VENTANA_MS;
const bloqueado = (clave) => {
  const r = intentos.get(clave);
  return vigente(r) && r.n >= MAX_INTENTOS;
};
const registrarFallo = (clave) => {
  const r = intentos.get(clave);
  if (vigente(r)) r.n += 1;
  else intentos.set(clave, { n: 1, desde: Date.now() });
};
// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
  for (const [clave, r] of intentos) if (!vigente(r)) intentos.delete(clave);
}, VENTANA_MS).unref();

// POST /api/auth/login   { correo, password }
router.post('/login', async (req, res, next) => {
  try {
    const correo = String(req.body?.correo ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!correo || !password) {
      return res.status(400).json({ error: 'Ingresa tu correo y tu contraseña' });
    }

    const clave = `${req.ip}|${correo}`;
    if (bloqueado(clave)) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos' });
    }

    const { rows } = await pool.query(
      'SELECT id, nombre, correo, password_hash, rol FROM usuarios WHERE LOWER(correo) = $1',
      [correo]
    );
    const usuario = rows[0];

    const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO);
    if (!usuario || !coincide) {
      registrarFallo(clave);
      return res.status(401).json({ error: MSG_CREDENCIALES });
    }

    intentos.delete(clave);
    res.json({ token: firmarToken(usuario), usuario: publico(usuario) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> valida el token guardado y devuelve el usuario actual
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, correo, rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'El usuario ya no existe' });
    res.json({ usuario: publico(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;