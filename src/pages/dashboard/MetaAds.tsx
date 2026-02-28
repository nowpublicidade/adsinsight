import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import FunnelChart from '@/components/FunnelChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardFilters, manualFetchOptions } from '@/hooks/useDashboardFilters';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

const tabs = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'ads', label: 'Anúncios' },
  { value: 'demographics', label: 'Demográfico' },
];

const formatValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  const currencyMetrics = ['spend', 'cost', 'cpc', 'cpm', 'costPerLead', 'costPerPurchase', 'costPerPixelLead'];
  const percentMetrics = ['ctr'];
  if (currencyMetrics.includes(key)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (percentMetrics.includes(key)) return `${value.toFixed(2)}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('pt-BR');
};

// KPI Card with variation
function KpiCard({ label, value, icon, variation, isLoading }: {
  label: string; value: string; icon: React.ReactNode; variation?: number; isLoading?: boolean;
}) {
  return (
    <Card className="card-glow animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className="text-meta/60">{icon}</div>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-xl font-bold">{value}</div>
            {variation !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                  variation >= 0 ? "variation-positive" : "variation-negative"
                )}>
                  {variation >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(variation).toFixed(1)}%
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// FunnelChart is now imported from shared component

const PIE_COLORS = [
  'hsl(214, 89%, 52%)', 'hsl(230, 89%, 62%)', 'hsl(188, 95%, 43%)', 
  'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)',
  'hsl(270, 70%, 55%)', 'hsl(160, 84%, 39%)',
];

export default function MetaAds() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { datePreset, setDatePreset, customDateRange, setCustomDateRange, isRefreshing, handleRefresh } = useDashboardFilters(['meta-insights', 'meta-campaigns', 'meta-daily', 'meta-ads', 'meta-demographics', 'meta-platforms', 'meta-positions']);
  const [campaignPage, setCampaignPage] = useState(0);
  const [adPage, setAdPage] = useState(0);
  const pageSize = 10;

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isConnected = !!client?.meta_connected_at;

  // Aggregate metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['meta-insights', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset },
      });
      if (error) throw error;
      return data?.metrics || null;
    },
    enabled: !!clientId && isConnected,
    ...manualFetchOptions,
  });
  const { data: campaignData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['meta-campaigns', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'campaign' },
      });
      if (error) throw error;
      return data?.campaigns || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'overview',
  });

  // Daily breakdown
  const { data: dailyData } = useQuery({
    queryKey: ['meta-daily', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'daily' },
      });
      if (error) throw error;
      return data?.daily || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'overview',
  });

  // Ads breakdown
  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ['meta-ads', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'ad' },
      });
      if (error) throw error;
      return data?.ads || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'ads',
  });

  // Demographics
  const { data: demoData } = useQuery({
    queryKey: ['meta-demographics', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'age_gender' },
      });
      if (error) throw error;
      return data?.demographics || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'demographics',
  });

  // Platform breakdown
  const { data: platformData } = useQuery({
    queryKey: ['meta-platforms', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'publisher_platform' },
      });
      if (error) throw error;
      return data?.platforms || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'demographics',
  });

  // Position breakdown
  const { data: positionData } = useQuery({
    queryKey: ['meta-positions', clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-insights', {
        body: { client_id: clientId, date_preset: datePreset, breakdown: 'platform_position' },
      });
      if (error) throw error;
      return data?.positions || [];
    },
    enabled: !!clientId && isConnected && activeTab === 'demographics',
  });

  // Process demographics into pie chart data
  const ageChartData = demoData ? Object.entries(
    (demoData as any[]).reduce((acc: Record<string, number>, d: any) => {
      acc[d.age] = (acc[d.age] || 0) + d.spend;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })) : [];

  const genderChartData = demoData ? Object.entries(
    (demoData as any[]).reduce((acc: Record<string, number>, d: any) => {
      const label = d.gender === 'male' ? 'Masculino' : d.gender === 'female' ? 'Feminino' : 'Outro';
      acc[label] = (acc[label] || 0) + d.spend;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })) : [];

  const platformChartData = platformData ? (platformData as any[]).map((p: any) => ({
    name: p.publisher_platform === 'facebook' ? 'Facebook' : p.publisher_platform === 'instagram' ? 'Instagram' : p.publisher_platform === 'audience_network' ? 'Audience Network' : p.publisher_platform,
    value: p.spend,
  })) : [];

  const positionChartData = positionData ? (positionData as any[]).slice(0, 8).map((p: any) => ({
    name: `${p.publisher_platform} - ${p.platform_position}`.replace('_', ' '),
    value: p.spend,
  })) : [];

  // Paginated campaigns
  const paginatedCampaigns = campaignData ? (campaignData as any[]).slice(campaignPage * pageSize, (campaignPage + 1) * pageSize) : [];
  const totalCampaignPages = campaignData ? Math.ceil((campaignData as any[]).length / pageSize) : 0;

  // Paginated ads
  const paginatedAds = adsData ? (adsData as any[]).slice(adPage * pageSize, (adPage + 1) * pageSize) : [];
  const totalAdPages = adsData ? Math.ceil((adsData as any[]).length / pageSize) : 0;

  // Funnel data
  const funnelData = metrics ? [
    { label: 'Impressões', value: metrics.impressions || 0 },
    { label: 'Cliques', value: metrics.linkClicks || metrics.clicks || 0 },
    { label: 'Leads', value: metrics.leads || 0 },
  ] : [];

  // Daily chart data
  const dailyChartData = dailyData ? (dailyData as any[]).map((d: any) => ({
    date: new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    impressions: d.impressions,
    leads: d.leads,
  })) : [];

  if (!isConnected) {
    return (
      <DashboardLayout>
        <PlatformHeader platform="meta" activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} datePreset={datePreset} onDatePresetChange={setDatePreset} onRefresh={handleRefresh} isRefreshing={isRefreshing} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} />
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-warning" />
            <h3 className="text-lg font-semibold">Meta Ads não conectado</h3>
            <p className="text-muted-foreground text-center max-w-md">Conecte sua conta do Meta Ads para visualizar métricas de campanhas.</p>
            <Button onClick={() => navigate('/dashboard/connections')}>Conectar Meta Ads</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PlatformHeader platform="meta" activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} datePreset={datePreset} onDatePresetChange={setDatePreset} onRefresh={handleRefresh} isRefreshing={isRefreshing} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} />

      {/* === VISÃO GERAL === */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Investimento" value={formatValue('spend', metrics?.spend)} icon={<DollarSign className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="Total de Leads" value={formatValue('leads', metrics?.leads)} icon={<Users className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="Custo por Lead" value={formatValue('costPerLead', metrics?.costPerLead)} icon={<DollarSign className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="Impressões" value={formatValue('impressions', metrics?.impressions)} icon={<Eye className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="CPC" value={formatValue('cpc', metrics?.cpc)} icon={<MousePointer className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="CPM" value={formatValue('cpm', metrics?.cpm)} icon={<DollarSign className="h-4 w-4" />} isLoading={metricsLoading} />
          </div>

          {/* Campaign Table + Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Table */}
            <Card className="card-glow lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campanha</TableHead>
                          <TableHead className="text-right">Investimento</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">CPL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCampaigns.map((c: any) => (
                          <TableRow key={c.campaign_id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{c.campaign_name}</TableCell>
                            <TableCell className="text-right">{formatValue('spend', c.spend)}</TableCell>
                            <TableCell className="text-right">{c.leads}</TableCell>
                            <TableCell className="text-right">{formatValue('costPerLead', c.costPerLead)}</TableCell>
                          </TableRow>
                        ))}
                        {paginatedCampaigns.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {totalCampaignPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-muted-foreground">Página {campaignPage + 1} de {totalCampaignPages}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => setCampaignPage(p => Math.max(0, p - 1))} disabled={campaignPage === 0}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => setCampaignPage(p => Math.min(totalCampaignPages - 1, p + 1))} disabled={campaignPage >= totalCampaignPages - 1}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Funnel */}
            <Card className="card-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <FunnelChart data={funnelData} colorScheme="meta" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Time Series Chart */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Visão Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(214, 89%, 52%)" name="Impressões" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="leads" stroke="hsl(142, 76%, 36%)" name="Leads" strokeWidth={2} dot={false} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Sem dados para o período selecionado'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === ANÚNCIOS === */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="CTR" value={formatValue('ctr', metrics?.ctr)} icon={<BarChart3 className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="Total de Leads" value={formatValue('leads', metrics?.leads)} icon={<Users className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="CPL" value={formatValue('costPerLead', metrics?.costPerLead)} icon={<DollarSign className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="Impressões" value={formatValue('impressions', metrics?.impressions)} icon={<Eye className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="CPC" value={formatValue('cpc', metrics?.cpc)} icon={<MousePointer className="h-4 w-4" />} isLoading={metricsLoading} />
            <KpiCard label="CPM" value={formatValue('cpm', metrics?.cpm)} icon={<DollarSign className="h-4 w-4" />} isLoading={metricsLoading} />
          </div>

          {/* Ads Table with Preview */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Criativos</CardTitle>
            </CardHeader>
            <CardContent>
              {adsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Prévia</TableHead>
                        <TableHead>Anúncio</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">CPL</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAds.map((ad: any) => (
                        <TableRow key={ad.ad_id}>
                          <TableCell className="max-w-[150px] truncate text-xs">{ad.campaign_name}</TableCell>
                          <TableCell>
                            {ad.thumbnail_url ? (
                              <img
                                src={ad.thumbnail_url}
                                alt={ad.ad_name}
                                className="w-16 h-16 rounded-md object-cover border border-border"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-md bg-secondary/50 flex items-center justify-center border border-border">
                                <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[180px] truncate">{ad.ad_name}</TableCell>
                          <TableCell className="text-right">{ad.leads}</TableCell>
                          <TableCell className="text-right">{formatValue('costPerLead', ad.costPerLead)}</TableCell>
                          <TableCell className="text-right">{formatValue('ctr', ad.ctr)}</TableCell>
                        </TableRow>
                      ))}
                      {paginatedAds.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum anúncio encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalAdPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">Página {adPage + 1} de {totalAdPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setAdPage(p => Math.max(0, p - 1))} disabled={adPage === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setAdPage(p => Math.min(totalAdPages - 1, p + 1))} disabled={adPage >= totalAdPages - 1}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* === DEMOGRÁFICO === */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform pie */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {platformChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={platformChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {platformChartData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }} formatter={(value: number) => formatValue('spend', value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position pie */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Posicionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {positionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={positionChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {positionChartData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }} formatter={(value: number) => formatValue('spend', value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Age pie */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Idade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {ageChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ageChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {ageChartData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }} formatter={(value: number) => formatValue('spend', value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gender pie */}
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Gênero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {genderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {genderChartData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(222, 47%, 10%)', border: '1px solid hsl(222, 47%, 16%)', borderRadius: '8px' }} formatter={(value: number) => formatValue('spend', value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
