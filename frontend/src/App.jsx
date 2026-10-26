import { Navigate, Route, Routes } from 'react-router-dom';
import { RUTA_POR_ROL, useAuth } from './context/AuthContext.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Login from './pages/Login.jsx';
import GestionRecursos from './pages/GestionRecursos.jsx';
import CatalogoEstudiante from './pages/CatalogoEstudiante.jsx';
import DetalleRecurso from './pages/DetalleRecurso.jsx';
import BandejaSolicitudes from './pages/BandejaSolicitudes.jsx';

// "/" manda a cada usuario a la vista de su rol (o al login si no hay sesión)
function Inicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p className="cargando">Cargando…</p>;
  return <Navigate to={usuario ? RUTA_POR_ROL[usuario.rol] ?? '/login' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/Login" element={<Login />} />
      <Route
        path="/admin/recursos"
        element={
          <RutaProtegida roles={['administrador']}>
            <GestionRecursos />
          </RutaProtegida>
        }
      />
      <Route
        path="/admin/solicitudes"
        element={
          <RutaProtegida roles={['administrador']}>
            <BandejaSolicitudes />
          </RutaProtegida>
        }
      />
      <Route
        path="/catalogo"
        element={
          <RutaProtegida roles={['estudiante', 'administrador']}>
            <CatalogoEstudiante />
          </RutaProtegida>
        }
      />
      <Route
        path="/catalogo/:id"
        element={
          <RutaProtegida roles={['estudiante', 'administrador']}>
            <DetalleRecurso />
          </RutaProtegida>
        }
      />
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}