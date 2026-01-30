"use client";

import { useState, useEffect } from "react";
import { useTeamManagement } from "@/hooks/usePermissions";
import { Permission, TeamMember } from "@/lib/types";
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
import { Loader2 } from "lucide-react";
import {
  ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getPermissionsForRole,
} from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditPermissionsDialogProps {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditPermissionsDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: EditPermissionsDialogProps) {
  const { updateMember, loading } = useTeamManagement();
  const [fullName, setFullName] = useState(member.full_name || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [role, setRole] = useState<"admin" | "cajero" | "custom">(member.role);
  const [status, setStatus] = useState<"active" | "inactive" | "suspended">(
    member.status,
  );
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    member.permissions,
  );

  useEffect(() => {
    setFullName(member.full_name || "");
    setPhone(member.phone || "");
    setRole(member.role);
    setStatus(member.status);
    setSelectedPermissions(member.permissions);
  }, [member]);

  const handleRoleChange = (newRole: "admin" | "cajero" | "custom") => {
    setRole(newRole);
    if (newRole !== "custom") {
      setSelectedPermissions(getPermissionsForRole(newRole));
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

    if (role === "custom" && selectedPermissions.length === 0) {
      toast.error("Debe seleccionar al menos un permiso");
      return;
    }

    try {
      await updateMember(member.id, {
        role,
        permissions: selectedPermissions,
        status,
        full_name: fullName || undefined,
        phone: phone || undefined,
      });

      toast.success("Miembro actualizado exitosamente");
      onSuccess();
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Miembro del Equipo</DialogTitle>
          <DialogDescription>
            Edita la información y permisos de {member.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="permissions">Permisos</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={member.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El email no se puede cambiar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={status}
                  onValueChange={(value: any) => setStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div>
                        <p className="font-medium">Activo</p>
                        <p className="text-xs text-muted-foreground">
                          Puede acceder al sistema
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div>
                        <p className="font-medium">Inactivo</p>
                        <p className="text-xs text-muted-foreground">
                          No puede acceder temporalmente
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="suspended">
                      <div>
                        <p className="font-medium">Suspendido</p>
                        <p className="text-xs text-muted-foreground">
                          Acceso bloqueado
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_DEFINITIONS.map((roleDef) => (
                      <SelectItem key={roleDef.role} value={roleDef.role}>
                        <div>
                          <p className="font-medium">{roleDef.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {roleDef.description}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role === "custom" ? (
                <div className="space-y-4">
                  <Label>Permisos Personalizados</Label>
                  <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm">
                              {group.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
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
                                id={`edit-${permission}`}
                                checked={selectedPermissions.includes(
                                  permission,
                                )}
                                onCheckedChange={() =>
                                  handlePermissionToggle(permission)
                                }
                              />
                              <Label
                                htmlFor={`edit-${permission}`}
                                className="text-sm font-normal cursor-pointer"
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
              ) : (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Permisos incluidos:
                  </p>
                  <ul className="text-sm space-y-1">
                    {selectedPermissions.slice(0, 5).map((permission) => (
                      <li key={permission}>
                        • {PERMISSION_LABELS[permission]}
                      </li>
                    ))}
                    {selectedPermissions.length > 5 && (
                      <li className="text-muted-foreground">
                        ... y {selectedPermissions.length - 5} más
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
