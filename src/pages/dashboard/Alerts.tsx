import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Send, Trash2, Pencil, Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Segunda-feira" },
  { value: "tuesday", label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday", label: "Quinta-feira" },
  { value: "friday", label: "Sexta-feira" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const PERIODS = [
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

const AVAILABLE_METRICS = [
  { key: "spend", label: "Investimento (spend)" },
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "ctr", label: "CTR" },
  { key: "reach", label: "Alcance" },
  { key: "leads", label: "Leads" },
  { key: "cost_per_lead", label: "Custo por Lead" },
];

const TEMPLATE_VARS = [
  "{{spend}}", "{{impressions}}", "{{clicks}}", "{{cpc}}", "{{cpm}}",
  "{{ctr}}", "{{reach}}", "{{leads}}", "{{cost_per_lead}}", "{{period}}", "{{client_name}}",
];

interface AlertConfig {
  id: string;
  client_id: string;
  whatsapp_instance_name: string;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  meta_token: string;
  recipient_number: string;
  schedule_day: string;
  schedule_time: string;
  report_period: string;
  selected_metrics: string[];
  message_template: string;
  is_active: boolean;
  created_at: string;
}

interface AlertLog {
  id: string;
  alert_config_id: string;
  sent_at: string;
  status: string;
  message_sent: string | null;
  error_message: string | null;
}

const defaultForm = {
  whatsapp_instance_name: "",
  whatsapp_api_url: "https://evo.agencianowpublicidade.online",
  whatsapp_api_key: "",
  meta_token: "",
  recipient_number: "",
  schedule_day: "monday",
  schedule_time: "09:00",
  report_period: "7dias",
  selected_metrics: [] as string[],
  message_template: "",
  is_active: true,
};

export default function Alerts() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  async function fetchData() {
    setLoading(true);
    const [configsRes, logsRes] = await Promise.all([
      supabase
        .from("alert_configs")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_logs")
        .select("*")
        .eq("client_id", clientId!)
        .order("sent_at", { ascending: false })
        .limit(50),
    ]);
    setConfigs((configsRes.data as any[]) || []);
    setLogs((logsRes.data as any[]) || []);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(config: AlertConfig) {
    setEditingId(config.id);
    setForm({
      whatsapp_instance_name: config.whatsapp_instance_name,
      whatsapp_api_url: config.whatsapp_api_url,
      whatsapp_api_key: config.whatsapp_api_key,
      meta_token: config.meta_token,
      recipient_number: config.recipient_number,
      schedule_day: config.schedule_day,
      schedule_time: config.schedule_time,
      report_period: config.report_period,
      selected_metrics: config.selected_metrics || [],
      message_template: config.message_template,
      is_active: config.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!clientId) return;
    if (!form.whatsapp_instance_name || !form.whatsapp_api_key || !form.meta_token || !form.recipient_number || !form.message_template) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      client_id: clientId,
      ...form,
      selected_metrics: form.selected_metrics as any,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("alert_configs").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("alert_configs").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Alerta atualizado" : "Alerta criado" });
      setDialogOpen(false);
      fetchData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este alerta?")) return;
    await supabase.from("alert_configs").delete().eq("id", id);
    toast({ title: "Alerta excluído" });
    fetchData();
  }

  async function handleToggleActive(id: string, active: boolean) {
    await supabase.from("alert_configs").update({ is_active: active }).eq("id", id);
    fetchData();
  }

  async function handleSendNow(configId: string) {
    setSending(configId);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("send-alert-report", {
        body: { alert_config_id: configId },
      });

      if (res.error) throw new Error(res.error.message);
      toast({ title: "Relatório enviado com sucesso!" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    }
    setSending(null);
  }

  function toggleMetric(key: string) {
    setForm((prev) => ({
      ...prev,
      selected_metrics: prev.selected_metrics.includes(key)
        ? prev.selected_metrics.filter((m) => m !== key)
        : [...prev.selected_metrics, key],
    }));
  }

  const dayLabel = (val: string) => DAYS_OF_WEEK.find((d) => d.value === val)?.label || val;
  const periodLabel = (val: string) => PERIODS.find((p) => p.value === val)?.label || val;

  return (
    <DashboardLayout>
      <PlatformHeader
        title="Avisos"
        description="Configure o envio automático de relatórios via WhatsApp"
        icon={Bell}
      />

      <div className="space-y-6 mt-6">
        {/* Configs list */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Alertas Configurados</CardTitle>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Novo Alerta
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : configs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum alerta configurado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instância</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Dia / Horário</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.whatsapp_instance_name}</TableCell>
                        <TableCell>{c.recipient_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {dayLabel(c.schedule_day)} às {c.schedule_time}
                          </div>
                        </TableCell>
                        <TableCell>{periodLabel(c.report_period)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={(val) => handleToggleActive(c.id, val)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleSendNow(c.id)}
                                  disabled={sending === c.id}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar agora</TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Envios</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum envio registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(l.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.status === "success" ? "default" : "destructive"}>
                            {l.status === "success" ? "Sucesso" : "Erro"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-xs">
                          {l.message_sent || "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                          {l.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Alerta" : "Novo Alerta"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* WhatsApp config */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Configuração WhatsApp
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Nome da Instância *</Label>
                  <Input
                    value={form.whatsapp_instance_name}
                    onChange={(e) => setForm({ ...form, whatsapp_instance_name: e.target.value })}
                    placeholder="minha-instancia"
                  />
                </div>
                <div>
                  <Label>URL da API</Label>
                  <Input
                    value={form.whatsapp_api_url}
                    onChange={(e) => setForm({ ...form, whatsapp_api_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>API Key *</Label>
                  <Input
                    type="password"
                    value={form.whatsapp_api_key}
                    onChange={(e) => setForm({ ...form, whatsapp_api_key: e.target.value })}
                    placeholder="Chave da API"
                  />
                </div>
                <div>
                  <Label>Número do Cliente *</Label>
                  <Input
                    value={form.recipient_number}
                    onChange={(e) => setForm({ ...form, recipient_number: e.target.value })}
                    placeholder="5511999999999"
                  />
                </div>
              </div>
            </div>

            {/* Meta config */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Configuração Meta
              </h3>
              <div>
                <Label>Token do Meta *</Label>
                <Input
                  type="password"
                  value={form.meta_token}
                  onChange={(e) => setForm({ ...form, meta_token: e.target.value })}
                  placeholder="Token de acesso"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Programação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Dia da Semana</Label>
                  <Select value={form.schedule_day} onValueChange={(v) => setForm({ ...form, schedule_day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={form.schedule_time}
                    onChange={(e) => setForm({ ...form, schedule_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Período do Relatório</Label>
                  <Select value={form.report_period} onValueChange={(v) => setForm({ ...form, report_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Métricas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_METRICS.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.selected_metrics.includes(m.key)}
                      onCheckedChange={() => toggleMetric(m.key)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Message template */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Mensagem
                </h3>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Use variáveis como {"{{spend}}"}, {"{{clicks}}"} etc. na mensagem. Elas serão substituídas pelos valores reais do relatório.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                value={form.message_template}
                onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                placeholder={`Olá {{client_name}}! Segue seu relatório do período {{period}}:\n\n💰 Investimento: {{spend}}\n👁️ Impressões: {{impressions}}\n🖱️ Cliques: {{clicks}}\n📊 CTR: {{ctr}}`}
                rows={6}
              />
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, message_template: form.message_template + v })}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Alerta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
