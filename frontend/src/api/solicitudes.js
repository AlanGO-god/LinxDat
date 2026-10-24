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
