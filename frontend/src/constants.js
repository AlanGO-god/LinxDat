export const ESTADOS = {
  disponible: 'Disponible',
  prestado: 'Prestado',
  en_mantenimiento: 'En Mantenimiento',
  baja: 'Baja',
};

// Estados que el administrador puede elegir en el formulario
export const ESTADOS_EDITABLES = ['disponible', 'en_mantenimiento'];

export const TIPOS = ['Multimedia', 'Laboratorio', 'Espacio'];

// Solicitud de préstamo (US04): horario de atención y bloques de 30 minutos
export const HORA_APERTURA = 7;
export const HORA_CIERRE = 21;
export const MINUTOS_BLOQUE = 30;
export const DURACION_MAX_HORAS = 8;

// Revisión de solicitudes (US05)
export const COMENTARIO_MAX = 500;