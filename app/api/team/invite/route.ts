import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Permission } from '@/lib/types';
import { validateCustomPermissions, ROLE_DEFINITIONS } from '@/lib/permissions';
import { getUserProfile } from '@/lib/cloudflare-api';
import { Resend } from 'resend';
import { getTeamInvitationEmailHtml, getTeamInvitationEmailText } from '@/lib/email-templates';
import crypto from 'crypto';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/team/invite
 * Crea una invitación para un nuevo miembro del equipo
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();
    const body = await request.json();

    const { email, full_name, role, permissions } = body;

    // Validaciones
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email y rol son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Validar rol
    if (!['admin', 'cajero', 'custom'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    // Validar permisos personalizados
    if (role === 'custom') {
      if (!permissions || !Array.isArray(permissions)) {
        return NextResponse.json(
          { error: 'Los permisos son requeridos para el rol personalizado' },
          { status: 400 }
        );
      }

      const validation = validateCustomPermissions(permissions as Permission[]);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Permisos inválidos', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Generar token único para la invitación
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Crear la invitación en la base de datos
    const response = await fetch(`${API_URL}/api/team-invitations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        full_name,
        role,
        permissions: permissions || [],
        token: invitationToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear la invitación');
    }

    const invitation = await response.json();

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/team/accept-invitation?token=${invitationToken}`;

    // Enviar email de invitación
    try {
      // Obtener información del usuario que invita
      const userProfile = await getUserProfile(getToken);
      const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);

      await resend.emails.send({
        from: 'Sistema POS <noreply@posib.dev>',
        to: email,
        subject: `Invitación al equipo de ${userProfile?.store_name || 'Sistema POS'}`,
        html: getTeamInvitationEmailHtml({
          inviterName: userProfile?.full_name || userProfile?.email || 'Tu administrador',
          inviterEmail: userProfile?.email || '',
          storeName: userProfile?.store_name || 'Sistema POS',
          roleName: roleDef?.name || role,
          invitationLink,
          expiresInDays: 7,
        }),
        text: getTeamInvitationEmailText({
          inviterName: userProfile?.full_name || userProfile?.email || 'Tu administrador',
          inviterEmail: userProfile?.email || '',
          storeName: userProfile?.store_name || 'Sistema POS',
          roleName: roleDef?.name || role,
          invitationLink,
          expiresInDays: 7,
        }),
      });

      console.log('✅ Email de invitación enviado a:', email);
    } catch (emailError) {
      console.error('❌ Error al enviar email de invitación:', emailError);
      // No fallar la invitación si el email falla, solo logear el error
    }

    return NextResponse.json({
      invitation,
      invitationLink,
      message: 'Invitación creada exitosamente',
    });
  } catch (error) {
    console.error('Error en POST /api/team/invite:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al crear la invitación'
      },
      { status: 500 }
    );
  }
}
