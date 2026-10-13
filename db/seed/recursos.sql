DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM recursos) THEN
    INSERT INTO recursos (nombre, tipo, ubicacion, estado) VALUES
      ('Proyector Epson X41+',       'Multimedia',  'Lab. Computo A',     'disponible'),
      ('Osciloscopio Tektronix',     'Laboratorio', 'Lab. Electrónica 1', 'prestado'),
      ('Aula Magna',                 'Espacio',     'Edif. Principal',    'disponible'),
      ('Laptop Dell XPS 15',         'Multimedia',  'Biblioteca',         'en_mantenimiento'),
      ('Laptop Dell XPS 15',         'Multimedia',  'Biblioteca',         'en_mantenimiento'),
      ('Osciloscopio Tektronix',     'Laboratorio', 'Lab. Electrónica 1', 'disponible'),
      ('Sala de juntas B',           'Espacio',     'Edif. Principal',    'baja');
  END IF;
END $$;