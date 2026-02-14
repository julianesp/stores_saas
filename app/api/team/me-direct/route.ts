import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/team/me-direct
 * Consulta DIRECTAMENTE a D1 sin pasar por Cloudflare Workers
 * Solución temporal para debugging
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('🔍 [/api/team/me-direct] userId:', userId);

    // Consultar directamente a D1
    const query = `SELECT * FROM team_members WHERE clerk_user_id = '${userId}' AND invitation_status = 'accepted' AND status = 'active' LIMIT 1`;

    const command = `npx wrangler d1 execute tienda-pos-shared --remote --command="${query}"`;

    console.log('📡 [/api/team/me-direct] Ejecutando:', command);

    const { stdout, stderr } = await execAsync(command, {
      cwd: '/home/julian/Documentos/sites/posib.dev/cloudflare-migration'
    });

    console.log('📦 [/api/team/me-direct] stdout:', stdout);

    if (stderr) {
      console.error('❌ [/api/team/me-direct] stderr:', stderr);
    }

    // Parsear el JSON del output
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No se pudo parsear la respuesta de D1');
    }

    const result = JSON.parse(jsonMatch[0]);
    const teamMember = result[0]?.results?.[0];

    if (!teamMember) {
      return NextResponse.json({
        success: false,
        error: 'No es un miembro del equipo activo',
        userId
      }, { status: 404 });
    }

    // Parsear permissions si viene como string
    const parsedMember = {
      ...teamMember,
      permissions: typeof teamMember.permissions === 'string'
        ? JSON.parse(teamMember.permissions)
        : teamMember.permissions || []
    };

    console.log('✅ [/api/team/me-direct] Team member encontrado:', {
      email: parsedMember.email,
      role: parsedMember.role,
      permissions: parsedMember.permissions
    });

    return NextResponse.json(parsedMember);

  } catch (error) {
    console.error('❌ [/api/team/me-direct] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
