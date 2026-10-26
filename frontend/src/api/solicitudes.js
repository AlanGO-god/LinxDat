import { request } from './http.js';

// Horarios ya apartados de un recurso entre dos fechas (Date)
export function obtenerOcupacion(recursoId, desde, hasta) {
  const params = new URLSearchParams({
    recurso_id: recursoId,
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
  });
  return request(`/api/solicitudes/ocupacion?${params}`);
}

export const crearSolicitud = (datos) =>
  request('/api/solicitudes', { method: 'POST', body: JSON.stringify(datos) });

// Bandeja del administrador (US05)
export const listarSolicitudes = (estado = 'pendiente') =>
  request(`/api/solicitudes?${new URLSearchParams({ estado })}`);

export const decidirSolicitud = (id, decision, comentario) =>
  request(`/api/solicitudes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, comentario }),
  });


// Mis solicitudes del estudiante (US06)
export const listarMisSolicitudes = () => request('/api/solicitudes/mias');

export const cancelarSolicitud = (id) =>
  request(`/api/solicitudes/${id}/cancelar`, { method: 'PATCH' });
