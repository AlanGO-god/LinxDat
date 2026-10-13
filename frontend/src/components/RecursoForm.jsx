import { useEffect, useState } from 'react';
import { ESTADOS, ESTADOS_EDITABLES, TIPOS } from '../constants.js';

const VACIO = {
  nombre: '',
  tipo: '',
  ubicacion: '',
  descripcion: '',
  condiciones_uso: '',
  estado: 'disponible',
};

function validar(v) {
  const e = {};
  if (!v.nombre.trim()) e.nombre = 'El nombre es obligatorio';
  if (!v.tipo) e.tipo = 'El tipo es obligatorio';
  if (!v.ubicacion.trim()) e.ubicacion = 'La ubicación es obligatoria';
  return e;
}

// recurso = null  -> modo "Agregar"; recurso = {...} -> modo "Editar"
export default function RecursoForm({ recurso, onGuardar, onCancelar }) {
  const [valores, setValores] = useState(() =>
    recurso
      ? {
          nombre: recurso.nombre,
          tipo: recurso.tipo,
          ubicacion: recurso.ubicacion,
          descripcion: recurso.descripcion ?? '',
          condiciones_uso: recurso.condiciones_uso ?? '',
          estado: recurso.estado,
        }
      : VACIO
  );
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Un recurso "prestado" no puede cambiar de estado manualmente
  const estadoEditable = !recurso || ESTADOS_EDITABLES.includes(recurso.estado);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancelar]);

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    const err = validar(valores);
    setErrores(err);
    setErrorGeneral('');
    if (Object.keys(err).length) return;

    const payload = { ...valores };
    if (!estadoEditable) delete payload.estado;

    setGuardando(true);
    try {
      await onGuardar(payload);
    } catch (ex) {
      setErrores(ex.detalles || {});
      setErrorGeneral(ex.message);
      setGuardando(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onCancelar}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-titulo"
        onSubmit={enviar}
        onMouseDown={(e) => e.stopPropagation()}
        noValidate
      >
        <h2 id="form-titulo">{recurso ? `Editar recurso ${recurso.codigo}` : 'Agregar recurso'}</h2>

        {errorGeneral && <div className="alerta alerta--error">{errorGeneral}</div>}

        <label className="campo">
          <span>Nombre *</span>
          <input value={valores.nombre} onChange={cambiar('nombre')} maxLength={160} autoFocus />
          {errores.nombre && <small className="campo__error">{errores.nombre}</small>}
        </label>

        <div className="fila">
          <label className="campo">
            <span>Tipo *</span>
            <select value={valores.tipo} onChange={cambiar('tipo')}>
              <option value="">Selecciona…</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errores.tipo && <small className="campo__error">{errores.tipo}</small>}
          </label>

          <label className="campo">
            <span>Estado</span>
            {estadoEditable ? (
              <select value={valores.estado} onChange={cambiar('estado')}>
                {ESTADOS_EDITABLES.map((k) => (
                  <option key={k} value={k}>
                    {ESTADOS[k]}
                  </option>
                ))}
              </select>
            ) : (
              <input value={ESTADOS[recurso.estado]} disabled />
            )}
          </label>
        </div>

        <label className="campo">
          <span>Ubicación *</span>
          <input value={valores.ubicacion} onChange={cambiar('ubicacion')} maxLength={160} />
          {errores.ubicacion && <small className="campo__error">{errores.ubicacion}</small>}
        </label>

        <label className="campo">
          <span>Descripción</span>
          <textarea rows={2} value={valores.descripcion} onChange={cambiar('descripcion')} />
        </label>

        <label className="campo">
          <span>Condiciones de uso</span>
          <textarea rows={2} value={valores.condiciones_uso} onChange={cambiar('condiciones_uso')} />
        </label>

        <div className="modal__acciones">
          <button type="button" className="btn btn--secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}