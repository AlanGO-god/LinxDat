// Etiquetas del catálogo (las del diseño). "baja" no se muestra al estudiante.
export const ESTADOS_CATALOGO = {
  disponible: 'Disponible',
  prestado: 'En Préstamo',
  en_mantenimiento: 'Mantenimiento',
};

export default function CatalogoBadge({ estado }) {
  return (
    <span className={`cat-badge cat-badge--${estado}`}>{ESTADOS_CATALOGO[estado] ?? estado}</span>
  );
}
