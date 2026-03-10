import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlatformHeader from "@/components/layout/PlatformHeader";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Heart, MessageCircle, TrendingUp, Image, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

// ─── Helpers ────────────────────────────────────────────
function calcChange(current: number, previous: number): number | null {
  if (!previous || previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function ComparisonBadge({ change }: { change: number | null }) {
  if (change === null) return null;
  const isPositive = change >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold", isPositive ? "text-green-500" : "text-red-500")}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, change }: { label: string; value: string | number; icon: any; change?: number | null }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              {change !== undefined && <ComparisonBadge change={change} />}
            </div>
            <p className="text-xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Posts table ─────────────────────────────────────────
function PostsTable({ posts, channelFilter }: { posts: any[]; channelFilter: string }) {
  const filtered = channelFilter === "todos" ? posts : posts.filter((p) => p.channel === channelFilter);
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Post</TableHead>
            <TableHead className="text-right w-[80px]">Curtidas</TableHead>
            <TableHead className="text-right w-[100px]">Comentários</TableHead>
            <TableHead className="text-right w-[100px]">Engajamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum post encontrado</TableCell>
            </TableRow>
          ) : (
            filtered.map((post: any) => (
              <TableRow key={post.id}>
                <TableCell>
                  {post.image ? (
                    <img src={post.image} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </TableCell>
                <TableCell>
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary transition-colors line-clamp-2">{post.message}</a>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{post.channel === "stories" ? "Stories" : "Feed"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(post.createdTime).toLocaleDateString("pt-BR")}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{post.likes}</TableCell>
                <TableCell className="text-right">{post.comments}</TableCell>
                <TableCell className="text-right font-medium">{post.engagement}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────
function ImpressionsEngagementChart({ daily }: { daily: any }) {
  if (!daily?.impressions?.length && !daily?.engagement?.length) return null;

  // Merge impressions + engagement by date
  const dateMap: Record<string, { date: string; impressions: number; engagement: number }> = {};
  for (const d of daily.impressions || []) {
    if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, impressions: 0, engagement: 0 };
    dateMap[d.date].impressions = d.value;
  }
  for (const d of daily.engagement || []) {
    if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, impressions: 0, engagement: 0 };
    dateMap[d.date].engagement = d.value;
  }
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Impressões x Engajamento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} className="text-muted-foreground" />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="impressions" name="Impressões" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="engagement" name="Engajamento" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function NewFollowersChart({ daily }: { daily: any }) {
  const data = daily?.newFollowers;
  if (!data?.length) return null;
  const chartData = [...data].sort((a: any, b: any) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Novos Seguidores</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')} />
            <Bar dataKey="value" name="Novos Seguidores" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Platform Section ───────────────────────────────────
function PlatformSection({ title, icon, data, isLoading, error }: { title: string; icon: React.ReactNode; data: any; isLoading: boolean; error: any }) {
  const [channelFilter, setChannelFilter] = useState("todos");

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Erro ao carregar dados. Verifique a conexão.</p></CardContent>
      </Card>
    );
  }

  const comp = data?.comparison;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        {data?.username && <Badge variant="outline" className="text-xs">@{data.username}</Badge>}
        {data?.pageName && <Badge variant="outline" className="text-xs">{data.pageName}</Badge>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data?.metrics?.reach != null && <MetricCard label="Alcance" value={data.metrics.reach} icon={Eye} change={comp ? calcChange(data.metrics.reach, comp.reach) : undefined} />}
          {data?.metrics?.impressions != null && <MetricCard label="Impressões" value={data.metrics.impressions} icon={TrendingUp} change={comp ? calcChange(data.metrics.impressions, comp.impressions) : undefined} />}
          {data?.metrics?.views != null && <MetricCard label="Visualizações" value={data.metrics.views} icon={TrendingUp} change={comp ? calcChange(data.metrics.views, comp.views) : undefined} />}
          <MetricCard label="Seguidores" value={data?.metrics?.followers || 0} icon={Users} />
          <MetricCard label="Curtidas" value={data?.metrics?.likes || 0} icon={Heart} change={comp ? calcChange(data?.metrics?.likes || 0, comp.likes) : undefined} />
          <MetricCard label="Comentários" value={data?.metrics?.comments || 0} icon={MessageCircle} change={comp ? calcChange(data?.metrics?.comments || 0, comp.comments) : undefined} />
          {data?.metrics?.newFollowers != null && <MetricCard label="Novos Seguidores" value={data.metrics.newFollowers} icon={Users} change={comp ? calcChange(data.metrics.newFollowers, comp.newFollowers) : undefined} />}
        </div>
      )}

      {/* Charts */}
      {!isLoading && data?.daily && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ImpressionsEngagementChart daily={data.daily} />
          <NewFollowersChart daily={data.daily} />
        </div>
      )}

      {/* Top posts */}
      {!isLoading && data?.topPosts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Melhores Posts</CardTitle>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0"><PostsTable posts={data.topPosts} channelFilter={channelFilter} /></CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[hsl(214,89%,52%)]" fill="currentColor">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[hsl(330,70%,55%)]" fill="currentColor">
    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[hsl(210,80%,45%)]" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// ─── Main Page ──────────────────────────────────────────
const socialTabs: { value: string; label: string }[] = [];

export default function SocialMedia() {
  const { clientId } = useAuth();
  const { datePreset, setDatePreset, customDateRange, setCustomDateRange, dateBody, dateKey, isRefreshing, handleRefresh } =
    useDashboardFilters(["facebook-page-insights", "instagram-insights", "linkedin-insights"]);

  const [activeTab, setActiveTab] = useState("overview");

  // Check connections
  const { data: client } = useQuery({
    queryKey: ["client-social-connections", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("fb_page_connected_at, ig_connected_at, linkedin_connected_at")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const hasFacebook = !!(client as any)?.fb_page_connected_at;
  const hasInstagram = !!(client as any)?.ig_connected_at;
  const hasLinkedin = !!(client as any)?.linkedin_connected_at;
  const hasAny = hasFacebook || hasInstagram || hasLinkedin;

  const fbQuery = useQuery({
    queryKey: ["facebook-page-insights", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("facebook-page-insights", {
        body: { client_id: clientId, ...dateBody },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasFacebook,
    staleTime: 1000 * 60 * 5,
  });

  const igQuery = useQuery({
    queryKey: ["instagram-insights", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-insights", {
        body: { client_id: clientId, ...dateBody },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasInstagram,
    staleTime: 1000 * 60 * 5,
  });

  const liQuery = useQuery({
    queryKey: ["linkedin-insights", clientId, ...dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("linkedin-insights", {
        body: { client_id: clientId, ...dateBody },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasLinkedin,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PlatformHeader
          platform="home"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={socialTabs}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <div className="flex items-center gap-2 -mt-4">
          <h1 className="text-2xl font-bold">Redes Sociais</h1>
        </div>
        <p className="text-muted-foreground -mt-4">Métricas orgânicas das suas redes sociais</p>

        {!hasAny && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma rede social conectada. Vá em{" "}
                <a href="/dashboard/connections" className="text-primary hover:underline">Conexões</a>{" "}
                para conectar Facebook, Instagram ou LinkedIn.
              </p>
            </CardContent>
          </Card>
        )}

        {hasAny && (
          <Tabs defaultValue={hasFacebook ? "facebook" : hasInstagram ? "instagram" : "linkedin"}>
            <TabsList>
              {hasFacebook && <TabsTrigger value="facebook">Facebook</TabsTrigger>}
              {hasInstagram && <TabsTrigger value="instagram">Instagram</TabsTrigger>}
              {hasLinkedin && <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>}
            </TabsList>

            {hasFacebook && (
              <TabsContent value="facebook" className="mt-4">
                <PlatformSection title="Facebook Page" icon={<FacebookIcon />} data={fbQuery.data} isLoading={fbQuery.isLoading} error={fbQuery.error} />
              </TabsContent>
            )}
            {hasInstagram && (
              <TabsContent value="instagram" className="mt-4">
                <PlatformSection title="Instagram" icon={<InstagramIcon />} data={igQuery.data} isLoading={igQuery.isLoading} error={igQuery.error} />
              </TabsContent>
            )}
            {hasLinkedin && (
              <TabsContent value="linkedin" className="mt-4">
                <PlatformSection title="LinkedIn" icon={<LinkedInIcon />} data={liQuery.data} isLoading={liQuery.isLoading} error={liQuery.error} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
