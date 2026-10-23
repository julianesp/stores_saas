-- Color del sistema elegido por cada tendero (ids de lib/accent.ts: teal,
-- bosque, mar, anil, ciruela, ladrillo, ocre, grafito). NULL = color por defecto.
ALTER TABLE user_profiles ADD COLUMN ui_accent TEXT;
