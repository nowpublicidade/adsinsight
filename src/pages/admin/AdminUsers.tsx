import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Users, UserPlus, Building2, Shield, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];

interface UserWithDetails extends UserProfile {
  user_roles: UserRole[];
  client_accesses: { client_id: string }[];
  clients_list: Client[];
}

// ── Componente de multi-select de clientes ──────────────────────────────────
function ClientMultiSelect({
  clients,
  selected,
  onChange,
}: {
  clients: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
      {clients.length === 0 && <p className="text-xs text-muted-foreground p-3">Nenhum cliente cadastrado.</p>}
      {clients.map((client) => (
        <label
          key={client.id}
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
        >
          <Checkbox checked={selected.includes(client.id)} onCheckedChange={() => toggle(client.id)} />
          <span className="text-sm text-foreground">{client.name}</span>
        </label>
      ))}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<"admin" | "client">("client");

  // Novo usuário
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserClientIds, setNewUserClientIds] = useState<string[]>([]);
  const [newUserRole, setNewUserRole] = useState<"admin" | "client">("client");

  const queryClient = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: accesses } = await supabase.from("user_client_access").select("user_id, client_id");
      const { data: allClients } = await supabase.from("clients").select("*");

      return profiles.map((profile) => ({
        ...profile,
        user_roles: (roles ?? []).filter((r) => r.user_id === profile.user_id),
        client_accesses: (accesses ?? []).filter((a) => a.user_id === profile.user_id),
        clients_list: (allClients ?? []).filter((c) =>
          (accesses ?? []).some((a) => a.user_id === profile.user_id && a.client_id === c.id),
        ),
      })) as UserWithDetails[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  /** Cria usuário e vincula às contas selecionadas */
  const createUserMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      clientIds,
      role,
    }: {
      email: string;
      password: string;
      fullName: string;
      clientIds: string[];
      role: "admin" | "client";
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;

      if (data.user) {
        // Aguarda o trigger criar o perfil
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Vínculos com contas
        if (clientIds.length > 0) {
          await supabase
            .from("user_client_access")
            .insert(clientIds.map((cid) => ({ user_id: data.user!.id, client_id: cid })));
        }

        // Role
        if (role !== "client") {
          await supabase.from("user_roles").delete().eq("user_id", data.user.id);
          await supabase.from("user_roles").insert({ user_id: data.user.id, role });
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado com sucesso");
      setIsCreateOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserClientIds([]);
      setNewUserRole("client");
    },
    onError: (error) => toast.error("Erro ao criar usuário: " + error.message),
  });

  /** Atualiza vínculos de conta de um usuário existente (substitui todos) */
  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, clientIds }: { userId: string; clientIds: string[] }) => {
      // Remove todos os vínculos atuais
      await supabase.from("user_client_access").delete().eq("user_id", userId);

      // Insere os novos
      if (clientIds.length > 0) {
        const { error } = await supabase
          .from("user_client_access")
          .insert(clientIds.map((cid) => ({ user_id: userId, client_id: cid })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário atualizado com sucesso");
      setIsEditOpen(false);
      setSelectedUserId(null);
    },
    onError: (error) => toast.error("Erro ao atualizar usuário: " + error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "client" }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (error) => toast.error("Erro ao atualizar role: " + error.message),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openEditDialog = (user: UserWithDetails) => {
    setSelectedUserId(user.user_id);
    setSelectedClientIds(user.client_accesses.map((a) => a.client_id));
    setSelectedRole(user.user_roles[0]?.role ?? "client");
    setIsEditOpen(true);
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      fullName: newUserName,
      clientIds: newUserClientIds,
      role: newUserRole,
    });
  };

  const handleSave = () => {
    if (!selectedUserId) return;
    updateAccessMutation.mutate({ userId: selectedUserId, clientIds: selectedClientIds });

    const currentRole = users?.find((u) => u.user_id === selectedUserId)?.user_roles[0]?.role;
    if (currentRole !== selectedRole) {
      updateRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
    }
  };

  const getRoleBadge = (roles: UserRole[]) => {
    const role = roles[0]?.role;
    if (role === "admin") {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30">
          <Shield className="h-3 w-3 mr-1" /> Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <User className="h-3 w-3 mr-1" /> Cliente
      </Badge>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Usuários</h1>
            <p className="text-muted-foreground mt-1">Gerencie usuários e suas permissões</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users?.filter((u) => u.user_roles[0]?.role === "admin").length ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Com Acesso a Contas</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.filter((u) => u.client_accesses.length > 0).length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contas com acesso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name ?? "Sem nome"}</TableCell>
                      <TableCell>{user.whatsapp ?? "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.user_roles)}</TableCell>
                      <TableCell>
                        {user.clients_list.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Nenhuma</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.clients_list.map((c) => (
                              <Badge key={c.id} variant="outline" className="text-xs">
                                {c.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Dialog Criar Usuário ── */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as "admin" | "client")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUserRole === "client" && (
                <div className="space-y-2">
                  <Label>Contas com acesso</Label>
                  <ClientMultiSelect
                    clients={clients ?? []}
                    selected={newUserClientIds}
                    onChange={setNewUserClientIds}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione uma ou mais contas que este usuário poderá acessar.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Dialog Editar Usuário ── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "client")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRole === "client" && (
                <div className="space-y-2">
                  <Label>Contas com acesso</Label>
                  <ClientMultiSelect
                    clients={clients ?? []}
                    selected={selectedClientIds}
                    onChange={setSelectedClientIds}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedClientIds.length === 0
                      ? "Nenhuma conta selecionada — o usuário não terá acesso ao dashboard."
                      : `${selectedClientIds.length} conta(s) selecionada(s).`}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={updateAccessMutation.isPending || updateRoleMutation.isPending}>
                  {(updateAccessMutation.isPending || updateRoleMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
