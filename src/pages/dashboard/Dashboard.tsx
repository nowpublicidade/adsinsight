import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Target,
  ShoppingCart,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockChartData = [
  { date: '01/01', spend: 1200, leads: 45, conversions: 12 },
  { date: '02/01', spend: 1400, leads: 52, conversions: 15 },
  { date: '03/01', spend: 1100, leads: 38, conversions: 10 },
  { date: '04/01', spend: 1600, leads: 61, conversions: 18 },
  { date: '05/01', spend: 1350, leads: 48, conversions: 14 },
  { date: '06/01', spend: 1800, leads: 72, conversions: 22 },
  { date: '07/01', spend: 1550, leads: 58, conversions: 17 },
];

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  platform?: 'meta' | 'google' | 'both';
}

function MetricCard({ title, value, change, icon, platform }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  
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
              {platform === 'meta' ? 'Meta' : platform === 'google' ? 'Google' : 'Todos'}
            </Badge>
          )}
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center text-xs mt-1 px-2 py-0.5 rounded-full w-fit",
            isPositive && "variation-positive",
            isNegative && "variation-negative",
            !isPositive && !isNegative && "text-muted-foreground"
          )}>
            {isPositive && <ArrowUpRight className="h-3 w-3 mr-1" />}
            {isNegative && <ArrowDownRight className="h-3 w-3 mr-1" />}
            {change > 0 ? '+' : ''}{change?.toFixed(1)}% vs período anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { clientId } = useAuth();
  const [dateRange, setDateRange] = useState('7d');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'meta' | 'google'>('all');

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

  const isMetaConnected = !!client?.meta_connected_at;
  const isGoogleConnected = !!client?.google_connected_at;
  const hasAnyConnection = isMetaConnected || isGoogleConnected;

  // For demo purposes, using mock data
  // In production, this would fetch from meta-ads-insights and google-ads-insights edge functions
  const metrics = {
    spend: { value: 'R$ 12.450,00', change: 15.3 },
    leads: { value: '342', change: 8.7 },
    cpl: { value: 'R$ 36,40', change: -5.2 },
    impressions: { value: '1.2M', change: 12.1 },
    reach: { value: '856K', change: 9.4 },
    clicks: { value: '24.5K', change: 18.6 },
    ctr: { value: '2.04%', change: 5.8 },
    cpc: { value: 'R$ 0.51', change: -3.1 },
    purchases: { value: '87', change: 22.4 },
    purchaseValue: { value: 'R$ 45.230,00', change: 28.1 },
    roas: { value: '3.63x', change: 11.2 },
    addToCart: { value: '234', change: 15.7 },
  };

  if (clientLoading) {
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
            {/* Platform filter */}
            <Select value={platformFilter} onValueChange={(v: any) => setPlatformFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="meta" disabled={!isMetaConnected}>Meta Ads</SelectItem>
                <SelectItem value="google" disabled={!isGoogleConnected}>Google Ads</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="14d">Últimos 14 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            {/* Compare toggle */}
            <div className="flex items-center gap-2">
              <Switch 
                id="compare" 
                checked={compareEnabled}
                onCheckedChange={setCompareEnabled}
              />
              <Label htmlFor="compare" className="text-sm text-muted-foreground">
                Comparar
              </Label>
            </div>
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
              <Button variant="outline" asChild>
                <a href="/dashboard/connections">Conectar</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Gasto"
            value={metrics.spend.value}
            change={compareEnabled ? metrics.spend.change : undefined}
            icon={<DollarSign className="h-4 w-4" />}
            platform="both"
          />
          <MetricCard
            title="Total Leads"
            value={metrics.leads.value}
            change={compareEnabled ? metrics.leads.change : undefined}
            icon={<Users className="h-4 w-4" />}
            platform="both"
          />
          <MetricCard
            title="Custo por Lead"
            value={metrics.cpl.value}
            change={compareEnabled ? metrics.cpl.change : undefined}
            icon={<Target className="h-4 w-4" />}
            platform="both"
          />
          <MetricCard
            title="ROAS"
            value={metrics.roas.value}
            change={compareEnabled ? metrics.roas.change : undefined}
            icon={<TrendingUp className="h-4 w-4" />}
            platform="meta"
          />
        </div>

        {/* Charts */}
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

        {/* Additional metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Impressões"
            value={metrics.impressions.value}
            change={compareEnabled ? metrics.impressions.change : undefined}
            icon={<Eye className="h-4 w-4" />}
          />
          <MetricCard
            title="Cliques"
            value={metrics.clicks.value}
            change={compareEnabled ? metrics.clicks.change : undefined}
            icon={<MousePointer className="h-4 w-4" />}
          />
          <MetricCard
            title="CTR"
            value={metrics.ctr.value}
            change={compareEnabled ? metrics.ctr.change : undefined}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <MetricCard
            title="CPC"
            value={metrics.cpc.value}
            change={compareEnabled ? metrics.cpc.change : undefined}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>

        {/* Pixel metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Métricas do Pixel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Compras"
              value={metrics.purchases.value}
              change={compareEnabled ? metrics.purchases.change : undefined}
              icon={<ShoppingCart className="h-4 w-4" />}
              platform="meta"
            />
            <MetricCard
              title="Valor de Compras"
              value={metrics.purchaseValue.value}
              change={compareEnabled ? metrics.purchaseValue.change : undefined}
              icon={<DollarSign className="h-4 w-4" />}
              platform="meta"
            />
            <MetricCard
              title="Add to Cart"
              value={metrics.addToCart.value}
              change={compareEnabled ? metrics.addToCart.change : undefined}
              icon={<ShoppingCart className="h-4 w-4" />}
              platform="meta"
            />
            <MetricCard
              title="ROAS"
              value={metrics.roas.value}
              change={compareEnabled ? metrics.roas.change : undefined}
              icon={<TrendingUp className="h-4 w-4" />}
              platform="meta"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
