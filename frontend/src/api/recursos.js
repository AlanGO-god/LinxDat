async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || 'No se pudo completar la solicitud');
    err.detalles = data?.detalles || {};
    err.status = res.status;
    throw err;
  }
  return data;
}

export function listarRecursos({ estado = '', q = '' } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (q) params.set('q', q);
  const qs = params.toString();
  return request(`/api/recursos${qs ? `?${qs}` : ''}`);
}

export const crearRecurso = (datos) =>
  request('/api/recursos', { method: 'POST', body: JSON.stringify(datos) });

export const editarRecurso = (id, datos) =>
  request(`/api/recursos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });

// Baja lógica: el recurso deja de estar disponible para solicitud
export const darDeBajaRecurso = (id) => request(`/api/recursos/${id}`, { method: 'DELETE' });