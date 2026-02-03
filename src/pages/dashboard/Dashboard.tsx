import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  AlertCircle,
  FileText,
  Plus,
  Eye,
  Settings,
  BarChart3,
  RefreshCw,
  DollarSign,
  Users,
  MousePointer,
  Target,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mock data for charts
const mockChartData = [
  { date: '01/01', spend: 1200, leads: 45, conversions: 12 },
  { date: '02/01', spend: 1400, leads: 52, conversions: 15 },
  { date: '03/01', spend: 1100, leads: 38, conversions: 10 },
  { date: '04/01', spend: 1600, leads: 61, conversions: 18 },
  { date: '05/01', spend: 1350, leads: 48, conversions: 14 },
  { date: '06/01', spend: 1800, leads: 72, conversions: 22 },
  { date: '07/01', spend: 1550, leads: 58, conversions: 17 },
];

// Metric icons mapping
const metricIcons: Record<string, React.ReactNode> = {
  spend: <DollarSign className="h-4 w-4" />,
  impressions: <Eye className="h-4 w-4" />,
  reach: <Users className="h-4 w-4" />,
  clicks: <MousePointer className="h-4 w-4" />,
  cpc: <DollarSign className="h-4 w-4" />,
  cpm: <DollarSign className="h-4 w-4" />,
  ctr: <BarChart3 className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  costPerLead: <Target className="h-4 w-4" />,
  purchases: <ShoppingCart className="h-4 w-4" />,
  purchaseValue: <DollarSign className="h-4 w-4" />,
  roas: <TrendingUp className="h-4 w-4" />,
  addToCart: <ShoppingCart className="h-4 w-4" />,
  cost: <DollarSign className="h-4 w-4" />,
  conversions: <Target className="h-4 w-4" />,
  costPerConversion: <Target className="h-4 w-4" />,
  conversionRate: <BarChart3 className="h-4 w-4" />,
};

// Format metric values
const formatValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return '-';
  
  const currencyMetrics = ['spend', 'cost', 'cpc', 'cpm', 'costPerLead', 'costPerPurchase', 'purchaseValue', 'conversionValue', 'costPerConversion'];
  const percentMetrics = ['ctr', 'conversionRate', 'videoViewRate'];
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
  platform?: 'meta' | 'google';
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
          {platform && (
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
          )}
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

export default function Dashboard() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState('last_7d');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery({
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

  // Fetch reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Get default report or first available
  const defaultReport = reports?.find(r => r.is_default) || reports?.[0];
  const activeReportId = selectedReportId || defaultReport?.id;
  const activeReport = reports?.find(r => r.id === activeReportId);

  // Fetch widgets for active report
  const { data: widgets } = useQuery({
    queryKey: ['report-widgets', activeReportId],
    queryFn: async () => {
      if (!activeReportId) return [];
      const { data, error } = await supabase
        .from('report_widgets')
        .select('*')
        .eq('report_id', activeReportId)
        .eq('is_visible', true)
        .order('position');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeReportId,
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

  const isMetaConnected = !!client?.meta_connected_at;
  const isGoogleConnected = !!client?.google_connected_at;
  const hasAnyConnection = isMetaConnected || isGoogleConnected;
  const hasReports = reports && reports.length > 0;
  const hasWidgets = widgets && widgets.length > 0;

  const metaWidgets = widgets?.filter(w => w.platform === 'meta') || [];
  const googleWidgets = widgets?.filter(w => w.platform === 'google') || [];

  if (clientLoading || reportsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!clientId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum cliente vinculado</h2>
          <p className="text-muted-foreground max-w-md">
            Entre em contato com o administrador para vincular sua conta a um cliente.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas campanhas
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Report selector */}
            {hasReports && (
              <Select 
                value={activeReportId || ''} 
                onValueChange={(v) => setSelectedReportId(v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um relatório" />
                </SelectTrigger>
                <SelectContent>
                  {reports?.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
          </div>
        </div>

        {/* Connection status */}
        {!hasAnyConnection && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Nenhuma plataforma conectada</p>
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta do Meta Ads ou Google Ads para visualizar métricas reais.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/connections')}>
                Conectar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No reports state */}
        {!hasReports && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum relatório configurado</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Crie um relatório personalizado para visualizar as métricas que mais importam para você.
              </p>
              <Button onClick={() => navigate('/dashboard/reports')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Relatório
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report with no widgets */}
        {hasReports && !hasWidgets && activeReport && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-6">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Relatório sem métricas configuradas</p>
                <p className="text-sm text-muted-foreground">
                  O relatório "{activeReport.name}" não possui métricas configuradas.
                </p>
              </div>
              <Button onClick={() => navigate(`/dashboard/reports/${activeReportId}/edit`)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Métricas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report widgets */}
        {hasWidgets && (
          <>
            {/* Meta Ads Metrics */}
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

            {/* Google Ads Metrics */}
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
          </>
        )}

        {/* Charts - show when connected */}
        {hasAnyConnection && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Gastos ao longo do tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockChartData}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(188, 95%, 43%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(188, 95%, 43%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(215, 20%, 55%)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(215, 20%, 55%)"
                        fontSize={12}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 8%)',
                          border: '1px solid hsl(222, 47%, 16%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="spend" 
                        stroke="hsl(188, 95%, 43%)" 
                        fillOpacity={1} 
                        fill="url(#colorSpend)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Leads e Conversões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(215, 20%, 55%)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(215, 20%, 55%)"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 8%)',
                          border: '1px solid hsl(222, 47%, 16%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="leads" 
                        stroke="hsl(217, 91%, 60%)" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="conversions" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports list when no widgets configured */}
        {hasReports && !hasWidgets && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Seus Relatórios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports?.map((report) => (
                <Card key={report.id} className="card-glow group cursor-pointer" onClick={() => navigate(`/dashboard/reports/${report.id}/view`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        {report.description && (
                          <CardDescription className="line-clamp-2">
                            {report.description}
                          </CardDescription>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {report.is_default && (
                        <Badge variant="secondary">Padrão</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Criado em {new Date(report.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
