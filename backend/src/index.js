import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import recursosRouter from './routes/recursos.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de prueba: confirma que API y base de datos funcionan
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', db: 'connected', time: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/auth', authRouter); // US01 (login)
app.use('/api/recursos', recursosRouter); // US03 (y base de US02)

// Cualquier ruta /api desconocida responde JSON (no el HTML del frontend)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// En producción Express también sirve el frontend compilado
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Manejador de errores (debe ir al final)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => console.log(`API escuchando en el puerto ${PORT}`));