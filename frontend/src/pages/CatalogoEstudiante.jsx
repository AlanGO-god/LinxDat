import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Badge, { ESTADOS_CATALOGO } from '../components/CatalogoBadge.jsx';
import { listarRecursos } from '../api/recursos.js';
import { TIPOS } from '../constants.js';

function TarjetaRecurso({ recurso, onDetalles }) {
  return (
    <article className="cat-card">
      <h3 className="cat-card__titulo">{recurso.nombre}</h3>
      <p className="cat-card__dato"><strong>ID:</strong> {recurso.codigo}</p>
      <p className="cat-card__dato"><strong>Tipo:</strong> {recurso.tipo}</p>
      <p className="cat-card__dato cat-card__ubic">
        <Icon name="pin" size={14} /> {recurso.ubicacion}
      </p>
      <Badge estado={recurso.estado} />
      <button className="cat-btn" onClick={() => onDetalles(recurso)}>
        Ver Detalles
      </button>
    </article>
  );
}

export default function CatalogoEstudiante() {
  const [recursos, setRecursos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Debounce del buscador (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Opciones del filtro de ubicación (una sola vez, con el catálogo completo)
  useEffect(() => {
    listarRecursos()
      .then((todos) =>
        setUbicaciones(
          [...new Set(todos.filter((r) => r.estado !== 'baja').map((r) => r.ubicacion))].sort(
            (a, b) => a.localeCompare(b, 'es')
          )
        )
      )
      .catch(() => {});
  }, []);

  // Listado: estado y búsqueda se consultan al backend
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    listarRecursos({ estado, q })
      .then((datos) => {
        if (cancelado) return;
        setRecursos(datos);
        setError('');
      })
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [estado, q]);

  // Categoría y ubicación se filtran en el cliente; las bajas no se muestran
  const visibles = useMemo(
    () =>
      recursos.filter(
        (r) =>
          r.estado !== 'baja' &&
          (!tipo || r.tipo === tipo) &&
          (!ubicacion || r.ubicacion === ubicacion)
      ),
    [recursos, tipo, ubicacion]
  );

  return (
    <div className="cat">
      <div className="cat-buscador">
        <Icon name="search" size={20} />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder='Buscar recursos (ej. "Proyector Epson", "Multímetro")...'
          aria-label="Buscar recursos"
        />
      </div>

      <div className="cat-filtros">
        <label className="cat-filtro">
          <span>Categoría</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todas</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="cat-filtro">
          <span>Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_CATALOGO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </label>
        <label className="cat-filtro">
          <span>Ubicación</span>
          <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}>
            <option value="">Ubicación</option>
            {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="alerta alerta--error">{error}</p>}
      {cargando && <p className="cargando">Cargando recursos…</p>}

      {!cargando && !error && visibles.length === 0 && (
        <p className="cat-vacio">No se encontraron resultados para tu búsqueda.</p>
      )}

      <div className="cat-grid">
        {visibles.map((r) => (
          <TarjetaRecurso key={r.id} recurso={r} onDetalles={(recurso) => navigate(`/catalogo/${recurso.id}`)} />
        ))}
      </div>
    </div>
  );
}