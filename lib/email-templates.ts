/**
 * Plantillas de email para el sistema
 */

export interface TeamInvitationEmailData {
  inviterName: string;
  inviterEmail: string;
  storeName: string;
  roleName: string;
  invitationLink: string;
  expiresInDays: number;
}

export function getTeamInvitationEmailHtml(data: TeamInvitationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación al Equipo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Invitación al Equipo</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">¡Hola!</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${data.inviterName}</strong> (${data.inviterEmail}) te ha invitado a unirte al equipo de
      <strong style="color: #667eea;">${data.storeName}</strong> como <strong>${data.roleName}</strong>.
    </p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong>Rol:</strong> ${data.roleName}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
        <strong>Tienda:</strong> ${data.storeName}
      </p>
    </div>

    <p style="font-size: 16px; margin-bottom: 25px;">
      Para aceptar la invitación y crear tu cuenta, haz clic en el botón de abajo:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.invitationLink}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        Aceptar Invitación
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
      O copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px;">
      ${data.invitationLink}
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
        ⏰ Esta invitación expirará en ${data.expiresInDays} días.
      </p>
      <p style="font-size: 13px; color: #9ca3af; margin: 5px 0;">
        ℹ️ Si no solicitaste esta invitación, puedes ignorar este correo de forma segura.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">Sistema POS - Gestión de Tiendas</p>
    <p style="margin: 5px 0;">Este es un correo automático, por favor no responder.</p>
  </div>
</body>
</html>
  `.trim();
}

export function getTeamInvitationEmailText(data: TeamInvitationEmailData): string {
  return `
¡Hola!

${data.inviterName} (${data.inviterEmail}) te ha invitado a unirte al equipo de ${data.storeName} como ${data.roleName}.

Para aceptar la invitación y crear tu cuenta, visita el siguiente enlace:

${data.invitationLink}

Esta invitación expirará en ${data.expiresInDays} días.

Si no solicitaste esta invitación, puedes ignorar este correo de forma segura.

---
Sistema POS - Gestión de Tiendas
Este es un correo automático, por favor no responder.
  `.trim();
}
