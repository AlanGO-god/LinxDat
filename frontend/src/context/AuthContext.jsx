import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { iniciarSesion, obtenerUsuarioActual } from '../api/auth.js';
import { borrarToken, guardarToken, obtenerToken } from '../api/http.js';

const AuthContext = createContext(null);

// Vista inicial de cada rol (redirección tras el login)
export const RUTA_POR_ROL = {
  administrador: '/admin/recursos',
  estudiante: '/catalogo',
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(obtenerToken())); // validando sesión guardada

  // Al abrir la app: si hay token guardado, se valida con el backend
  useEffect(() => {
    if (!obtenerToken()) return;
    obtenerUsuarioActual()
      .then((r) => setUsuario(r.usuario))
      .catch(() => borrarToken())
      .finally(() => setCargando(false));
  }, []);

  // Si el backend responde 401 en cualquier petición, se cierra la sesión
  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('auth:expirada', alExpirar);
    return () => window.removeEventListener('auth:expirada', alExpirar);
  }, []);

  const login = useCallback(async (correo, password) => {
    const { token, usuario: u } = await iniciarSesion(correo, password);
    guardarToken(token);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    borrarToken();
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);