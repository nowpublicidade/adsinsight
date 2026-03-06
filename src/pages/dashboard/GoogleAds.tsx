import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlatformHeader from "@/components/layout/PlatformHeader";
import FunnelChart from "@/components/FunnelChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2,
  AlertCircle,
  DollarSign,
  MousePointer,
  Eye,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardFilters, manualFetchOptions } from "@/hooks/useDashboardFilters";
import TableFilters, { matchesName, matchesStatus } from "@/components/TableFilters";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const tabs = [
  { value: "overview", label: "Visão Geral" },
  { value: "ads", label: "Anúncios" },
  { value: "history", label: "Histórico" },
];

const formatValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return "—";
  const curr = ["cost", "average_cpc", "average_cpm", "cost_per_conversion", "conversion_value"];
  const pct = ["ctr", "conversion_rate"];
  if (curr.includes(key)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  if (pct.includes(key)) return `${value.toFixed(2)}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR");
};

// ── Badge de status Google ──
function GoogleStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const isActive = status === "ENABLED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        isActive ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-green-500" : "bg-yellow-500")} />
      {isActive ? "Ativo" : "Pausado"}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  isLoading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <Card className="card-glow animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className="text-google/60">{icon}</div>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

const DAY_NAMES: Record<string, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export default function GoogleAds() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  // ✅ dateBody e dateKey vêm do hook — lidam com o preset 'custom' corretamente
  const {
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    isRefreshing,
    handleRefresh,
    dateBody,
    dateKey,
  } = useDashboardFilters([
    "google-insights",
    "google-campaigns",
    "google-keywords",
    "google-daily",
    "google-adgroups",
    "google-dow",
    "google-monthly",
  ]);
  const [campaignPage, setCampaignPage] = useState(0);
  const [keywordPage, setKeywordPage] = useState(0);
  const pageSize = 10;

  // ── Filtros de tabela ──
  const googleStatusOptions = [
    { value: "all", label: "Todos" },
    { value: "ENABLED", label: "Ativo" },
    { value: "PAUSED", label: "Pausado" },
  ];
  const [campaignNameFilter, setCampaignNameFilter] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [keywordNameFilter, setKeywordNameFilter] = useState("");
  const [keywordStatusFilter, setKeywordStatusFilter] = useState("all");

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isConnected = !!client?.google_connected_at;

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["google-insights", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody },
      });
      if (error) throw error;
      return data?.metrics || null;
    },
    enabled: !!clientId && isConnected,
    ...manualFetchOptions,
  });

  const { data: campaignData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["google-campaigns", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody, breakdown: "campaign" },
      });
      if (error) throw error;
      return data?.campaigns || [];
    },
    enabled: !!clientId && isConnected && (activeTab === "overview" || activeTab === "ads"),
  });

  const { data: keywordData, isLoading: keywordsLoading } = useQuery({
    queryKey: ["google-keywords", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody, breakdown: "keyword" },
      });
      if (error) throw error;
      return data?.keywords || [];
    },
    enabled: !!clientId && isConnected && (activeTab === "overview" || activeTab === "ads"),
  });

  const { data: dailyData } = useQuery({
    queryKey: ["google-daily", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody, breakdown: "daily" },
      });
      if (error) throw error;
      return data?.daily || [];
    },
    enabled: !!clientId && isConnected && activeTab === "overview",
  });

  const { data: adGroupData, isLoading: adGroupsLoading } = useQuery({
    queryKey: ["google-adgroups", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody, breakdown: "ad_group" },
      });
      if (error) throw error;
      return data?.ad_groups || [];
    },
    enabled: !!clientId && isConnected && activeTab === "ads",
  });

  const { data: dayOfWeekData } = useQuery({
    queryKey: ["google-dow", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, ...dateBody, breakdown: "day_of_week" },
      });
      if (error) throw error;
      return data?.day_of_week || [];
    },
    enabled: !!clientId && isConnected && activeTab === "ads",
  });

  // Histórico mensal usa sempre last_365d — não aplica filtro personalizado
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ["google-monthly", clientId, "last_365d"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads-insights", {
        body: { client_id: clientId, date_preset: "last_365d", breakdown: "monthly" },
      });
      if (error) throw error;
      return data?.monthly || [];
    },
    enabled: !!clientId && isConnected && activeTab === "history",
  });

  const filteredCampaigns = campaignData
    ? (campaignData as any[]).filter(
        (c: any) =>
          matchesName(c.campaign_name, campaignNameFilter) &&
          matchesStatus(c.status, campaignStatusFilter),
      )
    : [];
  const paginatedCampaigns = filteredCampaigns.slice(campaignPage * pageSize, (campaignPage + 1) * pageSize);
  const totalCampaignPages = Math.ceil(filteredCampaigns.length / pageSize);
  const filteredKeywords = keywordData
    ? (keywordData as any[]).filter(
        (k: any) =>
          matchesName(k.keyword_text, keywordNameFilter) &&
          matchesStatus(k.status, keywordStatusFilter),
      )
    : [];
  const paginatedKeywords = filteredKeywords.slice(keywordPage * pageSize, (keywordPage + 1) * pageSize);
  const totalKeywordPages = Math.ceil(filteredKeywords.length / pageSize);

  const funnelData = metrics
    ? [
        { label: "Impressões", value: parseInt(metrics.impressions || "0", 10) },
        { label: "Cliques", value: parseInt(metrics.clicks || "0", 10) },
        { label: "Conversões", value: metrics.conversions || 0 },
      ]
    : [];

  const dailyChartData = dailyData
    ? (dailyData as any[]).map((d: any) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        cost: d.cost,
        conversions: d.conversions,
      }))
    : [];

  const monthlyChartData = monthlyData
    ? (monthlyData as any[]).map((d: any) => ({
        month: d.month,
        cost: d.cost,
        conversions: d.conversions,
      }))
    : [];

  if (!isConnected) {
    return (
      <DashboardLayout>
        <PlatformHeader
          platform="google"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-warning" />
            <h3 className="text-lg font-semibold">Google Ads não conectado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Conecte sua conta do Google Ads para visualizar métricas de campanhas.
            </p>
            <Button onClick={() => navigate("/dashboard/connections")}>Conectar Google Ads</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PlatformHeader
        platform="google"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
      />

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Custo"
              value={formatValue("cost", metrics?.cost)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Conversões"
              value={formatValue("conversions", metrics?.conversions)}
              icon={<Target className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Taxa Conv."
              value={formatValue("conversion_rate", metrics?.conversion_rate)}
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CPC Médio"
              value={formatValue("average_cpc", metrics?.average_cpc)}
              icon={<MousePointer className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CTR"
              value={formatValue("ctr", metrics?.ctr)}
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Impressões"
              value={formatValue("impressions", metrics?.impressions)}
              icon={<Eye className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Cliques"
              value={formatValue("clicks", metrics?.clicks)}
              icon={<MousePointer className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CPM"
              value={formatValue("average_cpm", metrics?.average_cpm)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Valor Conv."
              value={formatValue("conversion_value", metrics?.conversion_value)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-glow lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Campanhas</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <TableFilters
                      nameFilter={campaignNameFilter}
                      onNameFilterChange={(v) => { setCampaignNameFilter(v); setCampaignPage(0); }}
                      statusFilter={campaignStatusFilter}
                      onStatusFilterChange={(v) => { setCampaignStatusFilter(v); setCampaignPage(0); }}
                      namePlaceholder="Buscar campanha…"
                      statusOptions={googleStatusOptions}
                    />
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Conversões</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCampaigns.map((c: any) => (
                          <TableRow key={c.campaign_id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{c.campaign_name}</TableCell>
                            <TableCell>
                              <GoogleStatusBadge status={c.status} />
                            </TableCell>
                            <TableCell className="text-right">{formatValue("cost", c.cost)}</TableCell>
                            <TableCell className="text-right">{c.conversions?.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{formatValue("average_cpc", c.average_cpc)}</TableCell>
                          </TableRow>
                        ))}
                        {paginatedCampaigns.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhuma campanha encontrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {totalCampaignPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-muted-foreground">
                          Página {campaignPage + 1} de {totalCampaignPages}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCampaignPage((p) => Math.max(0, p - 1))}
                            disabled={campaignPage === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCampaignPage((p) => Math.min(totalCampaignPages - 1, p + 1))}
                            disabled={campaignPage >= totalCampaignPages - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <FunnelChart data={funnelData} colorScheme="google" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              {keywordsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <TableFilters
                    nameFilter={keywordNameFilter}
                    onNameFilterChange={(v) => { setKeywordNameFilter(v); setKeywordPage(0); }}
                    statusFilter={keywordStatusFilter}
                    onStatusFilterChange={(v) => { setKeywordStatusFilter(v); setKeywordPage(0); }}
                    namePlaceholder="Buscar keyword…"
                    statusOptions={googleStatusOptions}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Impressões</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedKeywords.map((k: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{k.keyword_text}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {k.campaign_name}
                          </TableCell>
                          <TableCell className="text-right">{formatValue("cost", k.cost)}</TableCell>
                          <TableCell className="text-right">{k.impressions?.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{k.clicks}</TableCell>
                          <TableCell className="text-right">{k.conversions?.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                      {paginatedKeywords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhuma keyword encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalKeywordPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        Página {keywordPage + 1} de {totalKeywordPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setKeywordPage((p) => Math.max(0, p - 1))}
                          disabled={keywordPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setKeywordPage((p) => Math.min(totalKeywordPages - 1, p + 1))}
                          disabled={keywordPage >= totalKeywordPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Visão Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="cost"
                        stroke="hsl(142,71%,45%)"
                        name="Custo (R$)"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="conversions"
                        stroke="hsl(200,95%,50%)"
                        name="Conversões"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Sem dados para o período"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "ads" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Custo"
              value={formatValue("cost", metrics?.cost)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Conversões"
              value={formatValue("conversions", metrics?.conversions)}
              icon={<Target className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Impressões"
              value={formatValue("impressions", metrics?.impressions)}
              icon={<Eye className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CPC"
              value={formatValue("average_cpc", metrics?.average_cpc)}
              icon={<MousePointer className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CTR"
              value={formatValue("ctr", metrics?.ctr)}
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
          </div>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Campanhas</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <TableFilters
                    nameFilter={campaignNameFilter}
                    onNameFilterChange={(v) => { setCampaignNameFilter(v); setCampaignPage(0); }}
                    statusFilter={campaignStatusFilter}
                    onStatusFilterChange={(v) => { setCampaignStatusFilter(v); setCampaignPage(0); }}
                    namePlaceholder="Buscar campanha…"
                    statusOptions={googleStatusOptions}
                  />
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Taxa Conv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((c: any) => (
                      <TableRow key={c.campaign_id}>
                        <TableCell className="font-medium max-w-[250px] truncate">{c.campaign_name}</TableCell>
                        <TableCell>
                          <GoogleStatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right">{formatValue("cost", c.cost)}</TableCell>
                        <TableCell className="text-right">{c.conversions?.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {formatValue("conversion_rate", c.conversion_rate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance por Dia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              {!dayOfWeekData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dayOfWeekData as any[]).map((d: any) => (
                      <TableRow key={d.day}>
                        <TableCell className="font-medium">{DAY_NAMES[d.day] || d.day}</TableCell>
                        <TableCell className="text-right">{formatValue("cost", d.cost)}</TableCell>
                        <TableCell className="text-right">{d.clicks}</TableCell>
                        <TableCell className="text-right">{d.conversions?.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Grupos de Anúncios</CardTitle>
            </CardHeader>
            <CardContent>
              {adGroupsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((adGroupData as any[]) || []).slice(0, 20).map((ag: any) => (
                      <TableRow key={ag.ad_group_id}>
                        <TableCell className="font-medium max-w-[180px] truncate">{ag.ad_group_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {ag.campaign_name}
                        </TableCell>
                        <TableCell>
                          <GoogleStatusBadge status={ag.status} />
                        </TableCell>
                        <TableCell className="text-right">{formatValue("cost", ag.cost)}</TableCell>
                        <TableCell className="text-right">{ag.clicks}</TableCell>
                        <TableCell className="text-right">{ag.conversions?.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              {keywordsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">Conv.</TableHead>
                        <TableHead className="text-right">Taxa Conv.</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">CPM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((keywordData as any[]) || []).slice(0, 20).map((k: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{k.keyword_text}</TableCell>
                          <TableCell>
                            <GoogleStatusBadge status={k.status} />
                          </TableCell>
                          <TableCell className="text-right">{formatValue("cost", k.cost)}</TableCell>
                          <TableCell className="text-right">{k.clicks}</TableCell>
                          <TableCell className="text-right">{k.conversions?.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            {formatValue("conversion_rate", k.conversion_rate)}
                          </TableCell>
                          <TableCell className="text-right">{formatValue("average_cpc", k.average_cpc)}</TableCell>
                          <TableCell className="text-right">{formatValue("average_cpm", k.average_cpm)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalKeywordPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        Página {keywordPage + 1} de {totalKeywordPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setKeywordPage((p) => Math.max(0, p - 1))}
                          disabled={keywordPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setKeywordPage((p) => Math.min(totalKeywordPages - 1, p + 1))}
                          disabled={keywordPage >= totalKeywordPages - 1}
                        >
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

      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Custo"
              value={formatValue("cost", metrics?.cost)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Conversões"
              value={formatValue("conversions", metrics?.conversions)}
              icon={<Target className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CPC Médio"
              value={formatValue("average_cpc", metrics?.average_cpc)}
              icon={<MousePointer className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="CTR"
              value={formatValue("ctr", metrics?.ctr)}
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
            <KpiCard
              label="Valor Conv."
              value={formatValue("conversion_value", metrics?.conversion_value)}
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={metricsLoading}
            />
          </div>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Visão Temporal (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="cost" fill="hsl(142,71%,45%)" name="Custo (R$)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="conversions" fill="hsl(200,95%,50%)" name="Conversões" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {monthlyLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Sem dados para o período"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
