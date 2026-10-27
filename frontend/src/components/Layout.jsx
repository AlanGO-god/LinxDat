import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// "roles": quién ve cada opción. Sin "ruta" = módulo aún no implementado (deshabilitado).
// Los demás módulos se activarán conforme se implementen sus historias de usuario.
const MENU = [
  { icono: 'box', titulo: 'Recursos', ruta: '/admin/recursos', roles: ['administrador'] },
  { icono: 'inbox', titulo: 'Solicitudes', ruta: '/admin/solicitudes', roles: ['administrador'] },
  { icono: 'box', titulo: 'Catálogo', ruta: '/catalogo', roles: ['estudiante'] },
  { icono: 'inbox', titulo: 'Mis solicitudes', ruta: '/mis-solicitudes', roles: ['estudiante'] },
  { icono: 'users', titulo: 'Usuarios (próximamente)', roles: ['administrador'] },
  { icono: 'clock', titulo: 'Historial (próximamente)', roles: ['administrador', 'estudiante'] },
  { icono: 'briefcase', titulo: 'Préstamos (próximamente)', roles: ['administrador', 'estudiante'] },
  { icono: 'info', titulo: 'Ayuda (próximamente)', roles: ['administrador', 'estudiante'] },
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const items = MENU.filter((m) => m.roles.includes(usuario.rol));

  return (
    <div className="app">
      <header className="topbar topbar--sesion">
        <h1>Instituto Tecnológico de Celaya (TecNM)</h1>
        <div className="topbar__usuario">
          <span>
            {usuario.nombre} · {usuario.rol}
          </span>
          <button className="btn btn--secundario btn--chico" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <div className="cuerpo">
        <nav className="sidebar" aria-label="Menú principal">
          {items.map((item) =>
            item.ruta ? (
              <NavLink
                key={item.titulo}
                to={item.ruta}
                className={({ isActive }) => `sidebar__item ${isActive ? 'is-activo' : ''}`}
                title={item.titulo}
              >
                <Icon name={item.icono} size={20} />
              </NavLink>
            ) : (
              <button key={item.titulo} className="sidebar__item" title={item.titulo} disabled>
                <Icon name={item.icono} size={20} />
              </button>
            )
          )}
        </nav>
        <main className="contenido">{children}</main>
      </div>
    </div>
  );
}