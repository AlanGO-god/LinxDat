import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RUTA_POR_ROL, useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { usuario, cargando, login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <p className="cargando">Cargando…</p>;
  // Si ya hay sesión, se manda directo a la vista de su rol
  if (usuario) return <Navigate to={RUTA_POR_ROL[usuario.rol] ?? '/'} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!correo.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña');
      return;
    }
    setEnviando(true);
    try {
      const u = await login(correo.trim(), password);
      navigate(RUTA_POR_ROL[u.rol] ?? '/', { replace: true }); // redirección por rol
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <header className="topbar">
        <h1>Instituto Tecnológico de Celaya (TecNM)</h1>
      </header>
      <main className="login__centro">
        <form className="login__tarjeta" onSubmit={enviar} noValidate>
          <h2>Iniciar sesión</h2>
          <p className="login__sub">Préstamo de recursos institucionales</p>

          <label className="campo">
            <span>Correo institucional</span>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn--primario login__btn" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </main>
    </div>
  );
}