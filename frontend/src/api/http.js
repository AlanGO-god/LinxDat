// Cliente HTTP compartido: agrega el token de sesión y avisa cuando la sesión expira.
const CLAVE_TOKEN = 'linxdat_token';

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN);
export const guardarToken = (token) => localStorage.setItem(CLAVE_TOKEN, token);
export const borrarToken = () => localStorage.removeItem(CLAVE_TOKEN);

export async function request(url, options = {}) {
  const token = obtenerToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token vencido o inválido (no aplica al intento de login, que no lleva token)
    if (res.status === 401 && token) {
      borrarToken();
      window.dispatchEvent(new Event('auth:expirada'));
    }
    const err = new Error(data?.error || 'No se pudo completar la solicitud');
    err.detalles = data?.detalles || {};
    err.status = res.status;
    throw err;
  }
  return data;
}