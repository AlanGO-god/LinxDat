// US04 - Solicitud de préstamo de un recurso.
import { Router } from 'express';
import { pool } from '../db.js';
import { DURACION_MAX_HORAS, ESTADOS_SOLICITUD_OCUPAN } from '../constants.js';
import { ROL_ESTUDIANTE, requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const MS_HORA = 60 * 60 * 1000;

const aFecha = (v) => {
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
};

// Valida el cuerpo del POST. Las fechas llegan en ISO 8601 (el navegador ya aplicó su zona horaria).
export function validarSolicitud(body = {}, ahora = new Date()) {
  const errores = {};
  const recursoId = Number(body.recurso_id);
  const inicio = aFecha(body.fecha_inicio);
  const fin = aFecha(body.fecha_limite);

  if (!Number.isInteger(recursoId) || recursoId < 1) errores.recurso_id = 'Recurso inválido';

  if (!inicio) errores.fecha_inicio = 'Elige la fecha y hora de inicio';
  else if (inicio <= ahora) errores.fecha_inicio = 'El horario debe ser posterior al momento actual';

  if (!fin) errores.fecha_limite = 'Elige la hora de devolución';
  else if (inicio && fin <= inicio) {
    errores.fecha_limite = 'La hora de devolución debe ser posterior a la de inicio';
  } else if (inicio && fin - inicio > DURACION_MAX_HORAS * MS_HORA) {
    errores.fecha_limite = `El préstamo no puede durar más de ${DURACION_MAX_HORAS} horas`;
  }

  return { datos: { recursoId, inicio, fin }, errores };
}

// GET /api/solicitudes/ocupacion?recurso_id=1&desde=ISO&hasta=ISO
// Horarios ya apartados de un recurso (sin datos de quién los pidió), para el calendario.
router.get(
  '/ocupacion',
  wrap(async (req, res) => {
    const recursoId = Number(req.query.recurso_id);
    const desde = aFecha(req.query.desde);
    const hasta = aFecha(req.query.hasta);
    if (!Number.isInteger(recursoId) || recursoId < 1 || !desde || !hasta || hasta <= desde) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const { rows } = await pool.query(
      `SELECT fecha_inicio AS inicio, fecha_limite AS fin, estado
         FROM solicitudes
        WHERE recurso_id = $1 AND estado = ANY($2)
          AND fecha_inicio < $4 AND fecha_limite > $3
        ORDER BY fecha_inicio`,
      [recursoId, ESTADOS_SOLICITUD_OCUPAN, desde, hasta]
    );
    res.json(rows);
  })
);

// POST /api/solicitudes  { recurso_id, fecha_inicio, fecha_limite }  -> queda "pendiente"
router.post(
  '/',
  requireRole(ROL_ESTUDIANTE),
  wrap(async (req, res) => {
    const { datos, errores } = validarSolicitud(req.body);
    if (Object.keys(errores).length) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FOR UPDATE: dos solicitudes simultáneas del mismo recurso se atienden una tras otra,
      // así la segunda sí ve el horario que apartó la primera.
      const recurso = await client.query(
        'SELECT nombre, estado FROM recursos WHERE id = $1 FOR UPDATE',
        [datos.recursoId]
      );
      if (!recurso.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Recurso no encontrado' });
      }
      if (recurso.rows[0].estado !== 'disponible') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este recurso no está disponible para solicitud' });
      }

      const choque = await client.query(
        `SELECT fecha_inicio AS inicio, fecha_limite AS fin
           FROM solicitudes
          WHERE recurso_id = $1 AND estado = ANY($2)
            AND fecha_inicio < $4 AND fecha_limite > $3
          ORDER BY fecha_inicio
          LIMIT 1`,
        [datos.recursoId, ESTADOS_SOLICITUD_OCUPAN, datos.inicio, datos.fin]
      );
      if (choque.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'El horario elegido ya está ocupado. Elige otro horario',
          conflicto: choque.rows[0],
        });
      }

      const { rows } = await client.query(
        `INSERT INTO solicitudes (usuario_id, recurso_id, fecha_inicio, fecha_limite)
         VALUES ($1, $2, $3, $4)
         RETURNING id, recurso_id, fecha_inicio, fecha_limite, estado, creado_en`,
        [req.usuario.id, datos.recursoId, datos.inicio, datos.fin]
      );
      await client.query('COMMIT');
      res.status(201).json({ ...rows[0], recurso_nombre: recurso.rows[0].nombre });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  })
);

export default router;
