import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryDocuments, updateDocument } from '@/lib/firestore-helpers';
import { UserProfile } from '@/lib/types';

/**
 * API para resetear el período de prueba a 15 días para todos los usuarios
 * Solo disponible para super admins
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar autenticación
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Obtener el perfil del usuario actual
        const currentProfiles = await queryDocuments('user_profiles', [
            { field: 'clerk_user_id', operator: '==', value: userId }
        ]);

        if (currentProfiles.length === 0) {
            return NextResponse.json(
                { error: 'Perfil no encontrado' },
                { status: 404 }
            );
        }

        const currentProfile = currentProfiles[0] as UserProfile;

        // Verificar si es super admin
        if (!currentProfile.is_superadmin) {
            return NextResponse.json(
                { error: 'Solo super admins pueden hacer esto' },
                { status: 403 }
            );
        }

        // Obtener todos los usuarios
        const allProfiles = await queryDocuments('user_profiles', []);

        let updatedCount = 0;
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15); // 15 días de prueba

        // Actualizar cada usuario que esté en trial
        for (const profile of allProfiles as UserProfile[]) {
            // Solo actualizar usuarios en trial sin pagos
            if (profile.subscription_status === 'trial' && !profile.last_payment_date) {
                await updateDocument('user_profiles', profile.id, {
                    trial_start_date: now.toISOString(),
                    trial_end_date: trialEnd.toISOString(),
                });
                updatedCount++;
            }
            // También resetear usuarios expirados sin pagos
            else if (profile.subscription_status === 'expired' && !profile.last_payment_date) {
                await updateDocument('user_profiles', profile.id, {
                    subscription_status: 'trial',
                    trial_start_date: now.toISOString(),
                    trial_end_date: trialEnd.toISOString(),
                });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Período de prueba reseteado a 15 días para ${updatedCount} usuarios`,
            updatedCount,
            trialEndDate: trialEnd.toISOString(),
        });
    } catch (error) {
        console.error('Error resetting trial for all users:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
