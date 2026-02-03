import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  Target,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Settings,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapeamento de ícones por métrica
const metricIcons: Record<string, React.ReactNode> = {
  spend: <DollarSign className="h-4 w-4" />,
  impressions: <Eye className="h-4 w-4" />,
  reach: <Users className="h-4 w-4" />,
  clicks: <MousePointer className="h-4 w-4" />,
  cpc: <DollarSign className="h-4 w-4" />,
  cpm: <DollarSign className="h-4 w-4" />,
  ctr: <BarChart3 className="h-4 w-4" />,
  frequency: <RefreshCw className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  messageLeads: <Users className="h-4 w-4" />,
  costPerLead: <Target className="h-4 w-4" />,
  purchases: <ShoppingCart className="h-4 w-4" />,
  purchaseValue: <DollarSign className="h-4 w-4" />,
  roas: <TrendingUp className="h-4 w-4" />,
  costPerPurchase: <Target className="h-4 w-4" />,
  addToCart: <ShoppingCart className="h-4 w-4" />,
  costPerAddToCart: <Target className="h-4 w-4" />,
  initiateCheckout: <ShoppingCart className="h-4 w-4" />,
  viewContent: <Eye className="h-4 w-4" />,
  completeRegistration: <Users className="h-4 w-4" />,
  // Google Ads
  cost: <DollarSign className="h-4 w-4" />,
  conversions: <Target className="h-4 w-4" />,
  costPerConversion: <Target className="h-4 w-4" />,
  conversionRate: <BarChart3 className="h-4 w-4" />,
  conversionValue: <DollarSign className="h-4 w-4" />,
  searchImpressionShare: <Eye className="h-4 w-4" />,
  averagePosition: <BarChart3 className="h-4 w-4" />,
  videoViews: <Eye className="h-4 w-4" />,
  videoViewRate: <BarChart3 className="h-4 w-4" />,
};

// Formatação de valores
const formatValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return '-';
  
  const currencyMetrics = ['spend', 'cost', 'cpc', 'cpm', 'costPerLead', 'costPerPurchase', 'costPerAddToCart', 'purchaseValue', 'conversionValue', 'costPerConversion'];
  const percentMetrics = ['ctr', 'conversionRate', 'videoViewRate', 'searchImpressionShare'];
  const roasMetrics = ['roas'];
  
  if (currencyMetrics.includes(key)) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  
  if (percentMetrics.includes(key)) {
    return `${value.toFixed(2)}%`;
  }
  
  if (roasMetrics.includes(key)) {
    return `${value.toFixed(2)}x`;
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toLocaleString('pt-BR');
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  platform: 'meta' | 'google';
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, platform, isLoading }: MetricCardProps) {
  return (
    <Card className="card-glow animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              platform === 'meta' && 'badge-meta',
              platform === 'google' && 'badge-google'
            )}
          >
            {platform === 'meta' ? 'Meta' : 'Google'}
          </Badge>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportViewer() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const [datePreset, setDatePreset] = useState('last_7d');

  // Fetch report
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Fetch widgets
  const { data: widgets, isLoading: widgetsLoading } = useQuery({
    queryKey: ['report-widgets', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('report_widgets')
        .select('*')
        .eq('report_id', reportId)
        .eq('is_visible', true)
        .order('position');
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Fetch client data
  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch Meta Ads data
  const { data: metaData, isLoading: metaLoading, refetch: refetchMeta } = useQuery({
    queryKey: ['meta-insights', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { 
          client_id: clientId,
          date_preset: datePreset,
        },
      });
      
      if (error) throw error;
      if (data?.error) {
        console.warn('Meta API error:', data.error);
        return null;
      }
      
      return data?.metrics || null;
    },
    enabled: !!clientId && !!client?.meta_connected_at,
  });

  // Fetch Google Ads data
  const { data: googleData, isLoading: googleLoading, refetch: refetchGoogle } = useQuery({
    queryKey: ['google-insights', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase.functions.invoke('google-ads-insights', {
        body: { 
          client_id: clientId,
          date_preset: datePreset,
        },
      });
      
      if (error) throw error;
      if (data?.error) {
        console.warn('Google API error:', data.error);
        return null;
      }
      
      return data?.metrics || null;
    },
    enabled: !!clientId && !!client?.google_connected_at,
  });

  const handleRefresh = () => {
    if (client?.meta_connected_at) refetchMeta();
    if (client?.google_connected_at) refetchGoogle();
    toast.success('Dados atualizados');
  };

  const isLoading = reportLoading || widgetsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Relatório não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O relatório que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/dashboard/reports')}>
            Voltar para Relatórios
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const metaWidgets = widgets?.filter(w => w.platform === 'meta') || [];
  const googleWidgets = widgets?.filter(w => w.platform === 'google') || [];

  const hasNoWidgets = (!metaWidgets.length && !googleWidgets.length);
  const isMetaConnected = !!client?.meta_connected_at;
  const isGoogleConnected = !!client?.google_connected_at;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/reports')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{report.name}</h1>
              {report.description && (
                <p className="text-muted-foreground">{report.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Date range */}
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
                <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="last_month">Mês passado</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>

            <Button variant="outline" onClick={() => navigate(`/dashboard/reports/${reportId}/edit`)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* No widgets warning */}
        {hasNoWidgets && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-6">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Nenhuma métrica configurada</p>
                <p className="text-sm text-muted-foreground">
                  Configure as métricas que deseja visualizar neste relatório.
                </p>
              </div>
              <Button onClick={() => navigate(`/dashboard/reports/${reportId}/edit`)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Métricas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Meta Ads Section */}
        {metaWidgets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Meta Ads</h2>
              {!isMetaConnected && (
                <Badge variant="outline" className="text-warning border-warning">
                  Não conectado
                </Badge>
              )}
            </div>
            
            {!isMetaConnected ? (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Conecte sua conta do Meta Ads para visualizar estas métricas.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/connections')}>
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metaWidgets.map((widget) => (
                  <MetricCard
                    key={widget.id}
                    title={widget.display_name}
                    value={formatValue(widget.metric_key, metaData?.[widget.metric_key])}
                    icon={metricIcons[widget.metric_key] || <BarChart3 className="h-4 w-4" />}
                    platform="meta"
                    isLoading={metaLoading}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Google Ads Section */}
        {googleWidgets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Google Ads</h2>
              {!isGoogleConnected && (
                <Badge variant="outline" className="text-warning border-warning">
                  Não conectado
                </Badge>
              )}
            </div>
            
            {!isGoogleConnected ? (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Conecte sua conta do Google Ads para visualizar estas métricas.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/connections')}>
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {googleWidgets.map((widget) => (
                  <MetricCard
                    key={widget.id}
                    title={widget.display_name}
                    value={formatValue(widget.metric_key, googleData?.[widget.metric_key])}
                    icon={metricIcons[widget.metric_key] || <BarChart3 className="h-4 w-4" />}
                    platform="google"
                    isLoading={googleLoading}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
