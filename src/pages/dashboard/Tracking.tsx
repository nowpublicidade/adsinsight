import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, TrendingUp, TrendingDown, Minus, Info, Settings2, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const METRIC_OPTIONS = [
  { value: "ROAS", label: "ROAS" },
  { value: "CPL", label: "CPL (Custo por Lead)" },
  { value: "CPA", label: "CPA (Custo por Aquisição)" },
  { value: "CTR", label: "CTR (%)" },
  { value: "CPC", label: "CPC (Custo por Clique)" },
  { value: "CPM", label: "CPM" },
];

const PERIOD_OPTIONS = [
  { value: "ontem", label: "Ontem" },
  { value: "hoje", label: "Hoje" },
  { value: "3dias", label: "Últimos 3 dias" },
  { value: "7dias", label: "Últimos 7 dias" },
  { value: "15dias", label: "Últimos 15 dias" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "60dias", label: "Últimos 60 dias" },
  { value: "90dias", label: "Últimos 90 dias" },
  { value: "6meses", label: "Últimos 6 meses" },
  { value: "1ano", label: "Último ano" },
];

interface TrackingEntry {
  id: string;
  campaign_name: string;
  metric_value: number;
  daily_budget: number;
  recorded_at: string;
  created_at: string;
}

interface CampaignRow {
  campaign_name: string;
  current: TrackingEntry;
  previous: TrackingEntry | null;
  variation: number | null;
}

export default function Tracking() {
  const { clientId } = useAuth();
  const { toast } = useToast();

  const [metricName, setMetricName] = useState("ROAS");
  const [analysisPeriod, setAnalysisPeriod] = useState("7dias");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [newBudget, setNewBudget] = useState("");

  // Update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateCampaign, setUpdateCampaign] = useState("");
  const [updateMetricValue, setUpdateMetricValue] = useState("");
  const [updateBudget, setUpdateBudget] = useState("");

  // Load config
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data } = await supabase
        .from("tracking_configs")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (data) {
        setMetricName(data.metric_name);
        setAnalysisPeriod(data.analysis_period);
      }
      setConfigLoaded(true);
    })();
  }, [clientId]);

  // Load entries
  useEffect(() => {
    if (!clientId) return;
    loadEntries();
  }, [clientId]);

  const loadEntries = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tracking_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setEntries(data as TrackingEntry[]);
    setLoading(false);
  };

  // Save config
  const saveConfig = async (metric: string, period: string) => {
    if (!clientId) return;
    const { error } = await supabase
      .from("tracking_configs")
      .upsert({ client_id: clientId, metric_name: metric, analysis_period: period }, { onConflict: "client_id" });
    if (error) {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    }
  };

  const handleMetricChange = (v: string) => {
    setMetricName(v);
    saveConfig(v, analysisPeriod);
  };

  const handlePeriodChange = (v: string) => {
    setAnalysisPeriod(v);
    saveConfig(metricName, v);
  };

  // Group entries by campaign, get latest 2
  const campaignRows: CampaignRow[] = useMemo(() => {
    const grouped: Record<string, TrackingEntry[]> = {};
    for (const e of entries) {
      if (!grouped[e.campaign_name]) grouped[e.campaign_name] = [];
      grouped[e.campaign_name].push(e);
    }

    return Object.entries(grouped).map(([name, items]) => {
      // Already sorted desc
      const current = items[0];
      const previous = items.length > 1 ? items[1] : null;
      let variation: number | null = null;
      if (previous && previous.metric_value !== 0) {
        variation = ((current.metric_value - previous.metric_value) / Math.abs(previous.metric_value)) * 100;
      }
      return { campaign_name: name, current, previous, variation };
    });
  }, [entries]);

  // Add campaign
  const handleAdd = async () => {
    if (!clientId || !newCampaign.trim() || !newMetricValue) return;
    const { error } = await supabase.from("tracking_entries").insert({
      client_id: clientId,
      campaign_name: newCampaign.trim(),
      metric_value: parseFloat(newMetricValue),
      daily_budget: parseFloat(newBudget) || 0,
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Campanha adicionada" });
    setNewCampaign("");
    setNewMetricValue("");
    setNewBudget("");
    setDialogOpen(false);
    loadEntries();
  };

  // Update metric for existing campaign
  const openUpdateDialog = (row: CampaignRow) => {
    setUpdateCampaign(row.campaign_name);
    setUpdateMetricValue("");
    setUpdateBudget(String(row.current.daily_budget));
    setUpdateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!clientId || !updateMetricValue) return;
    const { error } = await supabase.from("tracking_entries").insert({
      client_id: clientId,
      campaign_name: updateCampaign,
      metric_value: parseFloat(updateMetricValue),
      daily_budget: parseFloat(updateBudget) || 0,
    });
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Métrica atualizada" });
    setUpdateDialogOpen(false);
    loadEntries();
  };

  // Delete campaign (all entries)
  const handleDelete = async (campaignName: string) => {
    if (!clientId) return;
    const { error } = await supabase
      .from("tracking_entries")
      .delete()
      .eq("client_id", clientId)
      .eq("campaign_name", campaignName);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }
    toast({ title: "Campanha removida" });
    loadEntries();
  };

  const variationBadge = (variation: number | null) => {
    if (variation === null) return <span className="text-muted-foreground text-xs">—</span>;
    const isPositive = variation > 0;
    const isNeutral = variation === 0;
    const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
    return (
      <Badge
        className={cn(
          "gap-1 font-mono text-xs",
          isPositive && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
          isNeutral && "bg-muted text-muted-foreground border-border",
          !isPositive && !isNeutral && "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20",
        )}
      >
        <Icon className="h-3 w-3" />
        {variation > 0 ? "+" : ""}
        {variation.toFixed(1)}%
      </Badge>
    );
  };

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === analysisPeriod)?.label || analysisPeriod;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Acompanhamento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitore a variação da métrica principal das suas campanhas a cada atualização.
          </p>
        </div>

        {/* Config + Legendas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Configuração
              </CardTitle>
              <CardDescription>Defina a métrica e o período de análise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Métrica principal
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px] text-xs">
                      A métrica que será acompanhada em todas as campanhas. Ex: ROAS para medir retorno, CPL para custo por lead.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={metricName} onValueChange={handleMetricChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Período de análise
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px] text-xs">
                      Frequência com que você atualiza os dados. A variação será calculada comparando o valor atual com o valor anterior nesse mesmo período.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={analysisPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Como funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>
                  <strong className="text-foreground">Adicione campanhas</strong> com o valor atual da métrica e orçamento diário.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>
                  <strong className="text-foreground">Atualize periodicamente</strong> ({periodLabel.toLowerCase()}) clicando em <RefreshCw className="inline h-3 w-3" /> na linha da campanha.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>
                  A <strong className="text-foreground">variação</strong> é calculada automaticamente:
                  <code className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">((atual − anterior) / anterior) × 100</code>
                </span>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                  <TrendingUp className="h-3 w-3" /> +10%
                </Badge>
                <span>Melhoria</span>
                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1 text-xs">
                  <TrendingDown className="h-3 w-3" /> -5%
                </Badge>
                <span>Queda</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Campanhas</CardTitle>
              <CardDescription>Análise {periodLabel.toLowerCase()} • Métrica: {metricName}</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Campanha</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Nome da campanha</Label>
                    <Input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="Ex: Campanha Leads SP" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{metricName}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={newMetricValue}
                      onChange={(e) => setNewMetricValue(e.target.value)}
                      placeholder="Ex: 3.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Orçamento diário (R$)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      placeholder="Ex: 150"
                    />
                  </div>
                  <Button onClick={handleAdd} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">{metricName}</TableHead>
                  <TableHead className="text-center">Variação</TableHead>
                  <TableHead className="text-right">Orçamento/dia</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : campaignRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma campanha adicionada. Clique em "Adicionar" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaignRows.map((row) => (
                    <TableRow key={row.campaign_name}>
                      <TableCell className="font-medium">{row.campaign_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.current.metric_value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{variationBadge(row.variation)}</TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {row.current.daily_budget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => openUpdateDialog(row)}>
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Atualizar métrica</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.campaign_name)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover campanha</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Update Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar — {updateCampaign}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Novo valor de {metricName}</Label>
                <Input
                  type="number"
                  step="any"
                  value={updateMetricValue}
                  onChange={(e) => setUpdateMetricValue(e.target.value)}
                  placeholder="Ex: 4.2"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Orçamento diário (R$)</Label>
                <Input
                  type="number"
                  step="any"
                  value={updateBudget}
                  onChange={(e) => setUpdateBudget(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full">
                Salvar atualização
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
