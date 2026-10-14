import { Link } from 'react-router-dom';
import { RUTA_POR_ROL, useAuth } from '../context/AuthContext.jsx';

export default function AccesoDenegado() {
  const { usuario } = useAuth();
  return (
    <div className="aviso-pagina" role="alert">
      <h2>Acceso denegado</h2>
      <p>No tienes permiso para usar esta función con tu rol ({usuario.rol}).</p>
      <Link className="btn btn--primario" to={RUTA_POR_ROL[usuario.rol] ?? '/login'}>
        Volver a mi vista
      </Link>
    </div>
  );
}