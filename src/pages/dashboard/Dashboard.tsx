import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Users,
  MousePointer,
  Target,
  TrendingUp,
  Eye,
  BarChart3,
  Activity,
  Facebook,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardFilters, manualFetchOptions } from '@/hooks/useDashboardFilters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Format metric values
const formatValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  const currencyMetrics = ['spend', 'cost', 'cpc', 'cpm', 'costPerLead', 'costPerPurchase', 'purchaseValue', 'costPerConversion', 'average_cpc', 'average_cpm', 'cost_per_conversion'];
  const percentMetrics = ['ctr', 'conversionRate', 'engagementRate'];
  if (currencyMetrics.includes(key)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (percentMetrics.includes(key)) return `${value.toFixed(2)}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('pt-BR');
};

// KPI Card with comparison bar
function KpiCard({ 
  label, value, icon, variation, colorClass, isLoading 
}: { 
  label: string; value: string; icon: React.ReactNode; variation?: number; colorClass?: string; isLoading?: boolean;
}) {
  return (
    <Card className="card-glow animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={cn("text-muted-foreground/60", colorClass)}>{icon}</div>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-xl font-bold">{value}</div>
            {variation !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {variation >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-success" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                )}
                <span className={cn("text-xs font-medium", variation >= 0 ? "text-success" : "text-destructive")}>
                  {Math.abs(variation).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs anterior</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Platform summary card
function PlatformSummaryCard({
  platform, icon, colorClass, borderClass, metrics, isLoading, isConnected, onConnect,
}: {
  platform: string; icon: React.ReactNode; colorClass: string; borderClass: string;
  metrics: { label: string; value: string; key: string }[];
  isLoading?: boolean; isConnected: boolean; onConnect: () => void;
}) {
  return (
    <Card className={cn("card-glow border-l-4", borderClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={colorClass}>{icon}</div>
          <CardTitle className="text-sm font-semibold">{platform}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-2">Não conectado</p>
            <Button variant="outline" size="sm" onClick={onConnect}>Conectar</Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.key} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className="text-sm font-semibold">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const COLORS = ['hsl(188, 95%, 43%)', 'hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(4, 90%, 58%)', 'hsl(280, 70%, 55%)'];

export default function Dashboard() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const { datePreset, setDatePreset, customDateRange, setCustomDateRange, isRefreshing, handleRefresh } = useDashboardFilters(['client', 'meta-insights', 'google-insights', 'ga-home-insights', 'ga-home-sources']);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: metaData, isLoading: metaLoading } = useQuery({
    queryKey: ['meta-insights', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset },
      });
      if (error) throw error;
      return data?.metrics || null;
    },
    enabled: !!clientId && !!client?.meta_connected_at,
  });

  const { data: googleData, isLoading: googleLoading } = useQuery({
    queryKey: ['google-insights', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.functions.invoke('google-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset },
      });
      if (error) throw error;
      return data?.metrics || null;
    },
    enabled: !!clientId && !!client?.google_connected_at,
  });

  const isMetaConnected = !!client?.meta_connected_at;
  const isGoogleConnected = !!client?.google_connected_at;
  const isAnalyticsConnected = !!(client as any)?.ga_connected_at;

  // Fetch GA overview data
  const { data: gaData, isLoading: gaLoading } = useQuery({
    queryKey: ['ga-home-insights', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      const dateMap: Record<string, { from: string; to: string }> = {
        last_7d: { from: '7daysAgo', to: 'today' },
        last_14d: { from: '14daysAgo', to: 'today' },
        last_30d: { from: '30daysAgo', to: 'today' },
        last_90d: { from: '90daysAgo', to: 'today' },
      };
      const { from, to } = dateMap[datePreset] || dateMap.last_7d;
      const { data, error } = await supabase.functions.invoke('google-analytics-insights', {
        body: { client_id: clientId, date_from: from, date_to: to },
      });
      if (error) throw error;
      return data?.metrics || null;
    },
    enabled: !!clientId && isAnalyticsConnected,
  });

  // Fetch GA source data for pie chart
  const { data: gaSourceData } = useQuery({
    queryKey: ['ga-home-sources', clientId, datePreset],
    queryFn: async () => {
      if (!clientId) return null;
      const dateMap: Record<string, { from: string; to: string }> = {
        last_7d: { from: '7daysAgo', to: 'today' },
        last_14d: { from: '14daysAgo', to: 'today' },
        last_30d: { from: '30daysAgo', to: 'today' },
        last_90d: { from: '90daysAgo', to: 'today' },
      };
      const { from, to } = dateMap[datePreset] || dateMap.last_7d;
      const { data, error } = await supabase.functions.invoke('google-analytics-insights', {
        body: { client_id: clientId, date_from: from, date_to: to, breakdown: 'source' },
      });
      if (error) throw error;
      return data?.data || null;
    },
    enabled: !!clientId && isAnalyticsConnected,
  });

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
      <PlatformHeader
        platform="home"
        activeTab=""
        onTabChange={() => {}}
        tabs={[]}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
      />

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* === COLUMN 1: META ADS === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Facebook className="h-4 w-4 text-meta" />
            <h2 className="text-sm font-semibold text-meta uppercase tracking-wide">Meta Ads</h2>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Investimento"
              value={formatValue('spend', metaData?.spend)}
              icon={<DollarSign className="h-4 w-4" />}
              colorClass="text-meta"
              isLoading={metaLoading && isMetaConnected}
            />
            <KpiCard
              label="Impressões"
              value={formatValue('impressions', metaData?.impressions)}
              icon={<Eye className="h-4 w-4" />}
              colorClass="text-meta"
              isLoading={metaLoading && isMetaConnected}
            />
          </div>

          {/* Platform summary */}
          <PlatformSummaryCard
            platform="Meta Ads"
            icon={<Facebook className="h-4 w-4" />}
            colorClass="text-meta"
            borderClass="border-l-meta"
            isConnected={isMetaConnected}
            isLoading={metaLoading}
            onConnect={() => navigate('/dashboard/connections')}
            metrics={[
              { label: 'Investimento', value: formatValue('spend', metaData?.spend), key: 'spend' },
              { label: 'Leads', value: formatValue('leads', metaData?.leads), key: 'leads' },
              { label: 'CPL', value: formatValue('costPerLead', metaData?.costPerLead), key: 'cpl' },
              { label: 'CPM', value: formatValue('cpm', metaData?.cpm), key: 'cpm' },
            ]}
          />

          {/* Temporal chart */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leads por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Conecte o Meta Ads para ver dados temporais
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === COLUMN 2: GOOGLE ADS === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-google" />
            <h2 className="text-sm font-semibold text-google uppercase tracking-wide">Google Ads</h2>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="CPC Médio"
              value={formatValue('average_cpc', googleData?.average_cpc)}
              icon={<MousePointer className="h-4 w-4" />}
              colorClass="text-google"
              isLoading={googleLoading && isGoogleConnected}
            />
            <KpiCard
              label="CPM"
              value={formatValue('average_cpm', googleData?.average_cpm)}
              icon={<DollarSign className="h-4 w-4" />}
              colorClass="text-google"
              isLoading={googleLoading && isGoogleConnected}
            />
          </div>

          {/* Platform summary */}
          <PlatformSummaryCard
            platform="Google Ads"
            icon={<TrendingUp className="h-4 w-4" />}
            colorClass="text-google"
            borderClass="border-l-google"
            isConnected={isGoogleConnected}
            isLoading={googleLoading}
            onConnect={() => navigate('/dashboard/connections')}
            metrics={[
              { label: 'Custo', value: formatValue('cost', googleData?.cost), key: 'cost' },
              { label: 'Conversões', value: formatValue('conversions', googleData?.conversions), key: 'conversions' },
              { label: 'Custo/Conv.', value: formatValue('cost_per_conversion', googleData?.cost_per_conversion), key: 'cpc' },
              { label: 'CPC Médio', value: formatValue('average_cpc', googleData?.average_cpc), key: 'avg_cpc' },
            ]}
          />

          {/* Temporal chart */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversões por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Conecte o Google Ads para ver dados temporais
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === COLUMN 3: ANALYTICS === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Analytics</h2>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Sessões"
              value={isAnalyticsConnected ? formatValue('sessions', gaData?.sessions) : '—'}
              icon={<Users className="h-4 w-4" />}
              colorClass="text-primary"
              isLoading={gaLoading && isAnalyticsConnected}
            />
            <KpiCard
              label="Novos Usuários"
              value={isAnalyticsConnected ? formatValue('newUsers', gaData?.newUsers) : '—'}
              icon={<Users className="h-4 w-4" />}
              colorClass="text-primary"
              isLoading={gaLoading && isAnalyticsConnected}
            />
          </div>

          {/* Analytics summary */}
          <PlatformSummaryCard
            platform="Google Analytics"
            icon={<Activity className="h-4 w-4" />}
            colorClass="text-primary"
            borderClass="border-l-primary"
            isConnected={isAnalyticsConnected}
            isLoading={gaLoading}
            onConnect={() => navigate('/dashboard/connections')}
            metrics={[
              { label: 'Sessões', value: isAnalyticsConnected ? formatValue('sessions', gaData?.sessions) : '—', key: 'sessions' },
              { label: 'Novos Usuários', value: isAnalyticsConnected ? formatValue('newUsers', gaData?.newUsers) : '—', key: 'new_users' },
              { label: 'Taxa Engajamento', value: isAnalyticsConnected && gaData?.engagementRate ? `${(gaData.engagementRate * 100).toFixed(1)}%` : '—', key: 'engagement' },
              { label: 'Eventos', value: isAnalyticsConnected ? formatValue('eventCount', gaData?.eventCount) : '—', key: 'events' },
            ]}
          />

          {/* Pie chart - source */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Origem por Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isAnalyticsConnected && gaSourceData && gaSourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaSourceData.slice(0, 6).map((r: any) => ({
                          name: r.sessionSource || '(direto)',
                          value: r.sessions || 0,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {gaSourceData.slice(0, 6).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: 'hsl(215, 20%, 55%)' }}
                      />
                      <RechartsTooltip
                        contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {isAnalyticsConnected ? 'Sem dados de origem' : 'Conecte o Analytics'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
