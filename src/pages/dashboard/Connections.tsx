import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Unlink,
  AlertTriangle,
  Save,
  Info,
} from 'lucide-react';

// Meta and Google icons as SVG
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Connections() {
  const { clientId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');
  
  // Account ID states
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [googleCustomerId, setGoogleCustomerId] = useState('');

  // Fetch all clients for admin
  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Determine which client ID to use
  const effectiveClientId = isAdmin ? selectedClientId : clientId;

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', effectiveClientId],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', effectiveClientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId,
  });

  // Sync local state with client data
  useEffect(() => {
    if (client) {
      setMetaAdAccountId(client.meta_ad_account_id || '');
      setGoogleCustomerId(client.google_customer_id || '');
    }
  }, [client]);

  const updateAccountIdMutation = useMutation({
    mutationFn: async ({ platform, accountId }: { platform: 'meta' | 'google'; accountId: string }) => {
      if (!effectiveClientId) throw new Error('No client ID');
      
      const updates = platform === 'meta' 
        ? { meta_ad_account_id: accountId || null }
        : { google_customer_id: accountId || null };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', effectiveClientId);
      
      if (error) throw error;
    },
    onSuccess: (_, { platform }) => {
      queryClient.invalidateQueries({ queryKey: ['client', effectiveClientId] });
      toast.success(`ID da conta ${platform === 'meta' ? 'Meta' : 'Google'} salvo com sucesso`);
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (platform: 'meta' | 'google') => {
      if (!effectiveClientId) throw new Error('No client ID');
      
      const updates = platform === 'meta' 
        ? {
            meta_access_token: null,
            meta_token_expires_at: null,
            meta_user_id: null,
            meta_connected_at: null,
          }
        : {
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
            google_connected_at: null,
          };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', effectiveClientId);
      
      if (error) throw error;
    },
    onSuccess: (_, platform) => {
      queryClient.invalidateQueries({ queryKey: ['client', effectiveClientId] });
      toast.success(`${platform === 'meta' ? 'Meta Ads' : 'Google Ads'} desconectado`);
    },
    onError: (error) => {
      toast.error('Erro ao desconectar: ' + error.message);
    },
  });

  const handleConnectMeta = async () => {
    if (!effectiveClientId) {
      toast.error('Selecione um cliente para conectar');
      return;
    }

    if (!metaAdAccountId.trim()) {
      toast.error('Insira o ID da conta de anúncios Meta antes de conectar');
      return;
    }

    // Save the account ID first
    await updateAccountIdMutation.mutateAsync({ platform: 'meta', accountId: metaAdAccountId });

    setConnectingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth-start', {
        body: { client_id: effectiveClientId },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (error: any) {
      toast.error('Erro ao iniciar conexão: ' + error.message);
      setConnectingMeta(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!effectiveClientId) {
      toast.error('Selecione um cliente para conectar');
      return;
    }

    if (!googleCustomerId.trim()) {
      toast.error('Insira o Customer ID do Google Ads antes de conectar');
      return;
    }

    // Save the account ID first
    await updateAccountIdMutation.mutateAsync({ platform: 'google', accountId: googleCustomerId });

    setConnectingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { client_id: effectiveClientId },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (error: any) {
      toast.error('Erro ao iniciar conexão: ' + error.message);
      setConnectingGoogle(false);
    }
  };

  const isMetaConnected = !!client?.meta_connected_at;
  const isGoogleConnected = !!client?.google_connected_at;
  const hasNoClient = !effectiveClientId;

  if (isLoading && effectiveClientId) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Conexões</h1>
          <p className="text-muted-foreground">
            Conecte suas contas de anúncios para sincronizar métricas
          </p>
        </div>

        {/* Admin: Client Selector */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Cliente</CardTitle>
              <CardDescription>
                Como administrador, selecione o cliente para gerenciar as conexões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm">
                <Label htmlFor="client-select">Cliente</Label>
                <Select
                  value={selectedClientId || 'none'}
                  onValueChange={(value) => setSelectedClientId(value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione um cliente</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No client warning */}
        {hasNoClient && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Nenhum cliente selecionado</p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin 
                      ? 'Selecione um cliente acima para gerenciar as conexões OAuth.' 
                      : 'Você precisa estar vinculado a um cliente para conectar contas de anúncios.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meta Ads Card */}
          <Card className="card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(214,89%,52%)]/10 flex items-center justify-center text-[hsl(214,89%,52%)]">
                    <MetaIcon />
                  </div>
                  <div>
                    <CardTitle>Meta Ads</CardTitle>
                    <CardDescription>Facebook e Instagram</CardDescription>
                  </div>
                </div>
                {effectiveClientId && (
                  isMetaConnected ? (
                    <Badge className="connection-connected">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge className="connection-disconnected">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account ID Input */}
              <div className="space-y-2">
                <Label htmlFor="meta-account-id">ID da Conta de Anúncios</Label>
                <div className="flex gap-2">
                  <Input
                    id="meta-account-id"
                    value={metaAdAccountId}
                    onChange={(e) => setMetaAdAccountId(e.target.value)}
                    placeholder="Ex: act_123456789"
                    disabled={hasNoClient}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateAccountIdMutation.mutate({ platform: 'meta', accountId: metaAdAccountId })}
                    disabled={hasNoClient || updateAccountIdMutation.isPending}
                  >
                    {updateAccountIdMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontre o ID no Gerenciador de Anúncios do Meta (formato: act_XXXXXXXXX)
                </p>
              </div>

              {isMetaConnected ? (
                <>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Conectado em: {client?.meta_connected_at 
                      ? new Date(client.meta_connected_at).toLocaleDateString('pt-BR')
                      : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnectMutation.mutate('meta')}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta do Meta Business para importar métricas de campanhas do Facebook e Instagram.
                  </p>
                  
                  {/* Feedback visual quando ID não preenchido */}
                  {!metaAdAccountId.trim() && !hasNoClient && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <Info className="h-4 w-4 text-warning flex-shrink-0" />
                      <p className="text-sm text-warning">
                        Preencha o ID da Conta de Anúncios acima antes de conectar
                      </p>
                    </div>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Button 
                          className="w-full btn-glow"
                          onClick={handleConnectMeta}
                          disabled={connectingMeta || hasNoClient || !metaAdAccountId.trim()}
                        >
                          {connectingMeta ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Conectar Meta Ads
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {(!metaAdAccountId.trim() || hasNoClient) && (
                      <TooltipContent>
                        <p>
                          {hasNoClient 
                            ? 'Selecione um cliente primeiro' 
                            : 'Preencha o ID da Conta de Anúncios primeiro'}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </>
              )}
            </CardContent>
          </Card>

          {/* Google Ads Card */}
          <Card className="card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(4,90%,58%)]/10 flex items-center justify-center">
                    <GoogleIcon />
                  </div>
                  <div>
                    <CardTitle>Google Ads</CardTitle>
                    <CardDescription>Search, Display e YouTube</CardDescription>
                  </div>
                </div>
                {effectiveClientId && (
                  isGoogleConnected ? (
                    <Badge className="connection-connected">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge className="connection-disconnected">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer ID Input */}
              <div className="space-y-2">
                <Label htmlFor="google-customer-id">Customer ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="google-customer-id"
                    value={googleCustomerId}
                    onChange={(e) => setGoogleCustomerId(e.target.value)}
                    placeholder="Ex: 123-456-7890"
                    disabled={hasNoClient}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateAccountIdMutation.mutate({ platform: 'google', accountId: googleCustomerId })}
                    disabled={hasNoClient || updateAccountIdMutation.isPending}
                  >
                    {updateAccountIdMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontre o Customer ID no Google Ads (formato: XXX-XXX-XXXX)
                </p>
              </div>

              {isGoogleConnected ? (
                <>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Conectado em: {client?.google_connected_at 
                      ? new Date(client.google_connected_at).toLocaleDateString('pt-BR')
                      : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnectMutation.mutate('google')}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta do Google Ads para importar métricas de campanhas de Search, Display e YouTube.
                  </p>
                  
                  {/* Feedback visual quando ID não preenchido */}
                  {!googleCustomerId.trim() && !hasNoClient && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <Info className="h-4 w-4 text-warning flex-shrink-0" />
                      <p className="text-sm text-warning">
                        Preencha o Customer ID acima antes de conectar
                      </p>
                    </div>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Button 
                          className="w-full btn-glow"
                          onClick={handleConnectGoogle}
                          disabled={connectingGoogle || hasNoClient || !googleCustomerId.trim()}
                        >
                          {connectingGoogle ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Conectar Google Ads
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {(!googleCustomerId.trim() || hasNoClient) && (
                      <TooltipContent>
                        <p>
                          {hasNoClient 
                            ? 'Selecione um cliente primeiro' 
                            : 'Preencha o Customer ID primeiro'}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info section */}
        <Card className="bg-card/50">
          <CardContent className="py-6">
            <h3 className="font-semibold mb-2">Como funciona a conexão?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Passo 1:</strong> Insira o ID da conta de anúncios (Meta ou Google)</li>
              <li>• <strong>Passo 2:</strong> Clique em "Conectar" para autorizar o acesso</li>
              <li>• <strong>Passo 3:</strong> Você será redirecionado para a página de login da plataforma</li>
              <li>• <strong>Passo 4:</strong> Autorize o acesso apenas para leitura dos dados de anúncios</li>
              <li>• Os dados são sincronizados automaticamente a cada hora</li>
              <li>• Você pode desconectar a qualquer momento</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
