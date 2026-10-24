// US05 - Bandeja de solicitudes pendientes del administrador (según mockup).
import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import { decidirSolicitud, listarSolicitudes } from '../api/solicitudes.js';
import { COMENTARIO_MAX } from '../constants.js';

const ORDENES = {
  creado_en: 'Fecha de envío',
  fecha_inicio: 'Fecha del préstamo',
};

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

// El recurso pudo pasar a mantenimiento o baja después de que se pidió
const recursoNoDisponible = (s) => ['en_mantenimiento', 'baja'].includes(s.recurso_estado);

function DecisionDialog({ solicitud, decision, onConfirmar, onCancelar }) {
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const rechazar = decision === 'rechazada';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !enviando && onCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancelar, enviando]);

  async function enviar(e) {
    e.preventDefault();
    if (rechazar && !comentario.trim()) {
      setError('Escribe el motivo del rechazo');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await onConfirmar(comentario.trim());
    } catch (err) {
      setError(Object.values(err.detalles || {})[0] || err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={() => !enviando && onCancelar()}>
      <form
        className={`modal bnd-dialogo ${rechazar ? 'bnd-dialogo--rechazo' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bnd-dialogo-titulo"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={enviar}
        noValidate
      >
        <h2 id="bnd-dialogo-titulo">
          {rechazar ? 'Rechazar' : 'Aprobar'} solicitud #{solicitud.id}
        </h2>
        <dl className="bnd-resumen">
          <dt>Estudiante</dt><dd>{solicitud.usuario_nombre}</dd>
          <dt>Recurso</dt><dd>{solicitud.recurso_nombre} ({solicitud.recurso_codigo})</dd>
          <dt>Préstamo</dt>
          <dd>
            {fmtFecha(solicitud.fecha_inicio)}, {fmtHora(solicitud.fecha_inicio)} – {fmtHora(solicitud.fecha_limite)}
          </dd>
        </dl>
        <label className="campo">
          <span>{rechazar ? 'Motivo del rechazo' : 'Comentario (opcional)'}</span>
          <textarea
            rows={4}
            maxLength={COMENTARIO_MAX}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={rechazar ? 'Ej. Equipo en mantenimiento…' : 'Ej. Recógelo en el laboratorio 10 minutos antes'}
            autoFocus
          />
          <small className="bnd-contador">{comentario.length}/{COMENTARIO_MAX}</small>
        </label>
        {error && <p className="alerta alerta--error" role="alert">{error}</p>}
        <div className="modal__acciones">
          <button type="button" className="btn btn--secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button className={`btn ${rechazar ? 'btn--peligro' : 'btn--primario'}`} disabled={enviando}>
            {enviando ? 'Guardando…' : rechazar ? 'Confirmar rechazo' : 'Confirmar aprobación'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BandejaSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [orden, setOrden] = useState('creado_en');
  const [version, setVersion] = useState(0); // sube para forzar recarga
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enRevision, setEnRevision] = useState(null); // { solicitud, decision }

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    listarSolicitudes('pendiente')
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

  const ordenadas = useMemo(
    () => [...solicitudes].sort((a, b) => new Date(a[orden]) - new Date(b[orden]) || a.id - b.id),
    [solicitudes, orden]
  );

  // Si falla, lanza el error para que el diálogo lo muestre
  async function confirmar(comentario) {
    const { solicitud, decision } = enRevision;
    try {
      await decidirSolicitud(solicitud.id, decision, comentario);
    } catch (err) {
      if (err.status === 409) setVersion((v) => v + 1); // otro administrador ya la decidió
      throw err;
    }
    setEnRevision(null);
    setAviso(
      `La solicitud #${solicitud.id} de ${solicitud.usuario_nombre} se ${decision === 'aprobada' ? 'aprobó' : 'rechazó'}.`
    );
    setVersion((v) => v + 1);
  }

  return (
    <section>
      <div className="encabezado">
        <h2>Bandeja de Solicitudes</h2>
        <button className="btn btn--secundario" onClick={() => setVersion((v) => v + 1)} disabled={cargando}>
          Actualizar
        </button>
      </div>

      <div className="herramientas">
        <p className="bnd-total">
          <strong>{solicitudes.length}</strong>{' '}
          {solicitudes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
        </p>
        <label className="filtro">
          Ordenar por
          <select value={orden} onChange={(e) => setOrden(e.target.value)}>
            {Object.entries(ORDENES).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </label>
      </div>

      {aviso && <div className="alerta alerta--ok">{aviso}</div>}
      {error && <div className="alerta alerta--error">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Estudiante</th>
              <th>Recurso</th>
              <th>Fecha del préstamo</th>
              <th>Enviada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>
                  {s.usuario_nombre}
                  <span className="bnd-sub">{s.usuario_correo}</span>
                </td>
                <td>
                  {s.recurso_nombre}
                  <span className="bnd-sub">
                    {s.recurso_codigo}
                    {recursoNoDisponible(s) && (
                      <> · <EstadoBadge estado={s.recurso_estado} /></>
                    )}
                  </span>
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
                  <div className="acciones">
                    <button
                      className="btn btn--primario btn--chico"
                      disabled={recursoNoDisponible(s)}
                      title={recursoNoDisponible(s) ? 'El recurso ya no está disponible' : 'Aprobar'}
                      onClick={() => setEnRevision({ solicitud: s, decision: 'aprobada' })}
                    >
                      <Icon name="check" size={14} /> Aprobar
                    </button>
                    <button
                      className="btn btn--peligro btn--chico"
                      onClick={() => setEnRevision({ solicitud: s, decision: 'rechazada' })}
                    >
                      <Icon name="x" size={14} /> Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && ordenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">
                  No hay solicitudes pendientes.
                </td>
              </tr>
            )}
            {cargando && ordenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">
                  Cargando…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enRevision && (
        <DecisionDialog
          solicitud={enRevision.solicitud}
          decision={enRevision.decision}
          onConfirmar={confirmar}
          onCancelar={() => setEnRevision(null)}
        />
      )}
    </section>
  );
}
