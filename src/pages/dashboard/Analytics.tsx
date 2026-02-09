import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PlatformHeader from '@/components/layout/PlatformHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const tabs = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'sources', label: 'Origens de Acesso' },
  { value: 'history', label: 'Histórico' },
  { value: 'tech', label: 'Visão Técnica' },
];

const COLORS = ['hsl(262,83%,58%)', 'hsl(200,95%,50%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(280,70%,55%)'];

function formatNumber(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString('pt-BR');
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatPercent(v: number) {
  return (v * 100).toFixed(1) + '%';
}

function useGAData(clientId: string | null, breakdown?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['ga-insights', clientId, breakdown, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-analytics-insights', {
        body: { client_id: clientId, breakdown, date_from: dateFrom, date_to: dateTo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <Card className="card-glow">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { clientId } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('last_7d');

  const dateMap: Record<string, { from: string; to: string }> = {
    last_7d: { from: '7daysAgo', to: 'today' },
    last_14d: { from: '14daysAgo', to: 'today' },
    last_30d: { from: '30daysAgo', to: 'today' },
    last_90d: { from: '90daysAgo', to: 'today' },
  };
  const { from: dateFrom, to: dateTo } = dateMap[datePreset] || dateMap.last_7d;

  const { data: overview, isLoading: loadingOverview } = useGAData(clientId, undefined, dateFrom, dateTo);
  const { data: dailyData, isLoading: loadingDaily } = useGAData(clientId, 'daily', dateFrom, dateTo);
  const { data: sourceData, isLoading: loadingSources } = useGAData(clientId, 'source', dateFrom, dateTo);
  const { data: pageData } = useGAData(clientId, 'page', dateFrom, dateTo);
  const { data: cityData } = useGAData(clientId, 'city', dateFrom, dateTo);
  const { data: monthlyData, isLoading: loadingMonthly } = useGAData(clientId, 'monthly');
  const { data: deviceData, isLoading: loadingDevice } = useGAData(clientId, 'device', dateFrom, dateTo);
  const { data: browserData, isLoading: loadingBrowser } = useGAData(clientId, 'browser', dateFrom, dateTo);

  const metrics = overview?.metrics || {};
  const isLoading = loadingOverview;

  const dailyRows = (dailyData?.data || []).map((r: any) => ({
    ...r,
    dateLabel: r.date ? `${r.date.slice(6, 8)}/${r.date.slice(4, 6)}` : '',
  }));

  return (
    <DashboardLayout>
      <PlatformHeader
        platform="analytics"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
      />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <KpiCard label="Sessões" value={formatNumber(metrics.sessions || 0)} />
                <KpiCard label="Novos Usuários" value={formatNumber(metrics.newUsers || 0)} />
                <KpiCard label="Taxa Engajamento" value={formatPercent(metrics.engagementRate || 0)} />
                <KpiCard label="Eventos" value={formatNumber(metrics.eventCount || 0)} />
                <KpiCard label="Duração Média" value={formatDuration(metrics.averageSessionDuration || 0)} />
              </div>

              {/* Daily chart */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Sessões por Dia</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {loadingDaily ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="sessions" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} name="Sessões" />
                        <Bar dataKey="newUsers" fill="hsl(200,95%,50%)" radius={[4, 4, 0, 0]} name="Novos Usuários" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <Card className="card-glow">
                  <CardHeader>
                    <CardTitle className="text-lg">Páginas Mais Acessadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Página</TableHead>
                          <TableHead className="text-right">Visualizações</TableHead>
                          <TableHead className="text-right">Sessões</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pageData?.data || []).slice(0, 10).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs max-w-[200px] truncate">{r.pagePath}</TableCell>
                            <TableCell className="text-right">{formatNumber(r.screenPageViews || 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(r.sessions || 0)}</TableCell>
                          </TableRow>
                        ))}
                        {(!pageData?.data || pageData.data.length === 0) && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Top Cities */}
                <Card className="card-glow">
                  <CardHeader>
                    <CardTitle className="text-lg">Cidades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="text-right">Sessões</TableHead>
                          <TableHead className="text-right">Novos Usuários</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(cityData?.data || []).slice(0, 10).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{r.city === '(not set)' ? 'Não identificada' : r.city}</TableCell>
                            <TableCell className="text-right">{formatNumber(r.sessions || 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(r.newUsers || 0)}</TableCell>
                          </TableRow>
                        ))}
                        {(!cityData?.data || cityData.data.length === 0) && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-6">
          {loadingSources ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Source pie chart */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Origem</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(sourceData?.data || []).slice(0, 8).map((r: any) => ({
                          name: `${r.sessionSource || '(direto)'} / ${r.sessionMedium || '(none)'}`,
                          value: r.sessions || 0,
                        }))}
                        cx="50%" cy="50%" outerRadius={100}
                        dataKey="value" nameKey="name" label
                      >
                        {(sourceData?.data || []).slice(0, 8).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Source table */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Detalhamento por Origem / Mídia</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Mídia</TableHead>
                        <TableHead className="text-right">Sessões</TableHead>
                        <TableHead className="text-right">Novos Usuários</TableHead>
                        <TableHead className="text-right">Engajamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sourceData?.data || []).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.sessionSource || '(direto)'}</TableCell>
                          <TableCell>{r.sessionMedium || '(none)'}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.sessions || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.newUsers || 0)}</TableCell>
                          <TableCell className="text-right">{formatPercent(r.engagementRate || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {(!sourceData?.data || sourceData.data.length === 0) && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {loadingMonthly ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Sessões por Mês</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(monthlyData?.data || []).map((r: any) => ({
                      ...r,
                      monthLabel: r.yearMonth ? `${r.yearMonth.slice(4, 6)}/${r.yearMonth.slice(0, 4)}` : '',
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} name="Sessões" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Histórico Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead className="text-right">Sessões</TableHead>
                        <TableHead className="text-right">Novos Usuários</TableHead>
                        <TableHead className="text-right">Eventos</TableHead>
                        <TableHead className="text-right">Engajamento</TableHead>
                        <TableHead className="text-right">Duração Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(monthlyData?.data || []).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.yearMonth ? `${r.yearMonth.slice(4, 6)}/${r.yearMonth.slice(0, 4)}` : ''}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.sessions || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.newUsers || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.eventCount || 0)}</TableCell>
                          <TableCell className="text-right">{formatPercent(r.engagementRate || 0)}</TableCell>
                          <TableCell className="text-right">{formatDuration(r.averageSessionDuration || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {(!monthlyData?.data || monthlyData.data.length === 0) && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'tech' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Devices */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">Dispositivos</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {loadingDevice ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(deviceData?.data || []).map((r: any) => ({
                          name: r.deviceCategory === 'desktop' ? 'Desktop' : r.deviceCategory === 'mobile' ? 'Mobile' : r.deviceCategory === 'tablet' ? 'Tablet' : r.deviceCategory,
                          value: r.sessions || 0,
                        }))}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" nameKey="name" label
                      >
                        {(deviceData?.data || []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Browsers */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">Navegadores</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {loadingBrowser ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(browserData?.data || []).map((r: any) => ({
                          name: r.browser,
                          value: r.sessions || 0,
                        }))}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" nameKey="name" label
                      >
                        {(browserData?.data || []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
