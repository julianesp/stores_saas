import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Permission, TeamMember, UserProfile } from '@/lib/types';
import { hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/permissions';

/**
 * Hook para gestionar permisos del usuario actual
 */
export function usePermissions() {
  const { user: clerkUser } = useUser();
  const [currentUser, setCurrentUser] = useState<UserProfile | TeamMember | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (!clerkUser) {
        setLoading(false);
        return;
      }

      try {
        // Primero verificar si es el dueño de la tienda
        const profileResponse = await fetch('/api/user/profile');

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setCurrentUser(profile);
          setIsOwner(true);
          setLoading(false);
          return;
        }

        // Si no es el dueño, verificar si es un miembro del equipo
        const memberResponse = await fetch('/api/team/me');

        if (memberResponse.ok) {
          const member = await memberResponse.json();
          setCurrentUser(member);
          setIsOwner(false);
        }
      } catch (error) {
        console.error('Error al cargar perfil de usuario:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [clerkUser]);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const can = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (isOwner) return true; // El dueño tiene todos los permisos
    return hasPermission(currentUser, permission);
  };

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!currentUser) return false;
    if (isOwner) return true;
    return hasAllPermissions(currentUser, permissions);
  };

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!currentUser) return false;
    if (isOwner) return true;
    return hasAnyPermission(currentUser, permissions);
  };

  return {
    currentUser,
    isOwner,
    loading,
    can,
    canAll,
    canAny,
  };
}

/**
 * Hook para gestionar el equipo (solo para owners)
 */
export function useTeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga todos los miembros del equipo
   */
  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/team/members');
      if (!response.ok) {
        throw new Error('Error al cargar miembros del equipo');
      }
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Invita a un nuevo miembro
   */
  const inviteMember = async (data: {
    email: string;
    full_name?: string;
    role: 'admin' | 'cajero' | 'custom';
    permissions: Permission[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar invitación');
      }

      const result = await response.json();
      await loadMembers(); // Recargar la lista
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza un miembro del equipo
   */
  const updateMember = async (
    memberId: string,
    data: {
      role?: 'admin' | 'cajero' | 'custom';
      permissions?: Permission[];
      status?: 'active' | 'inactive' | 'suspended';
      full_name?: string;
      phone?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar miembro');
      }

      await loadMembers(); // Recargar la lista
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Elimina un miembro del equipo
   */
  const deleteMember = async (memberId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar miembro');
      }

      await loadMembers(); // Recargar la lista
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    members,
    loading,
    error,
    loadMembers,
    inviteMember,
    updateMember,
    deleteMember,
  };
}
