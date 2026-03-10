import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Heart, MessageCircle, TrendingUp, Image } from "lucide-react";

const periodOptions = [
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
];

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
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
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhum post encontrado
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((post: any) => (
              <TableRow key={post.id}>
                <TableCell>
                  {post.image ? (
                    <img src={post.image} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors line-clamp-2"
                  >
                    {post.message}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {post.channel === "stories" ? "Stories" : "Feed"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(post.createdTime).toLocaleDateString("pt-BR")}
                    </span>
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

function PlatformSection({
  title,
  icon,
  data,
  isLoading,
  error,
  period,
}: {
  title: string;
  icon: React.ReactNode;
  data: any;
  isLoading: boolean;
  error: any;
  period: string;
}) {
  const [channelFilter, setChannelFilter] = useState("todos");

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Erro ao carregar dados. Verifique a conexão.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        {data?.username && (
          <Badge variant="outline" className="text-xs">
            @{data.username}
          </Badge>
        )}
      </div>

      {/* Metrics cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data?.metrics?.reach != null && <MetricCard label="Alcance" value={data.metrics.reach} icon={Eye} />}
          {data?.metrics?.impressions != null && (
            <MetricCard label="Visualizações" value={data.metrics.impressions} icon={TrendingUp} />
          )}
          {data?.metrics?.views != null && <MetricCard label="Visualizações" value={data.metrics.views} icon={TrendingUp} />}
          <MetricCard label="Seguidores" value={data?.metrics?.followers || 0} icon={Users} />
          <MetricCard label="Curtidas" value={data?.metrics?.likes || 0} icon={Heart} />
          <MetricCard label="Comentários" value={data?.metrics?.comments || 0} icon={MessageCircle} />
          {data?.metrics?.newFollowers != null && (
            <MetricCard label="Novos Seguidores" value={data.metrics.newFollowers} icon={Users} />
          )}
        </div>
      )}

      {/* Top posts */}
      {!isLoading && data?.topPosts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Melhores Posts</CardTitle>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <PostsTable posts={data.topPosts} channelFilter={channelFilter} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Icons
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

export default function SocialMedia() {
  const { clientId } = useAuth();
  const [period, setPeriod] = useState("30");

  // Check which platforms are connected
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

  // Fetch insights
  const fbQuery = useQuery({
    queryKey: ["facebook-page-insights", clientId, period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("facebook-page-insights", {
        body: { client_id: clientId, period },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasFacebook,
    staleTime: 1000 * 60 * 5,
  });

  const igQuery = useQuery({
    queryKey: ["instagram-insights", clientId, period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-insights", {
        body: { client_id: clientId, period },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && hasInstagram,
    staleTime: 1000 * 60 * 5,
  });

  const liQuery = useQuery({
    queryKey: ["linkedin-insights", clientId, period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("linkedin-insights", {
        body: { client_id: clientId, period },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Redes Sociais</h1>
            <p className="text-muted-foreground">Métricas orgânicas das suas redes sociais</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasAny && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma rede social conectada. Vá em{" "}
                <a href="/dashboard/connections" className="text-primary hover:underline">
                  Conexões
                </a>{" "}
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
                <PlatformSection
                  title="Facebook Page"
                  icon={<FacebookIcon />}
                  data={fbQuery.data}
                  isLoading={fbQuery.isLoading}
                  error={fbQuery.error}
                  period={period}
                />
              </TabsContent>
            )}

            {hasInstagram && (
              <TabsContent value="instagram" className="mt-4">
                <PlatformSection
                  title="Instagram"
                  icon={<InstagramIcon />}
                  data={igQuery.data}
                  isLoading={igQuery.isLoading}
                  error={igQuery.error}
                  period={period}
                />
              </TabsContent>
            )}

            {hasLinkedin && (
              <TabsContent value="linkedin" className="mt-4">
                <PlatformSection
                  title="LinkedIn"
                  icon={<LinkedInIcon />}
                  data={liQuery.data}
                  isLoading={liQuery.isLoading}
                  error={liQuery.error}
                  period={period}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
