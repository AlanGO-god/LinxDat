import { request } from './http.js';

export const iniciarSesion = (correo, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) });

export const obtenerUsuarioActual = () => request('/api/auth/me');