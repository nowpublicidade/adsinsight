import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, User, Save, BarChart3 } from 'lucide-react';
import { META_PRIMARY_METRICS, type MetaPrimaryMetricKey } from '@/lib/metaPrimaryMetrics';

export default function Settings() {
  const { user, clientId } = useAuth();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({ full_name: '', whatsapp: '' });
  const [metaPrimaryMetric, setMetaPrimaryMetric] = useState<MetaPrimaryMetricKey>('leads');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: client } = useQuery({
    queryKey: ['client-settings', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from('clients').select('name, email, phone, meta_primary_metric').eq('id', clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (profile) {
      setProfileData({ full_name: profile.full_name || '', whatsapp: profile.whatsapp || '' });
    }
  }, [profile]);

  useEffect(() => {
    if (client && (client as any).meta_primary_metric) {
      setMetaPrimaryMetric((client as any).meta_primary_metric as MetaPrimaryMetricKey);
    }
  }, [client]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; whatsapp: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('user_profiles').update({ full_name: data.full_name || null, whatsapp: data.whatsapp || null }).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil atualizado com sucesso');
    },
    onError: (error: any) => { toast.error('Erro ao atualizar perfil: ' + error.message); },
  });

  const updateMetricMutation = useMutation({
    mutationFn: async (metric: string) => {
      if (!clientId) throw new Error('Cliente não encontrado');
      const { error } = await supabase.from('clients').update({ meta_primary_metric: metric } as any).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-settings', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Métrica principal atualizada');
    },
    onError: (error: any) => { toast.error('Erro ao atualizar métrica: ' + error.message); },
  });

  const handleSaveProfile = () => { updateProfileMutation.mutate(profileData); };
  const handleSaveMetric = () => { updateMetricMutation.mutate(metaPrimaryMetric); };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e informações de perfil</p>
        </div>

        {/* Meta Ads Metric Section */}
        <Card className="card-glow border-l-4 border-l-meta">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-meta/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-meta" />
              </div>
              <div>
                <CardTitle>Meta Ads — Métrica Principal</CardTitle>
                <CardDescription>Defina qual métrica de conversão será exibida como foco no dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Métrica Principal</Label>
              <Select value={metaPrimaryMetric} onValueChange={(v) => setMetaPrimaryMetric(v as MetaPrimaryMetricKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {META_PRIMARY_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      <div className="flex flex-col">
                        <span>{m.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {META_PRIMARY_METRICS.find(m => m.key === metaPrimaryMetric)?.description}
              </p>
            </div>
            <Button onClick={handleSaveMetric} disabled={updateMetricMutation.isPending}>
              {updateMetricMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Métrica
            </Button>
          </CardContent>
        </Card>

        {/* Profile Section */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Suas informações pessoais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input id="full_name" value={profileData.full_name} onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={profileData.whatsapp} onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Client Info Section */}
        {client && (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Cliente</CardTitle>
              <CardDescription>Dados da empresa vinculada à sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome</Label>
                  <p className="font-medium">{client.name}</p>
                </div>
                {client.email && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone</Label>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Para alterar estas informações, entre em contato com o administrador.</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Account Section */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>Ações irreversíveis da conta</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>Excluir Minha Conta</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
