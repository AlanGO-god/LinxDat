-- Esquema INICIAL de ejemplo, derivado del tablero de Trello (US01-US10).
-- Ajústenlo entre todos. Solo se ejecuta la primera vez que se crea el volumen.
-- Para reejecutarlo: docker compose down -v && docker compose up

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  correo        VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('estudiante', 'administrador')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
