import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Permission } from '@/lib/types';
import { validateCustomPermissions } from '@/lib/permissions';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * PUT /api/team/members/[id]
 * Actualiza un miembro del equipo (permisos, rol, estado)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();
    const body = await request.json();

    const { role, permissions, status, full_name, phone } = body;

    // Validar rol si se proporciona
    if (role && !['admin', 'cajero', 'custom'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    // Validar permisos personalizados si es rol custom
    if (role === 'custom' || permissions) {
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

    // Validar estado si se proporciona
    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Actualizar el miembro del equipo
    const response = await fetch(`${API_URL}/api/team-invitations/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        permissions,
        status,
        full_name,
        phone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el miembro');
    }

    const member = await response.json();

    return NextResponse.json({
      member,
      message: 'Miembro actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error en PUT /api/team/members/[id]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al actualizar el miembro'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members/[id]
 * Elimina un miembro del equipo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();

    // Eliminar el miembro del equipo
    const response = await fetch(`${API_URL}/api/team-invitations/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el miembro');
    }

    return NextResponse.json({
      message: 'Miembro eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error en DELETE /api/team/members/[id]:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al eliminar el miembro'
      },
      { status: 500 }
    );
  }
}
