// US06 - El estudiante consulta el estado de sus solicitudes, cancela las pendientes
// y ve el aviso de recogida en las aprobadas.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { cancelarSolicitud, listarMisSolicitudes } from '../api/solicitudes.js';
import { ESTADOS_SOLICITUD } from '../constants.js';

const FILTROS = { todas: 'Todas', ...ESTADOS_SOLICITUD };

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

function SolicitudBadge({ estado }) {
  return <span className={`sol-badge sol-badge--${estado}`}>{ESTADOS_SOLICITUD[estado] ?? estado}</span>;
}

// Texto de apoyo según el estado actual de la solicitud
function Nota({ s }) {
  if (s.estado === 'pendiente') {
    return <span className="bnd-sub">En espera de la revisión del administrador.</span>;
  }
  if (s.estado === 'aprobada') {
    return (
      <span className="sol-recogida" role="status">
        <Icon name="check" size={14} /> ¡Aprobada! Tu recurso ya puede ser recogido
        {s.recurso_ubicacion ? <> en {s.recurso_ubicacion}</> : null}.
        {s.comentario_admin && <em> Nota del administrador: {s.comentario_admin}</em>}
      </span>
    );
  }
  if (s.estado === 'rechazada') {
    return (
      <span className="bnd-sub">
        Motivo: {s.comentario_admin || 'sin comentario del administrador'}
      </span>
    );
  }
  if (s.estado === 'cancelada') return <span className="bnd-sub">Cancelaste esta solicitud.</span>;
  return null;
}

export default function MisSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [version, setVersion] = useState(0); // sube para forzar recarga
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [porCancelar, setPorCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    listarMisSolicitudes()
      .then((datos) => {
        if (cancelado) return;
        setSolicitudes(datos);
        setError('');
      })
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [version]);

  // El aviso de éxito se oculta solo
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const visibles = useMemo(
    () => solicitudes.filter((s) => filtro === 'todas' || s.estado === filtro),
    [solicitudes, filtro]
  );

  async function confirmarCancelacion() {
    const s = porCancelar;
    setCancelando(true);
    try {
      await cancelarSolicitud(s.id);
      setAviso(`Tu solicitud #${s.id} de ${s.recurso_nombre} se canceló.`);
      setError('');
    } catch (err) {
      // 409: el administrador la decidió mientras tanto; se recarga para mostrar su estado real
      setError(err.message);
    } finally {
      setCancelando(false);
      setPorCancelar(null);
      setVersion((v) => v + 1);
    }
  }

  return (
    <section>
      <div className="encabezado">
        <h2>Mis Solicitudes</h2>
        <button className="btn btn--secundario" onClick={() => setVersion((v) => v + 1)} disabled={cargando}>
          Actualizar
        </button>
      </div>

      <div className="herramientas">
        <p className="bnd-total">
          <strong>{visibles.length}</strong> {visibles.length === 1 ? 'solicitud' : 'solicitudes'}
        </p>
        <label className="filtro">
          Estado
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {Object.entries(FILTROS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </label>
      </div>

      {aviso && <div className="alerta alerta--ok" role="status">{aviso}</div>}
      {error && <div className="alerta alerta--error" role="alert">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Recurso</th>
              <th>Fecha del préstamo</th>
              <th>Enviada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>
                  {s.recurso_nombre}
                  <span className="bnd-sub">{s.recurso_codigo}</span>
                </td>
                <td>
                  {fmtFecha(s.fecha_inicio)}
                  <span className="bnd-sub">
                    {fmtHora(s.fecha_inicio)} – {fmtHora(s.fecha_limite)}
                  </span>
                </td>
                <td>
                  {fmtFecha(s.creado_en)}
                  <span className="bnd-sub">{fmtHora(s.creado_en)}</span>
                </td>
                <td>
                  <SolicitudBadge estado={s.estado} />
                  <Nota s={s} />
                </td>
                <td>
                  {/* Solo las pendientes se pueden cancelar */}
                  {s.estado === 'pendiente' ? (
                    <button className="btn btn--peligro btn--chico" onClick={() => setPorCancelar(s)}>
                      <Icon name="x" size={14} /> Cancelar
                    </button>
                  ) : (
                    <span className="bnd-sub">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">
                  {solicitudes.length === 0 ? (
                    <>Aún no has hecho solicitudes. <Link to="/catalogo">Ir al catálogo</Link></>
                  ) : (
                    'No hay solicitudes con ese estado.'
                  )}
                </td>
              </tr>
            )}
            {cargando && visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">Cargando…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {porCancelar && (
        <ConfirmDialog
          titulo={`Cancelar solicitud #${porCancelar.id}`}
          mensaje={`¿Seguro que quieres cancelar tu solicitud de ${porCancelar.recurso_nombre} del ${fmtFecha(
            porCancelar.fecha_inicio
          )}? El horario quedará libre para otros estudiantes.`}
          textoConfirmar={cancelando ? 'Cancelando…' : 'Sí, cancelar solicitud'}
          onConfirmar={() => !cancelando && confirmarCancelacion()}
          onCancelar={() => !cancelando && setPorCancelar(null)}
        />
      )}
    </section>
  );
}
