import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';
import AccesoDenegado from '../pages/AccesoDenegado.jsx';

// Solo deja pasar a usuarios con sesión y, si se indican "roles", con alguno de esos roles.
export default function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <Layout>
        <AccesoDenegado />
      </Layout>
    );
  }
  return <Layout>{children}</Layout>;
}