import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import RecursoForm from '../components/RecursoForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ESTADOS } from '../constants.js';
import {
  listarRecursos,
  crearRecurso,
  editarRecurso,
  darDeBajaRecurso,
} from '../api/recursos.js';

const COLUMNAS = [
  { campo: 'codigo', titulo: 'ID' },
  { campo: 'nombre', titulo: 'Recurso' },
  { campo: 'tipo', titulo: 'Tipo' },
  { campo: 'ubicacion', titulo: 'Ubicación' },
  { campo: 'estado', titulo: 'Estado' },
];

export default function GestionRecursos() {
  const [recursos, setRecursos] = useState([]);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState(''); // búsqueda con retraso (debounce)
  const [orden, setOrden] = useState({ campo: 'codigo', dir: 'asc' });
  const [version, setVersion] = useState(0); // sube para forzar recarga
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aBaja, setABaja] = useState(null);

  // Debounce del buscador: espera 300 ms después de dejar de escribir
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Carga la lista cada vez que cambia el filtro, la búsqueda o después de un cambio
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
  }, [estado, q, version]);

  // El aviso de éxito se oculta solo
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const ordenados = useMemo(() => {
    const { campo, dir } = orden;
    const valor = (r) => (campo === 'estado' ? ESTADOS[r.estado] : r[campo]);
    return [...recursos].sort((a, b) => {
      const c = valor(a).localeCompare(valor(b), 'es', { numeric: true, sensitivity: 'base' });
      return dir === 'asc' ? c : -c;
    });
  }, [recursos, orden]);

  const ordenarPor = (campo) =>
    setOrden((o) => ({ campo, dir: o.campo === campo && o.dir === 'asc' ? 'desc' : 'asc' }));

  const abrirNuevo = () => {
    setEditando(null);
    setFormAbierto(true);
  };
  const abrirEdicion = (r) => {
    setEditando(r);
    setFormAbierto(true);
  };
  const cerrarForm = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  // Si falla, lanza el error para que el formulario lo muestre
  async function guardar(datos) {
    if (editando) {
      await editarRecurso(editando.id, datos);
      setAviso('Los cambios se guardaron correctamente.');
    } else {
      await crearRecurso(datos);
      setAviso('El recurso se agregó al catálogo.');
    }
    cerrarForm();
    setVersion((v) => v + 1);
  }

  async function confirmarBaja() {
    const recurso = aBaja;
    setABaja(null);
    try {
      await darDeBajaRecurso(recurso.id);
      setAviso(`"${recurso.nombre}" se dio de baja y ya no puede solicitarse.`);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    }
  }

  const flecha = (campo) => (orden.campo !== campo ? '↕' : orden.dir === 'asc' ? '▲' : '▼');

  return (
    <section>
      <div className="encabezado">
        <h2>Gestión de Inventario de Recursos</h2>
        <button className="btn btn--primario" onClick={abrirNuevo}>
          <Icon name="plus" size={16} /> Agregar recurso
        </button>
      </div>

      <div className="herramientas">
        <label className="filtro">
          Filtrar por Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>

        <div className="buscador">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Buscar por nombre, tipo o ubicación"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {aviso && <div className="alerta alerta--ok">{aviso}</div>}
      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              {COLUMNAS.map((c) => (
                <th key={c.campo}>
                  <button className="th-orden" onClick={() => ordenarPor(c.campo)}>
                    {c.titulo} <span aria-hidden="true">{flecha(c.campo)}</span>
                  </button>
                </th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((r) => {
              const enBaja = r.estado === 'baja';
              const prestado = r.estado === 'prestado';
              return (
                <tr key={r.id} className={enBaja ? 'fila--baja' : ''}>
                  <td>{r.codigo}</td>
                  <td>{r.nombre}</td>
                  <td>{r.tipo}</td>
                  <td>{r.ubicacion}</td>
                  <td>
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="icono icono--editar"
                        title={enBaja ? 'Un recurso dado de baja no puede editarse' : 'Editar'}
                        aria-label={`Editar ${r.nombre}`}
                        disabled={enBaja}
                        onClick={() => abrirEdicion(r)}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="icono icono--baja"
                        title={
                          enBaja
                            ? 'Ya está dado de baja'
                            : prestado
                              ? 'No se puede dar de baja un recurso prestado'
                              : 'Dar de baja'
                        }
                        aria-label={`Dar de baja ${r.nombre}`}
                        disabled={enBaja || prestado}
                        onClick={() => setABaja(r)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!cargando && ordenados.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">
                  No se encontraron recursos.
                </td>
              </tr>
            )}
            {cargando && (
              <tr>
                <td colSpan={6} className="vacio">
                  Cargando…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formAbierto && <RecursoForm recurso={editando} onGuardar={guardar} onCancelar={cerrarForm} />}

      {aBaja && (
        <ConfirmDialog
          titulo="Dar de baja recurso"
          mensaje={`¿Seguro que deseas dar de baja "${aBaja.nombre}" (${aBaja.codigo})? Dejará de estar disponible para solicitud.`}
          textoConfirmar="Dar de baja"
          onConfirmar={confirmarBaja}
          onCancelar={() => setABaja(null)}
        />
      )}
    </section>
  );
}