import { useEffect } from 'react';

export default function ConfirmDialog({ titulo, mensaje, textoConfirmar, onConfirmar, onCancelar }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancelar]);

  return (
    <div className="overlay" onMouseDown={onCancelar}>
      <div
        className="modal modal--chico"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-titulo">{titulo}</h2>
        <p>{mensaje}</p>
        <div className="modal__acciones">
          <button className="btn btn--secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn btn--peligro" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}