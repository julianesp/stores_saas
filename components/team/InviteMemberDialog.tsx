"use client";

import { useState } from "react";
import { useTeamManagement } from "@/hooks/usePermissions";
import { Permission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";
import {
  ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getPermissionsForRole,
} from "@/lib/permissions";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function InviteMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberDialogProps) {
  const { inviteMember, loading } = useTeamManagement();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "cajero" | "custom">("cajero");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    getPermissionsForRole("cajero"),
  );
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRoleChange = (newRole: "admin" | "cajero" | "custom") => {
    setRole(newRole);
    if (newRole !== "custom") {
      setSelectedPermissions(getPermissionsForRole(newRole));
    } else {
      setSelectedPermissions([]);
    }
  };

  const handlePermissionToggle = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const handleGroupToggle = (groupPermissions: Permission[]) => {
    const allSelected = groupPermissions.every((p) =>
      selectedPermissions.includes(p),
    );
    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !groupPermissions.includes(p)),
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...groupPermissions]),
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("El email es requerido");
      return;
    }

    if (role === "custom" && selectedPermissions.length === 0) {
      toast.error("Debe seleccionar al menos un permiso");
      return;
    }

    try {
      const result = await inviteMember({
        email,
        full_name: fullName || undefined,
        role,
        permissions: selectedPermissions,
      });

      setInvitationLink(result.invitationLink);
      toast.success("Invitación enviada exitosamente");
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setRole("cajero");
    setSelectedPermissions(getPermissionsForRole("cajero"));
    setInvitationLink(null);
    setCopied(false);
    onOpenChange(false);
    if (invitationLink) {
      onSuccess();
    }
  };

  if (invitationLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl text-black">
          <DialogHeader>
            <DialogTitle className="text-black">Invitación Enviada</DialogTitle>
            <DialogDescription className="text-gray-600">
              La invitación se ha creado exitosamente. Comparte este link con el
              usuario invitado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={invitationLink}
                readOnly
                className="flex-1 text-black"
              />
              <Button size="icon" variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-700">
              El usuario invitado deberá crear una cuenta con este email:{" "}
              <strong className="text-black">{email}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-black">
        <DialogHeader>
          <DialogTitle className="text-black">
            Invitar Miembro del Equipo
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Invita a una persona a unirse a tu equipo y asigna sus permisos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-black">
                Nombre Completo (Opcional)
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-black">
                Rol <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger className="text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-black">
                  {ROLE_DEFINITIONS.map((roleDef) => (
                    <SelectItem key={roleDef.role} value={roleDef.role}>
                      <div>
                        <p className="font-medium text-black">{roleDef.name}</p>
                        <p className="text-xs text-gray-600">
                          {roleDef.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role === "custom" && (
              <div className="space-y-4">
                <Label className="text-black">Permisos Personalizados</Label>
                <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto bg-white">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm text-black">
                            {group.name}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {group.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleGroupToggle(group.permissions)}
                        >
                          {group.permissions.every((p) =>
                            selectedPermissions.includes(p),
                          )
                            ? "Desmarcar Todo"
                            : "Marcar Todo"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {group.permissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={permission}
                              checked={selectedPermissions.includes(permission)}
                              onCheckedChange={() =>
                                handlePermissionToggle(permission)
                              }
                            />
                            <Label
                              htmlFor={permission}
                              className="text-sm font-normal cursor-pointer text-black"
                            >
                              {PERMISSION_LABELS[permission]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {role !== "custom" && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2 text-black">
                  Permisos incluidos:
                </p>
                <ul className="text-sm space-y-1 text-black">
                  {selectedPermissions.slice(0, 5).map((permission) => (
                    <li key={permission}>• {PERMISSION_LABELS[permission]}</li>
                  ))}
                  {selectedPermissions.length > 5 && (
                    <li className="text-gray-600">
                      ... y {selectedPermissions.length - 5} más
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
