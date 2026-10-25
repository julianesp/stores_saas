-- Preferencia por tienda: enviar recordatorios de fiado por correo a los
-- clientes (3 días antes, el día que vence y semanal si ya venció).
-- Activo por defecto. El aviso al tendero (correo + Telegram) no depende de esto.
ALTER TABLE email_preferences ADD COLUMN debt_reminders_enabled INTEGER DEFAULT 1;
