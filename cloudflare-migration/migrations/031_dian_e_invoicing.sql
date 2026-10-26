-- El tendero indica que ya factura electrónicamente / es responsable de IVA:
-- el aviso de topes DIAN del dashboard deja de mostrarse como alarma.
-- 0 = no (por defecto), 1 = sí. Ver routes/dian-thresholds.ts.
ALTER TABLE user_profiles ADD COLUMN dian_e_invoicing INTEGER DEFAULT 0;

-- Último aviso de topes enviado por Telegram/correo, como 'AAAA:nivel'
-- (aviso, importante, obligado). Se avisa solo al subir de nivel en el año.
ALTER TABLE user_profiles ADD COLUMN dian_alert_sent TEXT;
