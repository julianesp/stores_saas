"use client";

import { useState, useEffect } from "react";
import { useTeamManagement, usePermissions } from "@/hooks/usePermissions";
import { TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreVertical, UserPlus, Mail, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import InviteMemberDialog from "@/components/team/InviteMemberDialog";
import EditPermissionsDialog from "@/components/team/EditPermissionsDialog";
import { ROLE_DEFINITIONS } from "@/lib/permissions";

export default function TeamManagementPage() {
  const { isOwner, loading: permissionsLoading } = usePermissions();
  const { members, loading, error, loadMembers, deleteMember } =
    useTeamManagement();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (isOwner) {
      loadMembers();
    }
  }, [isOwner]);

  const handleDelete = async (member: TeamMember) => {
    try {
      await deleteMember(member.id);
      toast.success("Miembro eliminado exitosamente");
      setDeletingMember(null);
    } catch (error) {
      toast.error("Error al eliminar miembro");
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              Solo el administrador de la tienda puede gestionar el equipo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800 border-purple-200",
      cajero: "bg-blue-100 text-blue-800 border-blue-200",
      custom: "bg-orange-100 text-orange-800 border-orange-200",
    };
    const roleDefinition = ROLE_DEFINITIONS.find((r) => r.role === role);
    return (
      <Badge variant="outline" className={colors[role as keyof typeof colors]}>
        {roleDefinition?.name || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
      suspended: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      active: "Activo",
      inactive: "Inactivo",
      suspended: "Suspendido",
    };
    return (
      <Badge
        variant="outline"
        className={colors[status as keyof typeof colors]}
      >
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      expired: "bg-red-100 text-red-800 border-red-200",
      revoked: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      pending: "Pendiente",
      accepted: "Aceptada",
      expired: "Expirada",
      revoked: "Revocada",
    };
    return (
      <Badge
        variant="outline"
        className={colors[status as keyof typeof colors]}
      >
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Invita y gestiona los permisos de tu equipo de trabajo
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "miembro" : "miembros"} en
            tu equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">
                No hay miembros en el equipo
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Comienza invitando a tu primer miembro del equipo.
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowInviteDialog(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invitar Primer Miembro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Invitación</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {member.full_name || "Sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      {getInvitationStatusBadge(member.invitation_status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.last_login_at
                        ? new Date(member.last_login_at).toLocaleDateString(
                            "es-CO",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild className="">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black w-48">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setEditingMember(member)}
                            className="cursor-pointer pb-4 hover:bg-gray-200 hover:text-black"
                          >
                            <Shield className="mr-2 h-4 w-4 " />
                            Editar Permisos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingMember(member)}
                            className="text-white cursor-pointer pb-4 hover:bg-gray-200 hover:text-black"
                          >
                            🗑️ Eliminar Miembro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSuccess={() => {
          setShowInviteDialog(false);
          loadMembers();
        }}
      />

      {editingMember && (
        <EditPermissionsDialog
          member={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            loadMembers();
          }}
        />
      )}

      {deletingMember && (
        <Dialog
          open={!!deletingMember}
          onOpenChange={(open) => !open && setDeletingMember(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a{" "}
                {deletingMember.full_name || deletingMember.email}? Esta acción
                no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeletingMember(null)} className="text-black cursor-pointer">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deletingMember)}
                className="cursor-pointer"
              >
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
