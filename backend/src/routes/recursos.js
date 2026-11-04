import { Router } from 'express';
import { pool } from '../db.js';
import { ESTADOS, ESTADOS_EDITABLES, TIPOS } from '../constants.js';
import { ROL_ADMIN, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth); // consultar: cualquier usuario con sesión (US02). Modificar: solo administrador

// R-001, R-002, ... (LPAD no trunca ids de más de 3 dígitos gracias al GREATEST)
const CODIGO_SQL = `'R-' || LPAD(id::text, GREATEST(3, LENGTH(id::text)), '0')`;
const COLUMNAS = `id, ${CODIGO_SQL} AS codigo, nombre, tipo, ubicacion, descripcion,
  condiciones_uso, estado, creado_en, actualizado_en`;

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Identificador inválido' });
  }
  req.recursoId = id;
  next();
}

// Valida y normaliza el cuerpo de POST/PUT. Obligatorios: nombre, tipo y ubicación.
export function validarRecurso(body = {}) {
  const errores = {};
  const texto = (v) => String(v ?? '').trim();

  const datos = {
    nombre: texto(body.nombre),
    tipo: texto(body.tipo),
    ubicacion: texto(body.ubicacion),
    descripcion: texto(body.descripcion) || null,
    condiciones_uso: texto(body.condiciones_uso) || null,
    estado: body.estado === undefined || body.estado === '' ? undefined : body.estado,
  };

  if (!datos.nombre) errores.nombre = 'El nombre es obligatorio';
  else if (datos.nombre.length > 160) errores.nombre = 'Máximo 160 caracteres';

  if (!datos.tipo) errores.tipo = 'El tipo es obligatorio';
  else if (!TIPOS.includes(datos.tipo)) errores.tipo = 'Tipo no válido';

  if (!datos.ubicacion) errores.ubicacion = 'La ubicación es obligatoria';
  else if (datos.ubicacion.length > 160) errores.ubicacion = 'Máximo 160 caracteres';

  if (datos.estado !== undefined && !ESTADOS_EDITABLES.includes(datos.estado)) {
    errores.estado = 'Estado no válido';
  }

  return { datos, errores };
}

const hayErrores = (e) => Object.keys(e).length > 0;

// GET /api/recursos?estado=disponible&q=laptop
router.get(
  '/',
  wrap(async (req, res) => {
    const { estado, q } = req.query;
    const where = [];
    const params = [];
        // Los recursos dados de baja solo los ve el administrador
    if (req.usuario.rol !== ROL_ADMIN) where.push(`estado <> 'baja'`);

    if (estado) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      params.push(estado);
      where.push(`estado = $${params.length}`);
    }

    const busqueda = String(q ?? '').trim();
    if (busqueda) {
      params.push(`%${busqueda.replace(/[\\%_]/g, '\\$&')}%`);
      const n = params.length;
      where.push(
        `(nombre ILIKE $${n} OR tipo ILIKE $${n} OR ubicacion ILIKE $${n} OR ${CODIGO_SQL} ILIKE $${n})`
      );
    }

    const sql = `SELECT ${COLUMNAS} FROM recursos
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY id`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  })
);

// GET /api/recursos/:id
router.get(
  '/:id',
  validarId,
  wrap(async (req, res) => {
    const filtroBaja = req.usuario.rol === ROL_ADMIN ? '' : `AND estado <> 'baja'`;
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS} FROM recursos WHERE id = $1 ${filtroBaja}`,
      [req.recursoId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Recurso no encontrado' });
    res.json(rows[0]);
  })
);

// POST /api/recursos  -> agrega un recurso al catálogo
router.post(
  '/',
  requireAdmin,
  wrap(async (req, res) => {
    const { datos, errores } = validarRecurso(req.body);
    if (hayErrores(errores)) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }
    const { rows } = await pool.query(
      `INSERT INTO recursos (nombre, tipo, ubicacion, descripcion, condiciones_uso, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNAS}`,
      [
        datos.nombre,
        datos.tipo,
        datos.ubicacion,
        datos.descripcion,
        datos.condiciones_uso,
        datos.estado ?? 'disponible',
      ]
    );
    res.status(201).json(rows[0]);
  })
);

// PUT /api/recursos/:id  -> edita un recurso existente
router.put(
  '/:id',
  requireAdmin,
  validarId,
  wrap(async (req, res) => {
    const actual = await pool.query('SELECT estado FROM recursos WHERE id = $1', [req.recursoId]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Recurso no encontrado' });

    const estadoActual = actual.rows[0].estado;
    if (estadoActual === 'baja') {
      return res.status(409).json({ error: 'El recurso está dado de baja y no puede editarse' });
    }

    const { datos, errores } = validarRecurso(req.body);
    if (hayErrores(errores)) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }
    if (estadoActual === 'prestado' && datos.estado !== undefined) {
      return res
        .status(409)
        .json({ error: 'No se puede cambiar el estado de un recurso que está prestado' });
    }

    const { rows } = await pool.query(
      `UPDATE recursos
          SET nombre = $1, tipo = $2, ubicacion = $3, descripcion = $4,
              condiciones_uso = $5, estado = $6, actualizado_en = NOW()
        WHERE id = $7
        RETURNING ${COLUMNAS}`,
      [
        datos.nombre,
        datos.tipo,
        datos.ubicacion,
        datos.descripcion,
        datos.condiciones_uso,
        datos.estado ?? estadoActual,
        req.recursoId,
      ]
    );
    res.json(rows[0]);
  })
);

// DELETE /api/recursos/:id  -> BAJA LÓGICA (no borra la fila, conserva el historial de préstamos)
router.delete(
  '/:id',
  requireAdmin,
  validarId,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE recursos SET estado = 'baja', actualizado_en = NOW()
        WHERE id = $1 AND estado IN ('disponible', 'en_mantenimiento')
        RETURNING ${COLUMNAS}`,
      [req.recursoId]
    );
    if (rows.length) return res.json(rows[0]);

    // No se actualizó nada: averiguamos por qué
    const actual = await pool.query('SELECT estado FROM recursos WHERE id = $1', [req.recursoId]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Recurso no encontrado' });
    const msg =
      actual.rows[0].estado === 'baja'
        ? 'El recurso ya está dado de baja'
        : 'No se puede dar de baja un recurso que está prestado';
    res.status(409).json({ error: msg });
  })
);

export default router;