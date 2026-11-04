-- =====================================================================
--  LinxDat - Script ÚNICO de base de datos
--  Se ejecuta automáticamente SOLO cuando se crea el volumen desde cero.
--  Para reiniciar todo con datos limpios:  docker compose down -v && docker compose up
--  Sección 1: esquema (siempre).  Sección 2: datos de prueba (si CARGAR_DATOS_DEMO=true).
-- =====================================================================

-- ======================= SECCIÓN 1: ESQUEMA ==========================

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  correo        VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('estudiante', 'administrador')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- El login busca por LOWER(correo): este índice evita duplicados por mayúsculas y acelera la consulta
CREATE UNIQUE INDEX ux_usuarios_correo_lower ON usuarios (LOWER(correo));

CREATE TABLE recursos (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(160) NOT NULL,
  tipo            VARCHAR(40)  NOT NULL,
  ubicacion       VARCHAR(160) NOT NULL,
  descripcion     TEXT,
  condiciones_uso TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'disponible'
                  CHECK (estado IN ('disponible', 'prestado', 'en_mantenimiento', 'baja')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE solicitudes (
  id               SERIAL PRIMARY KEY,
  usuario_id       INT NOT NULL REFERENCES usuarios(id),
  recurso_id       INT NOT NULL REFERENCES recursos(id),
  fecha_inicio     TIMESTAMPTZ NOT NULL,
  fecha_limite     TIMESTAMPTZ NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'devuelta')),
  comentario_admin TEXT,
  devuelto_en      TIMESTAMPTZ,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT solicitudes_fechas_ok CHECK (fecha_limite > fecha_inicio)
);
CREATE INDEX idx_solicitudes_recurso_fechas
  ON solicitudes (recurso_id, fecha_inicio) WHERE estado IN ('pendiente', 'aprobada');
CREATE INDEX idx_solicitudes_usuario ON solicitudes (usuario_id, creado_en DESC);

CREATE TABLE sanciones (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INT NOT NULL REFERENCES usuarios(id),
  solicitud_id       INT REFERENCES solicitudes(id),
  motivo             TEXT NOT NULL,
  vigente_hasta      DATE,
  activa             BOOLEAN NOT NULL DEFAULT TRUE,
  motivo_condonacion TEXT,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sanciones_usuario_activas ON sanciones (usuario_id) WHERE activa;

-- ================== SECCIÓN 2: DATOS DE PRUEBA =======================
-- Contraseñas:  administradores -> Admin123   |   estudiantes -> Estudiante123

\set cargar_demo false
\getenv cargar_demo CARGAR_DATOS_DEMO
\if :cargar_demo

-- Hora local de la institución (Celaya) relativa a hoy: t(-1,'14:00') = ayer 14:00; t(2,'09:00') = en 2 días 09:00
CREATE FUNCTION pg_temp.t(dia INT, hora TIME) RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE AS $$
  SELECT ((NOW() AT TIME ZONE 'America/Mexico_City')::date + dia + hora) AT TIME ZONE 'America/Mexico_City'
$$;

\set hash_admin '$2a$10$dxC5wHRY/TE3VqWf2YQo8ev/z7bgmkUIjgR.bgPGP/J0FIUGWIAxu'
\set hash_est   '$2a$10$egugl6iJvI7eGO0i.1VquuiJudvtSU11dzRuNXvNwo7s7FddVuod.'

INSERT INTO usuarios (id, nombre, correo, password_hash, rol) VALUES
  (1,  'Administrador Demo',          'administrador@itcelaya.edu.mx', :'hash_admin', 'administrador'),
  (2,  'Laura Patricia Gómez',        'laboratorio@itcelaya.edu.mx',   :'hash_admin', 'administrador'),
  (3,  'Estudiante Demo',             'estudiante@itcelaya.edu.mx',    :'hash_est',   'estudiante'),
  (4,  'Carlos Ramírez Soto',         'a21030001@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (5,  'Ana Sofía Hernández Ruiz',    'a21030002@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (6,  'Luis Ángel Martínez Paz',     'a21030003@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (7,  'Daniela Torres Vega',         'a21030004@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (8,  'Jorge Alberto Mendoza Ríos',  'a21030005@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (9,  'Valeria Guzmán Ortiz',        'a21030006@itcelaya.edu.mx',     :'hash_est',   'estudiante'),
  (10, 'Diego Armando Cruz León',     'a21030007@itcelaya.edu.mx',     :'hash_est',   'estudiante');

-- condiciones_uso en NULL se rellena más abajo según el tipo (excepto los recursos en baja)
INSERT INTO recursos (id, nombre, tipo, ubicacion, descripcion, condiciones_uso, estado) VALUES
  (1,  'Proyector Epson X41+',               'Multimedia',  'Lab. Cómputo A',     'Proyector XGA de 3600 lúmenes con entrada HDMI y VGA.', NULL, 'disponible'),
  (2,  'Proyector BenQ MW535',               'Multimedia',  'Aula 101',           'Proyector WXGA de 3600 lúmenes.', NULL, 'disponible'),
  (3,  'Laptop Dell XPS 15 (A)',             'Multimedia',  'Biblioteca',         'Laptop i7, 16 GB de RAM y SSD de 512 GB.', NULL, 'en_mantenimiento'),
  (4,  'Laptop Dell XPS 15 (B)',             'Multimedia',  'Biblioteca',         'Laptop i7, 16 GB de RAM y SSD de 512 GB.', NULL, 'disponible'),
  (5,  'Laptop Lenovo ThinkPad T14',         'Multimedia',  'Biblioteca',         'Laptop Ryzen 7, 16 GB de RAM.', NULL, 'disponible'),
  (6,  'Cámara Canon EOS R50',               'Multimedia',  'Sala Audiovisual',   'Cámara mirrorless con lente 18-45 mm y tarjeta SD de 64 GB.',
       E'Uso exclusivo para proyectos académicos.\nDevolver con batería y tarjeta incluidas.\nNo se permite cambiar los ajustes de fábrica.', 'disponible'),
  (7,  'Micrófono inalámbrico Shure',        'Multimedia',  'Sala Audiovisual',   'Kit de micrófono de mano con receptor.', NULL, 'disponible'),
  (8,  'Bocina JBL PartyBox',                'Multimedia',  'Sala Audiovisual',   'Bocina portátil de 100 W con batería.', NULL, 'prestado'),
  (9,  'Tableta gráfica Wacom Intuos',       'Multimedia',  'Lab. Cómputo B',     'Tableta gráfica mediana con lápiz.', NULL, 'disponible'),
  (10, 'Pantalla interactiva 65"',           'Multimedia',  'Aula 204',           'Pantalla táctil 4K (equipo retirado del servicio).', NULL, 'baja'),
  (11, 'Osciloscopio Tektronix TBS1052 (A)', 'Laboratorio', 'Lab. Electrónica 1', 'Osciloscopio digital de 2 canales y 50 MHz.', NULL, 'prestado'),
  (12, 'Osciloscopio Tektronix TBS1052 (B)', 'Laboratorio', 'Lab. Electrónica 1', 'Osciloscopio digital de 2 canales y 50 MHz.', NULL, 'disponible'),
  (13, 'Multímetro Fluke 117',               'Laboratorio', 'Lab. Electrónica 1', 'Multímetro digital True RMS.', NULL, 'disponible'),
  (14, 'Fuente de poder Rigol DP832',        'Laboratorio', 'Lab. Electrónica 2', 'Fuente programable de 3 canales.', NULL, 'disponible'),
  (15, 'Generador de funciones Siglent',     'Laboratorio', 'Lab. Electrónica 2', 'Generador de funciones de 2 canales.', NULL, 'en_mantenimiento'),
  (16, 'Microscopio Olympus CX23',           'Laboratorio', 'Lab. Biología',      'Microscopio binocular con objetivos 4x a 100x.',
       E'Limpiar los lentes con papel especial.\nNo mover el equipo de su base.\nUso bajo supervisión del encargado.', 'disponible'),
  (17, 'Kit Arduino Mega',                   'Laboratorio', 'Lab. Electrónica 2', 'Tarjeta Arduino Mega con sensores y cables.', NULL, 'disponible'),
  (18, 'Estación de soldadura Hakko',        'Laboratorio', 'Lab. Electrónica 1', 'Estación de soldadura con control de temperatura.',
       E'Usar lentes de seguridad.\nUso bajo supervisión del encargado.\nApagar y dejar enfriar antes de devolver.', 'disponible'),
  (19, 'Aula Magna',                         'Espacio',     'Edif. Principal',    'Auditorio con capacidad para 200 personas.', NULL, 'disponible'),
  (20, 'Sala de juntas B',                   'Espacio',     'Edif. Principal',    'Sala para 12 personas (fuera de servicio).', NULL, 'baja'),
  (21, 'Sala de juntas A',                   'Espacio',     'Edif. Principal',    'Sala para 10 personas con pantalla.', NULL, 'disponible'),
  (22, 'Cubículo de estudio 1',              'Espacio',     'Biblioteca',         'Cubículo para 4 personas.', NULL, 'disponible'),
  (23, 'Cubículo de estudio 2',              'Espacio',     'Biblioteca',         'Cubículo para 4 personas.', NULL, 'disponible'),
  (24, 'Sala de videoconferencias',          'Espacio',     'Edif. B',            'Sala equipada para videollamadas, 8 personas.', NULL, 'disponible');

UPDATE recursos SET condiciones_uso = E'Uso exclusivo dentro del plantel.\nDevolver en el mismo estado en que se recibió.\nReportar cualquier daño al momento de la devolución.'
 WHERE tipo = 'Multimedia' AND condiciones_uso IS NULL AND estado <> 'baja';
UPDATE recursos SET condiciones_uso = E'Presentar credencial vigente.\nUso bajo supervisión del encargado del laboratorio.\nNo se permite sacarlo del laboratorio.'
 WHERE tipo = 'Laboratorio' AND condiciones_uso IS NULL AND estado <> 'baja';
UPDATE recursos SET condiciones_uso = E'Dejar el espacio limpio y ordenado.\nNo ingerir alimentos.\nRespetar el aforo máximo.'
 WHERE tipo = 'Espacio' AND condiciones_uso IS NULL AND estado <> 'baja';

-- Solicitudes: 9 devueltas (historial), 2 préstamos vencidos sin devolver (recursos 8 y 11),
-- 1 rechazada, 1 cancelada, 5 aprobadas a futuro y 14 pendientes para la bandeja.
INSERT INTO solicitudes (id, usuario_id, recurso_id, fecha_inicio, fecha_limite, estado, comentario_admin, devuelto_en, creado_en) VALUES
  (1,  4, 1,  pg_temp.t(-10, '09:00'), pg_temp.t(-10, '11:00'), 'devuelta',  'Aprobada. Recógelo con tu credencial.', pg_temp.t(-10, '10:55'), pg_temp.t(-12, '18:30')),
  (2,  5, 6,  pg_temp.t(-9, '10:00'),  pg_temp.t(-9, '14:00'),  'devuelta',  NULL, pg_temp.t(-9, '13:50'), pg_temp.t(-11, '12:00')),
  (3,  6, 13, pg_temp.t(-8, '08:00'),  pg_temp.t(-8, '10:00'),  'devuelta',  NULL, pg_temp.t(-8, '09:40'), pg_temp.t(-10, '16:20')),
  (4,  7, 19, pg_temp.t(-7, '16:00'),  pg_temp.t(-7, '19:00'),  'devuelta',  NULL, pg_temp.t(-7, '19:00'), pg_temp.t(-9, '09:15')),
  (5,  4, 12, pg_temp.t(-6, '11:00'),  pg_temp.t(-6, '13:00'),  'devuelta',  NULL, pg_temp.t(-6, '14:30'), pg_temp.t(-8, '11:00')),   -- tardía
  (6,  8, 5,  pg_temp.t(-5, '09:00'),  pg_temp.t(-5, '13:00'),  'devuelta',  NULL, pg_temp.t(-5, '15:00'), pg_temp.t(-7, '10:30')),   -- tardía
  (7,  9, 17, pg_temp.t(-4, '10:00'),  pg_temp.t(-4, '12:00'),  'devuelta',  NULL, pg_temp.t(-4, '11:30'), pg_temp.t(-6, '13:45')),
  (8,  10, 22, pg_temp.t(-3, '13:00'), pg_temp.t(-3, '15:00'),  'devuelta',  NULL, pg_temp.t(-3, '14:55'), pg_temp.t(-5, '17:00')),
  (9,  5, 9,  pg_temp.t(-2, '12:00'),  pg_temp.t(-2, '15:00'),  'devuelta',  NULL, pg_temp.t(-2, '15:10'), pg_temp.t(-4, '09:00')),
  (10, 6, 11, pg_temp.t(-1, '14:00'),  pg_temp.t(-1, '18:00'),  'aprobada',  'Recógelo en el laboratorio 10 minutos antes.', NULL, pg_temp.t(-3, '12:10')),  -- vencido
  (11, 7, 8,  pg_temp.t(-1, '10:00'),  pg_temp.t(-1, '13:00'),  'aprobada',  NULL, NULL, pg_temp.t(-3, '15:30')),                                              -- vencido
  (12, 8, 3,  pg_temp.t(-3, '09:00'),  pg_temp.t(-3, '11:00'),  'rechazada', 'El equipo está en mantenimiento.', NULL, pg_temp.t(-5, '10:20')),
  (13, 9, 16, pg_temp.t(-2, '09:00'),  pg_temp.t(-2, '11:00'),  'cancelada', NULL, NULL, pg_temp.t(-4, '11:40')),
  (14, 4, 1,  pg_temp.t(1, '09:00'),   pg_temp.t(1, '11:00'),   'aprobada',  'Recógelo en Lab. Cómputo A con tu credencial.', NULL, pg_temp.t(-2, '14:00')),
  (15, 5, 19, pg_temp.t(1, '10:00'),   pg_temp.t(1, '14:00'),   'aprobada',  NULL, NULL, pg_temp.t(-2, '16:45')),
  (16, 10, 21, pg_temp.t(2, '15:00'),  pg_temp.t(2, '17:00'),   'aprobada',  NULL, NULL, pg_temp.t(-1, '09:30')),
  (17, 3, 6,  pg_temp.t(2, '09:00'),   pg_temp.t(2, '12:00'),   'aprobada',  'Trae tu propia tarjeta SD si la necesitas.', NULL, pg_temp.t(-1, '11:15')),
  (18, 3, 4,  pg_temp.t(3, '08:00'),   pg_temp.t(3, '12:00'),   'aprobada',  NULL, NULL, pg_temp.t(-1, '13:00')),
  (19, 3, 1,  pg_temp.t(1, '12:00'),   pg_temp.t(1, '14:00'),   'pendiente', NULL, NULL, pg_temp.t(-1, '17:05')),
  (20, 4, 2,  pg_temp.t(1, '09:00'),   pg_temp.t(1, '10:30'),   'pendiente', NULL, NULL, pg_temp.t(-1, '18:20')),
  (21, 5, 13, pg_temp.t(2, '08:00'),   pg_temp.t(2, '10:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '20 hours'),
  (22, 6, 14, pg_temp.t(2, '10:00'),   pg_temp.t(2, '13:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '14 hours'),
  (23, 7, 7,  pg_temp.t(3, '14:00'),   pg_temp.t(3, '16:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '9 hours'),
  (24, 8, 22, pg_temp.t(1, '16:00'),   pg_temp.t(1, '18:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '6 hours'),
  (25, 9, 23, pg_temp.t(1, '16:00'),   pg_temp.t(1, '18:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '5 hours'),
  (26, 10, 18, pg_temp.t(4, '09:00'),  pg_temp.t(4, '11:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '3 hours'),
  (27, 3, 17, pg_temp.t(5, '10:00'),   pg_temp.t(5, '14:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '2 hours'),
  (28, 4, 24, pg_temp.t(4, '11:00'),   pg_temp.t(4, '13:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '90 minutes'),
  (29, 6, 12, pg_temp.t(3, '09:00'),   pg_temp.t(3, '12:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '45 minutes'),
  (30, 5, 16, pg_temp.t(2, '13:00'),   pg_temp.t(2, '15:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '20 minutes'),
  (31, 7, 15, pg_temp.t(2, '09:00'),   pg_temp.t(2, '11:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '2 days'),                -- recurso en mantenimiento
  (32, 8, 10, pg_temp.t(3, '10:00'),   pg_temp.t(3, '12:00'),   'pendiente', NULL, NULL, NOW() - INTERVAL '2 days 3 hours');       -- recurso en baja

INSERT INTO sanciones (usuario_id, solicitud_id, motivo, vigente_hasta, activa, motivo_condonacion) VALUES
  (4, 5,    'Devolución tardía: Osciloscopio Tektronix TBS1052 (B), 1 h 30 min de retraso.', CURRENT_DATE + 7,  TRUE,  NULL),
  (8, 6,    'Devolución tardía: Laptop Lenovo ThinkPad T14, 2 h de retraso.',                CURRENT_DATE + 10, TRUE,  NULL),
  (5, NULL, 'Daño leve en equipo devuelto (cable HDMI).',                                    CURRENT_DATE - 5,  FALSE, 'Condonada por el administrador: el estudiante repuso el cable.'),
  (9, NULL, 'No entregó la credencial en resguardo al recoger el equipo.',                   CURRENT_DATE + 3,  TRUE,  NULL);

-- Las filas se insertaron con id explícito: se avanzan las secuencias para que los próximos ids no choquen
SELECT setval(pg_get_serial_sequence('usuarios', 'id'),    (SELECT MAX(id) FROM usuarios));
SELECT setval(pg_get_serial_sequence('recursos', 'id'),    (SELECT MAX(id) FROM recursos));
SELECT setval(pg_get_serial_sequence('solicitudes', 'id'), (SELECT MAX(id) FROM solicitudes));

\endif