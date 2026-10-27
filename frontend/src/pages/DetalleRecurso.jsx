// US04 - Detalle de un recurso y solicitud de préstamo (según mockup).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import CatalogoBadge from '../components/CatalogoBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerRecurso } from '../api/recursos.js';
import { crearSolicitud, obtenerOcupacion } from '../api/solicitudes.js';
import { DURACION_MAX_HORAS, HORA_APERTURA, HORA_CIERRE, MINUTOS_BLOQUE } from '../constants.js';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const APERTURA = HORA_APERTURA * 60;
const CIERRE = HORA_CIERRE * 60;

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const enMinuto = (dia, minutos) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, minutos);
const mismoDia = (a, b) => a && b && a.toDateString() === b.toDateString();

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fmtHora = (d) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtDia = (d) =>
  mayuscula(d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtMes = (d) => mayuscula(d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
const fmtMinutos = (min) => fmtHora(enMinuto(new Date(2000, 0, 1), min));

// Bloques del día que ya apartó alguien, recortados al día
function ocupadosDelDia(ocupados, dia) {
  const desde = inicioDelDia(dia);
  const hasta = sumarDias(desde, 1);
  return ocupados.filter((o) => o.inicio < hasta && o.fin > desde);
}

// Horas de inicio que se pueden elegir: futuras y fuera de un bloque ocupado
function opcionesInicio(dia, ocupadosDia, ahora) {
  const opciones = [];
  for (let m = APERTURA; m + MINUTOS_BLOQUE <= CIERRE; m += MINUTOS_BLOQUE) {
    const t = enMinuto(dia, m);
    if (t <= ahora) continue;
    if (ocupadosDia.some((o) => t >= o.inicio && t < o.fin)) continue;
    opciones.push(m);
  }
  return opciones;
}

// Horas de devolución: hasta el cierre, la duración máxima o el siguiente bloque ocupado
function opcionesFin(dia, inicio, ocupadosDia) {
  const tInicio = enMinuto(dia, inicio);
  const siguiente = ocupadosDia
    .filter((o) => o.inicio >= tInicio)
    .reduce((min, o) => (min && min < o.inicio ? min : o.inicio), null);
  const limite = Math.min(CIERRE, inicio + DURACION_MAX_HORAS * 60);
  const opciones = [];
  for (let m = inicio + MINUTOS_BLOQUE; m <= limite; m += MINUTOS_BLOQUE) {
    if (siguiente && enMinuto(dia, m) > siguiente) break;
    opciones.push(m);
  }
  return opciones;
}

// Cada renglón de "condiciones de uso" es una restricción (se quitan viñetas escritas a mano)
const restricciones = (texto) =>
  String(texto ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);

function Calendario({ mes, onMes, seleccionado, onSeleccionar, ocupados, hoy }) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const desfase = (primero.getDay() + 6) % 7; // la semana empieza en lunes
  const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const esMesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  const ahora = new Date();

  const celdas = [];
  for (let i = 0; i < desfase; i++) celdas.push(<span key={`v${i}`} />);
  for (let d = 1; d <= totalDias; d++) {
    const dia = new Date(mes.getFullYear(), mes.getMonth(), d);
    const pasado = dia < hoy;
    const ocupadosDia = pasado ? [] : ocupadosDelDia(ocupados, dia);
    const lleno = !pasado && opcionesInicio(dia, ocupadosDia, ahora).length === 0;
    const clases = [
      'det-cal__dia',
      ocupadosDia.length && !lleno ? 'is-parcial' : '',
      lleno ? 'is-lleno' : '',
      mismoDia(dia, seleccionado) ? 'is-sel' : '',
      mismoDia(dia, hoy) ? 'is-hoy' : '',
    ].join(' ');
    celdas.push(
      <button
        key={d}
        type="button"
        className={clases}
        disabled={pasado || lleno}
        onClick={() => onSeleccionar(dia)}
        aria-pressed={mismoDia(dia, seleccionado)}
        aria-label={`${fmtDia(dia)}${lleno ? ', sin horarios libres' : ''}`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="det-cal">
      <div className="det-cal__nav">
        <button
          type="button"
          className="det-cal__flecha"
          onClick={() => onMes(-1)}
          disabled={esMesActual}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong>{fmtMes(mes)}</strong>
        <button type="button" className="det-cal__flecha" onClick={() => onMes(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className="det-cal__grid">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="det-cal__cab">{d}</span>
        ))}
        {celdas}
      </div>
      <div className="det-cal__leyenda">
        <span><i className="det-cal__muestra" /> Libre</span>
        <span><i className="det-cal__muestra is-parcial" /> Con horarios ocupados</span>
        <span><i className="det-cal__muestra is-lleno" /> Sin horarios libres</span>
      </div>
    </div>
  );
}

export default function DetalleRecurso() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const hoy = useMemo(() => inicioDelDia(new Date()), []);

  const [recurso, setRecurso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [ocupados, setOcupados] = useState([]);
  const [dia, setDia] = useState(null);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorSolicitud, setErrorSolicitud] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    obtenerRecurso(id)
      .then((r) => !cancelado && (setRecurso(r), setError('')))
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const cargarOcupacion = useCallback(() => {
    const desde = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const hasta = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    return obtenerOcupacion(id, desde, hasta)
      .then((filas) =>
        setOcupados(filas.map((o) => ({ ...o, inicio: new Date(o.inicio), fin: new Date(o.fin) })))
      )
      .catch(() => setOcupados([]));
  }, [id, mes]);

  useEffect(() => {
    cargarOcupacion();
  }, [cargarOcupacion]);

  const ocupadosDia = useMemo(() => (dia ? ocupadosDelDia(ocupados, dia) : []), [ocupados, dia]);
  const inicios = useMemo(
    () => (dia ? opcionesInicio(dia, ocupadosDia, new Date()) : []),
    [dia, ocupadosDia]
  );
  const fines = useMemo(
    () => (dia && inicio !== '' ? opcionesFin(dia, Number(inicio), ocupadosDia) : []),
    [dia, inicio, ocupadosDia]
  );

  // Si cambia el día o la ocupación, se descartan horas que ya no son válidas
  useEffect(() => {
    if (inicio !== '' && !inicios.includes(Number(inicio))) setInicio('');
  }, [inicios, inicio]);
  useEffect(() => {
    if (fin !== '' && !fines.includes(Number(fin))) setFin('');
  }, [fines, fin]);

  // La ocupación se carga por mes: al cambiar de mes se limpia el día elegido
  const cambiarMes = (delta) => {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    elegirDia(null);
  };

  const elegirDia = (d) => {
    setDia(d);
    setInicio('');
    setFin('');
    setErrorSolicitud('');
  };

  const elegirInicio = (valor) => {
    setInicio(valor);
    setErrorSolicitud('');
    if (valor === '') return setFin('');
    const posibles = opcionesFin(dia, Number(valor), ocupadosDia);
    const sugerida = Number(valor) + 60; // por defecto, una hora
    setFin(String(posibles.includes(sugerida) ? sugerida : posibles[0] ?? ''));
  };

  async function enviar(e) {
    e.preventDefault();
    if (!dia || inicio === '' || fin === '') {
      setErrorSolicitud('Elige un día en el calendario y el horario del préstamo');
      return;
    }
    setEnviando(true);
    setErrorSolicitud('');
    try {
      const solicitud = await crearSolicitud({
        recurso_id: recurso.id,
        fecha_inicio: enMinuto(dia, Number(inicio)).toISOString(),
        fecha_limite: enMinuto(dia, Number(fin)).toISOString(),
      });
      setConfirmacion(solicitud);
      setInicio('');
      setFin('');
      cargarOcupacion();
    } catch (err) {
      const detalle = Object.values(err.detalles || {})[0];
      setErrorSolicitud(detalle || err.message);
      if (err.status === 409) cargarOcupacion(); // el horario se ocupó mientras elegía
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <p className="cargando">Cargando recurso…</p>;
  if (error || !recurso || recurso.estado === 'baja') {
    return (
      <div className="det">
        <p className="alerta alerta--error">{error || 'Este recurso ya no forma parte del catálogo'}</p>
        <Link to="/catalogo" className="btn btn--secundario det-volver">Volver al catálogo</Link>
      </div>
    );
  }

  const listaRestricciones = restricciones(recurso.condiciones_uso);
  const disponible = recurso.estado === 'disponible';
  const esEstudiante = usuario?.rol === 'estudiante';

  return (
    <div className="det">
      <nav className="det-migas" aria-label="Ruta">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">›</span>
        <span>{recurso.nombre}</span>
      </nav>

      <section className="det-card det-cabecera">
        <div className="det-cabecera__icono" aria-hidden="true">
          <Icon name="box" size={56} />
        </div>
        <div className="det-cabecera__info">
          <p className="det-codigo">{recurso.codigo}</p>
          <h2>{recurso.nombre}</h2>
          <p className="det-estado">
            <strong>Estado:</strong> <CatalogoBadge estado={recurso.estado} />
          </p>
          <dl className="det-datos">
            <dt>Categoría</dt><dd>{recurso.tipo}</dd>
            <dt>Ubicación</dt>
            <dd className="det-datos__ubic"><Icon name="pin" size={14} /> {recurso.ubicacion}</dd>
            <dt>Descripción</dt><dd>{recurso.descripcion || 'Sin descripción'}</dd>
          </dl>
        </div>
      </section>

      <div className="det-grid">
        <section className="det-card">
          <h3 className="det-card__titulo">Condiciones de Uso</h3>
          {listaRestricciones.length ? (
            <div className="det-restricciones" role="note">
              <p className="det-restricciones__aviso">
                <Icon name="info" size={18} /> Este recurso tiene restricciones de uso. Revísalas antes de solicitarlo.
              </p>
              <ul>
                {listaRestricciones.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ) : (
            <p className="det-muted">Este recurso no tiene restricciones de uso registradas.</p>
          )}
        </section>

        <section className="det-card">
          <h3 className="det-card__titulo">Disponibilidad</h3>
          <Calendario
            mes={mes}
            onMes={cambiarMes}
            seleccionado={dia}
            onSeleccionar={elegirDia}
            ocupados={ocupados}
            hoy={hoy}
          />
          {dia && (
            <div className="det-ocupados">
              <p className="det-ocupados__dia">{fmtDia(dia)}</p>
              {ocupadosDia.length ? (
                <ul>
                  {ocupadosDia.map((o, i) => (
                    <li key={i}>
                      <Icon name="clock" size={14} /> {fmtHora(o.inicio)} – {fmtHora(o.fin)}{' '}
                      <span className="det-muted">({o.estado === 'aprobada' ? 'prestado' : 'apartado'})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="det-muted">No hay horarios ocupados este día.</p>
              )}
            </div>
          )}
        </section>

        <section className="det-card">
          <h3 className="det-card__titulo">Solicitar este Recurso</h3>

          {confirmacion && (
            <div className="alerta alerta--ok det-confirmacion" role="status">
              <strong>¡Tu solicitud se envió!</strong>
              <span>
                {fmtDia(new Date(confirmacion.fecha_inicio))}, de {fmtHora(new Date(confirmacion.fecha_inicio))} a{' '}
                {fmtHora(new Date(confirmacion.fecha_limite))}
              </span>
              <span>Estado: <strong>Pendiente</strong> de aprobación por el administrador.</span>
              <span><Link to="/mis-solicitudes">Ver mis solicitudes</Link></span>
            </div>
          )}

          {!disponible ? (
            <p className="alerta alerta--error">
              Este recurso no está disponible para solicitud en este momento.
            </p>
          ) : !esEstudiante ? (
            <p className="det-muted">Solo los estudiantes pueden solicitar préstamos.</p>
          ) : (
            <form className="det-form" onSubmit={enviar} noValidate>
              <label className="campo">
                <span>Fecha</span>
                <input type="text" readOnly value={dia ? fmtDia(dia) : ''} placeholder="Elige un día en el calendario" />
              </label>
              <div className="fila">
                <label className="campo">
                  <span>Hora de inicio</span>
                  <select value={inicio} onChange={(e) => elegirInicio(e.target.value)} disabled={!dia}>
                    <option value="">--:--</option>
                    {inicios.map((m) => <option key={m} value={m}>{fmtMinutos(m)}</option>)}
                  </select>
                </label>
                <label className="campo">
                  <span>Hora de devolución</span>
                  <select value={fin} onChange={(e) => setFin(e.target.value)} disabled={inicio === ''}>
                    <option value="">--:--</option>
                    {fines.map((m) => <option key={m} value={m}>{fmtMinutos(m)}</option>)}
                  </select>
                </label>
              </div>
              {dia && inicios.length === 0 && (
                <p className="det-muted">No quedan horarios libres este día.</p>
              )}
              {errorSolicitud && <p className="alerta alerta--error" role="alert">{errorSolicitud}</p>}
              {listaRestricciones.length > 0 && (
                <p className="det-muted det-form__nota">
                  Al solicitar aceptas las condiciones de uso de este recurso.
                </p>
              )}
              <button className="btn btn--primario det-form__btn" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Solicitar Préstamo'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
