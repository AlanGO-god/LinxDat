import Icon from './Icon.jsx';

// Los demás módulos se activarán conforme se implementen sus historias de usuario.
const MENU = [
  { icono: 'box', titulo: 'Recursos', activo: true },
  { icono: 'users', titulo: 'Usuarios (próximamente)' },
  { icono: 'clock', titulo: 'Historial (próximamente)' },
  { icono: 'briefcase', titulo: 'Préstamos (próximamente)' },
  { icono: 'info', titulo: 'Ayuda (próximamente)' },
];

export default function Layout({ children }) {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Instituto Tecnológico de Celaya (TecNM)</h1>
      </header>
      <div className="cuerpo">
        <nav className="sidebar" aria-label="Menú principal">
          {MENU.map((item) => (
            <button
              key={item.icono}
              className={`sidebar__item ${item.activo ? 'is-activo' : ''}`}
              title={item.titulo}
              disabled={!item.activo}
            >
              <Icon name={item.icono} size={20} />
            </button>
          ))}
        </nav>
        <main className="contenido">{children}</main>
      </div>
    </div>
  );
}