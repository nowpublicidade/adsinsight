import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Loader2, 
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  MousePointer,
  Eye as EyeIcon,
  ShoppingCart,
  Target,
} from 'lucide-react';

// Definição das métricas disponíveis
const AVAILABLE_METRICS = {
  meta: [
    { key: 'spend', name: 'Gasto', icon: DollarSign, category: 'Geral' },
    { key: 'impressions', name: 'Impressões', icon: EyeIcon, category: 'Geral' },
    { key: 'reach', name: 'Alcance', icon: Users, category: 'Geral' },
    { key: 'clicks', name: 'Cliques', icon: MousePointer, category: 'Geral' },
    { key: 'ctr', name: 'CTR', icon: TrendingUp, category: 'Geral' },
    { key: 'cpc', name: 'CPC', icon: DollarSign, category: 'Geral' },
    { key: 'cpm', name: 'CPM', icon: DollarSign, category: 'Geral' },
    { key: 'frequency', name: 'Frequência', icon: BarChart3, category: 'Geral' },
    { key: 'leads', name: 'Leads', icon: Target, category: 'Conversões' },
    { key: 'cost_per_lead', name: 'CPL', icon: DollarSign, category: 'Conversões' },
    { key: 'purchases', name: 'Compras', icon: ShoppingCart, category: 'Pixel' },
    { key: 'purchase_value', name: 'Valor de Compras', icon: DollarSign, category: 'Pixel' },
    { key: 'roas', name: 'ROAS', icon: TrendingUp, category: 'Pixel' },
    { key: 'cost_per_purchase', name: 'Custo por Compra', icon: DollarSign, category: 'Pixel' },
    { key: 'add_to_cart', name: 'Add to Cart', icon: ShoppingCart, category: 'Pixel' },
    { key: 'cost_per_add_to_cart', name: 'Custo por Add to Cart', icon: DollarSign, category: 'Pixel' },
    { key: 'initiate_checkout', name: 'Initiate Checkout', icon: ShoppingCart, category: 'Pixel' },
    { key: 'cost_per_checkout', name: 'Custo por Checkout', icon: DollarSign, category: 'Pixel' },
    { key: 'view_content', name: 'View Content', icon: EyeIcon, category: 'Pixel' },
    { key: 'complete_registration', name: 'Complete Registration', icon: Users, category: 'Pixel' },
    { key: 'cost_per_registration', name: 'Custo por Registro', icon: DollarSign, category: 'Pixel' },
    { key: 'pixel_leads', name: 'Leads (Pixel)', icon: Target, category: 'Pixel' },
    { key: 'cost_per_pixel_lead', name: 'Custo por Lead (Pixel)', icon: DollarSign, category: 'Pixel' },
  ],
  google: [
    { key: 'cost', name: 'Gasto', icon: DollarSign, category: 'Geral' },
    { key: 'impressions', name: 'Impressões', icon: EyeIcon, category: 'Geral' },
    { key: 'clicks', name: 'Cliques', icon: MousePointer, category: 'Geral' },
    { key: 'ctr', name: 'CTR', icon: TrendingUp, category: 'Geral' },
    { key: 'average_cpc', name: 'CPC Médio', icon: DollarSign, category: 'Geral' },
    { key: 'average_cpm', name: 'CPM Médio', icon: DollarSign, category: 'Geral' },
    { key: 'conversions', name: 'Conversões', icon: Target, category: 'Conversões' },
    { key: 'cost_per_conversion', name: 'Custo por Conversão', icon: DollarSign, category: 'Conversões' },
    { key: 'conversion_rate', name: 'Taxa de Conversão', icon: TrendingUp, category: 'Conversões' },
    { key: 'conversion_value', name: 'Valor de Conversão', icon: DollarSign, category: 'Conversões' },
    { key: 'roas', name: 'ROAS', icon: TrendingUp, category: 'Conversões' },
  ],
  analytics: [
    { key: 'sessions', name: 'Sessões', icon: BarChart3, category: 'Tráfego' },
    { key: 'newUsers', name: 'Novos Usuários', icon: Users, category: 'Tráfego' },
    { key: 'totalUsers', name: 'Total de Usuários', icon: Users, category: 'Tráfego' },
    { key: 'engagementRate', name: 'Taxa de Engajamento', icon: TrendingUp, category: 'Engajamento' },
    { key: 'eventCount', name: 'Eventos', icon: Target, category: 'Engajamento' },
    { key: 'averageSessionDuration', name: 'Duração Média', icon: BarChart3, category: 'Engajamento' },
    { key: 'sessionsPerUser', name: 'Sessões por Usuário', icon: Users, category: 'Engajamento' },
    { key: 'engagedSessions', name: 'Sessões Engajadas', icon: TrendingUp, category: 'Engajamento' },
    { key: 'screenPageViews', name: 'Visualizações de Página', icon: EyeIcon, category: 'Conteúdo' },
  ],
};

type WidgetType = {
  id?: string;
  metric_key: string;
  display_name: string;
  platform: 'meta' | 'google' | 'analytics';
  visualization_type: 'card' | 'chart' | 'table' | 'funnel';
  position: number;
  is_visible: boolean;
};

export default function ReportEditor() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<WidgetType[]>([]);
  const [reportName, setReportName] = useState('');

  // Fetch report details
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

  // Fetch existing widgets
  const { data: existingWidgets, isLoading: widgetsLoading } = useQuery({
    queryKey: ['report-widgets', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('report_widgets')
        .select('*')
        .eq('report_id', reportId)
        .order('position');
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  useEffect(() => {
    if (report) {
      setReportName(report.name);
    }
  }, [report]);

  useEffect(() => {
    if (existingWidgets) {
      setWidgets(existingWidgets.map(w => ({
        id: w.id,
        metric_key: w.metric_key,
        display_name: w.display_name,
        platform: w.platform as 'meta' | 'google' | 'analytics',
        visualization_type: w.visualization_type as 'card' | 'chart' | 'table' | 'funnel',
        position: w.position,
        is_visible: w.is_visible ?? true,
      })));
    }
  }, [existingWidgets]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error('Report ID não encontrado');

      // Update report name
      const { error: reportError } = await supabase
        .from('reports')
        .update({ name: reportName })
        .eq('id', reportId);
      if (reportError) throw reportError;

      // Delete existing widgets
      const { error: deleteError } = await supabase
        .from('report_widgets')
        .delete()
        .eq('report_id', reportId);
      if (deleteError) throw deleteError;

      // Insert new widgets
      if (widgets.length > 0) {
        const widgetsToInsert = widgets.map((w, index) => ({
          report_id: reportId,
          metric_key: w.metric_key,
          display_name: w.display_name,
          platform: w.platform,
          visualization_type: w.visualization_type,
          position: index,
          is_visible: w.is_visible,
        }));

        const { error: insertError } = await supabase
          .from('report_widgets')
          .insert(widgetsToInsert);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report-widgets', reportId] });
      toast.success('Relatório salvo com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const addWidget = (metric: typeof AVAILABLE_METRICS.meta[0], platform: 'meta' | 'google' | 'analytics') => {
    const exists = widgets.some(w => w.metric_key === metric.key && w.platform === platform);
    if (exists) {
      toast.error('Esta métrica já foi adicionada');
      return;
    }
    
    setWidgets([...widgets, {
      metric_key: metric.key,
      display_name: metric.name,
      platform,
      visualization_type: 'card',
      position: widgets.length,
      is_visible: true,
    }]);
  };

  const removeWidget = (index: number) => {
    setWidgets(widgets.filter((_, i) => i !== index));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newWidgets = [...widgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
    setWidgets(newWidgets);
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
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Relatório não encontrado</h2>
          <Button onClick={() => navigate('/dashboard/reports')} className="mt-4">
            Voltar para Relatórios
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const metaCategories = [...new Set(AVAILABLE_METRICS.meta.map(m => m.category))];
  const googleCategories = [...new Set(AVAILABLE_METRICS.google.map(m => m.category))];
  const analyticsCategories = [...new Set(AVAILABLE_METRICS.analytics.map(m => m.category))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/reports')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="text-2xl font-bold border-none bg-transparent px-0 focus-visible:ring-0"
                placeholder="Nome do Relatório"
              />
              <p className="text-muted-foreground text-sm">
                Configure as métricas que serão exibidas neste relatório
              </p>
            </div>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Widgets configurados */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métricas Configuradas</CardTitle>
                <CardDescription>
                  Arraste para reordenar ou remova métricas do relatório
                </CardDescription>
              </CardHeader>
              <CardContent>
                {widgets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma métrica configurada</p>
                    <p className="text-sm">Adicione métricas usando o painel ao lado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {widgets.map((widget, index) => {
                      const metric = AVAILABLE_METRICS[widget.platform].find(
                        m => m.key === widget.metric_key
                      );
                      const Icon = metric?.icon || BarChart3;
                      
                      return (
                        <div
                          key={`${widget.platform}-${widget.metric_key}-${index}`}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{widget.display_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {widget.platform === 'analytics' ? 'Analytics' : widget.platform}
                          </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {widget.visualization_type}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveWidget(index, 'up')}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveWidget(index, 'down')}
                              disabled={index === widgets.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeWidget(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de métricas disponíveis */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Métricas</CardTitle>
                <CardDescription>
                  Selecione as métricas que deseja incluir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="meta">
                  <TabsList className="w-full">
                    <TabsTrigger value="meta" className="flex-1">Meta</TabsTrigger>
                    <TabsTrigger value="google" className="flex-1">Google</TabsTrigger>
                    <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="meta" className="space-y-4 mt-4">
                    {metaCategories.map(category => (
                      <div key={category}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                          {category}
                        </Label>
                        <div className="grid grid-cols-1 gap-1 mt-2">
                          {AVAILABLE_METRICS.meta
                            .filter(m => m.category === category)
                            .map(metric => {
                              const isAdded = widgets.some(
                                w => w.metric_key === metric.key && w.platform === 'meta'
                              );
                              return (
                                <Button
                                  key={metric.key}
                                  variant={isAdded ? "secondary" : "ghost"}
                                  size="sm"
                                  className="justify-start h-auto py-2"
                                  onClick={() => addWidget(metric, 'meta')}
                                  disabled={isAdded}
                                >
                                  <metric.icon className="h-4 w-4 mr-2" />
                                  <span className="text-sm">{metric.name}</span>
                                  {isAdded && (
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      Adicionado
                                    </Badge>
                                  )}
                                </Button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="google" className="space-y-4 mt-4">
                    {googleCategories.map(category => (
                      <div key={category}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                          {category}
                        </Label>
                        <div className="grid grid-cols-1 gap-1 mt-2">
                          {AVAILABLE_METRICS.google
                            .filter(m => m.category === category)
                            .map(metric => {
                              const isAdded = widgets.some(
                                w => w.metric_key === metric.key && w.platform === 'google'
                              );
                              return (
                                <Button
                                  key={metric.key}
                                  variant={isAdded ? "secondary" : "ghost"}
                                  size="sm"
                                  className="justify-start h-auto py-2"
                                  onClick={() => addWidget(metric, 'google')}
                                  disabled={isAdded}
                                >
                                  <metric.icon className="h-4 w-4 mr-2" />
                                  <span className="text-sm">{metric.name}</span>
                                  {isAdded && (
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      Adicionado
                                    </Badge>
                                  )}
                                </Button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4 mt-4">
                    {analyticsCategories.map(category => (
                      <div key={category}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                          {category}
                        </Label>
                        <div className="grid grid-cols-1 gap-1 mt-2">
                          {AVAILABLE_METRICS.analytics
                            .filter(m => m.category === category)
                            .map(metric => {
                              const isAdded = widgets.some(
                                w => w.metric_key === metric.key && w.platform === 'analytics'
                              );
                              return (
                                <Button
                                  key={metric.key}
                                  variant={isAdded ? "secondary" : "ghost"}
                                  size="sm"
                                  className="justify-start h-auto py-2"
                                  onClick={() => addWidget(metric, 'analytics')}
                                  disabled={isAdded}
                                >
                                  <metric.icon className="h-4 w-4 mr-2" />
                                  <span className="text-sm">{metric.name}</span>
                                  {isAdded && (
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      Adicionado
                                    </Badge>
                                  )}
                                </Button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
