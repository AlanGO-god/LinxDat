import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RUTA_POR_ROL, useAuth } from '../context/AuthContext.jsx';

// ---------- Iconos (SVG en línea, sin dependencias) ----------
function Svg({ children, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
function IconoEstudiante() {
  return (
    <Svg size={40}>
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M22 9v6" />
    </Svg>
  );
}
function IconoAdmin() {
  return (
    <Svg size={40}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </Svg>
  );
}
function IconoUsuario() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </Svg>
  );
}
function IconoCandado() {
  return (
    <Svg>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}
function IconoCheck() {
  return (
    <Svg size={16}>
      <path d="M5 12l5 5 9-10" />
    </Svg>
  );
}

// Imagen opcional: si el archivo no existe en /public, muestra el "fallback".
function Imagen({ src, alt, fallback, className }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return fallback;
  return <img src={src} alt={alt} className={className} onError={() => setFallo(true)} />;
}

const ROLES = [
  { valor: 'estudiante', etiqueta: 'Estudiante', Icono: IconoEstudiante },
  { valor: 'administrador', etiqueta: 'Administrador', Icono: IconoAdmin },
];

export default function Login() {
  const { usuario, cargando, login } = useAuth();
  const navigate = useNavigate();
  const [rol, setRol] = useState('estudiante');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <p className="cargando">Cargando…</p>;
  // Si ya hay sesión, se manda directo a la vista de su rol
  if (usuario) return <Navigate to={RUTA_POR_ROL[usuario.rol] ?? '/'} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setAviso('');
    if (!correo.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña');
      return;
    }
    setEnviando(true);
    try {
      const u = await login(correo.trim(), password, rol);
      navigate(RUTA_POR_ROL[u.rol] ?? '/', { replace: true }); // redirección por rol
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  // Funciones que aún no existen en el sistema (fuera de la US01)
  const proximamente = () => {
    setError('');
    setAviso('Esta función estará disponible próximamente.');
  };

  return (
    <div className="lg">
      {/* Panel izquierdo */}
      <section className="lg__izq">
        <div className="lg__logos">
          <Imagen
            src="/logo-linxdat.png"
            alt="LinxDat"
            className="lg__logo"
            fallback={<span className="lg__marca">LinxDat</span>}
          />
          <Imagen
            src="/logo-itc.png"
            alt="ITC"
            className="lg__logo"
            fallback={<span className="lg__marca">ITC</span>}
          />
        </div>
        <p className="lg__sistema">
          SISTEMA DE GESTIÓN DE RECURSOS –<br />
          <strong>INSTITUTO TECNOLÓGICO DE CELAYA</strong>
        </p>
        <p className="lg__lema">
          LinxDat: Tu acceso a los recursos universitarios de forma digital.
        </p>
        <Imagen
          src="/login-ilustracion.png"
          alt=""
          className="lg__ilustracion"
          fallback={<div className="lg__placeholder" aria-hidden="true" />}
        />
      </section>

      {/* Panel derecho */}
      <section className="lg__der">
        <form className="lg__form" onSubmit={enviar} noValidate>
          <h1 className="lg__titulo">Iniciar sesión</h1>

          <fieldset className="lg__roles">
            <legend className="lg__sr">Tipo de usuario</legend>
            {ROLES.map(({ valor, etiqueta, Icono }) => (
              <label key={valor} className={`lg__rol ${rol === valor ? 'is-sel' : ''}`}>
                <input
                  type="radio"
                  name="rol"
                  value={valor}
                  checked={rol === valor}
                  onChange={() => setRol(valor)}
                />
                <Icono />
                <span>{etiqueta}</span>
                {rol === valor && (
                  <span className="lg__check">
                    <IconoCheck />
                  </span>
                )}
              </label>
            ))}
          </fieldset>

          <label className="lg__campo">
            <IconoUsuario />
            <input
              type="email"
              placeholder="Correo institucional"
              aria-label="Correo institucional"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="lg__campo">
            <IconoCandado />
            <input
              type="password"
              placeholder="Contraseña"
              aria-label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="button" className="lg__link" onClick={proximamente}>
            Olvidé mi contraseña
          </button>

          {error && (
            <p className="lg__error" role="alert">
              {error}
            </p>
          )}
          {aviso && <p className="lg__aviso">{aviso}</p>}

          <button className="lg__btn" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>

          <p className="lg__pie">
            ¿No tienes cuenta?{' '}
            <button type="button" className="lg__link lg__link--inline" onClick={proximamente}>
              Regístrate.
            </button>
          </p>

          <button type="button" className="lg__regresar" onClick={() => navigate(-1)}>
            Regresar
          </button>
        </form>
      </section>
    </div>
  );
}