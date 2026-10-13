// Valores permitidos para los recursos. Para agregar un tipo nuevo, basta con añadirlo aquí
// (y en frontend/src/constants.js).
export const ESTADOS = ['disponible', 'prestado', 'en_mantenimiento', 'baja'];

// Estados que el administrador puede elegir al crear/editar.
// "prestado" lo asigna el flujo de préstamos (US05/US07) y "baja" se hace con DELETE.
export const ESTADOS_EDITABLES = ['disponible', 'en_mantenimiento'];

export const TIPOS = ['Multimedia', 'Laboratorio', 'Espacio'];