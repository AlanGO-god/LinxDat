-- Usuarios DE PRUEBA para el login (US01). Solo para desarrollo: cambiar/eliminar antes de publicar.
--   administrador@itcelaya.edu.mx  /  Admin123
--   estudiante@itcelaya.edu.mx     /  Estudiante123
-- Se puede ejecutar varias veces (no duplica):
--   docker compose exec db psql -U app_user -d recursos_db -f /seed/usuarios.sql
INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES
  ('Administrador Demo', 'administrador@itcelaya.edu.mx',
   '$2a$10$dxC5wHRY/TE3VqWf2YQo8ev/z7bgmkUIjgR.bgPGP/J0FIUGWIAxu', 'administrador'),
  ('Estudiante Demo', 'estudiante@itcelaya.edu.mx',
   '$2a$10$egugl6iJvI7eGO0i.1VquuiJudvtSU11dzRuNXvNwo7s7FddVuod.', 'estudiante')
ON CONFLICT (correo) DO NOTHING;