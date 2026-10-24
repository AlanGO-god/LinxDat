import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { listarRecursos } from '../api/recursos.js';
import { TIPOS } from '../constants.js';

// Etiquetas del catálogo (las del diseño). "baja" no se muestra al estudiante.
const ESTADOS_CATALOGO = {
  disponible: 'Disponible',
  prestado: 'En Préstamo',
  en_mantenimiento: 'Mantenimiento',
};

function Badge({ estado }) {
  return <span className={`cat-badge cat-badge--${estado}`}>{ESTADOS_CATALOGO[estado]}</span>;
}

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

function DetalleModal({ recurso, onCerrar }) {
  const [aviso, setAviso] = useState('');
  const disponible = recurso.estado === 'disponible';

  return (
    <div className="overlay" onClick={onCerrar}>
      <div
        className="modal cat-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalles de ${recurso.nombre}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{recurso.nombre}</h2>
        <Badge estado={recurso.estado} />
        <dl className="cat-detalle">
          <dt>ID</dt><dd>{recurso.codigo}</dd>
          <dt>Tipo</dt><dd>{recurso.tipo}</dd>
          <dt>Ubicación</dt><dd>{recurso.ubicacion}</dd>
          <dt>Descripción</dt><dd>{recurso.descripcion || 'Sin descripción'}</dd>
          <dt>Condiciones de uso</dt><dd>{recurso.condiciones_uso || 'Sin condiciones registradas'}</dd>
        </dl>
        {aviso && <p className="lg__aviso">{aviso}</p>}
        <div className="modal__acciones">
          <button className="btn btn--secundario" onClick={onCerrar}>Cerrar</button>
          <button
            className="btn btn--primario"
            disabled={!disponible}
            title={disponible ? '' : 'Este recurso no está disponible para solicitud'}
            // TODO: conectar con el flujo de solicitud de préstamo (historia de usuario posterior)
            onClick={() => setAviso('La solicitud de préstamo se habilitará en una próxima historia de usuario.')}
          >
            Solicitar préstamo
          </button>
        </div>
      </div>
    </div>
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
  const [detalle, setDetalle] = useState(null);

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
          <TarjetaRecurso key={r.id} recurso={r} onDetalles={setDetalle} />
        ))}
      </div>

      {detalle && <DetalleModal recurso={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}