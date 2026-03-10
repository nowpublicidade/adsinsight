import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Lightbulb, Loader2, CalendarDays,
  FlaskConical, Target, MessageSquareText, Trophy, Eye, CalendarIcon,
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface Optimization {
  id: string;
  client_id: string;
  objective: string;
  hypothesis: string;
  applied_test: string;
  notes: string | null;
  final_result: string | null;
  status: string;
  start_date: string;
  next_analysis_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function Optimizations() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpt, setSelectedOpt] = useState<Optimization | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchOptimizations = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("optimizations")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar otimizações", description: error.message, variant: "destructive" });
    } else {
      setOptimizations((data as Optimization[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptimizations();
  }, [clientId]);

  const filtered = useMemo(() => {
    return optimizations.filter((opt) => {
      if (statusFilter !== "todos" && opt.status !== statusFilter) return false;
      if (dateRange?.from) {
        const d = startOfDay(new Date(opt.start_date + "T00:00:00"));
        if (isBefore(d, startOfDay(dateRange.from))) return false;
        if (dateRange.to && isAfter(d, startOfDay(dateRange.to))) return false;
      }
      return true;
    });
  }, [optimizations, statusFilter, dateRange]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("optimizations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Otimização excluída" });
      if (selectedOpt?.id === id) setSelectedOpt(null);
      fetchOptimizations();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd/MM/yy")} – ${format(dateRange.to, "dd/MM/yy")}`
      : format(dateRange.from, "dd/MM/yyyy")
    : "Todas as datas";

  const DetailRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-5.5">
        {children}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Otimizações</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus planos de otimização e testes</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/dashboard/optimizations/new">
              <Plus className="h-4 w-4 mr-2" />
              Nova Otimização
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="em_progresso">Em progresso</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
              {dateRange?.from && (
                <div className="px-3 pb-3">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setDateRange(undefined)}>
                    Limpar datas
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objetivo</TableHead>
                <TableHead>Hipótese</TableHead>
                <TableHead>Teste Aplicado</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Próxima Análise</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nenhuma otimização encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((opt) => (
                  <TableRow
                    key={opt.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedOpt(opt)}
                  >
                    <TableCell className="font-medium max-w-[180px] truncate">{opt.objective}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{opt.hypothesis}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{opt.applied_test}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{opt.notes || "—"}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{opt.final_result || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          opt.status === "concluido"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                        }
                      >
                        {opt.status === "concluido" ? "Concluído" : "Em progresso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(opt.start_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(opt.next_analysis_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedOpt(opt)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link to={`/dashboard/optimizations/${opt.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleDelete(opt.id, e)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOpt} onOpenChange={(open) => !open && setSelectedOpt(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {selectedOpt && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg">{selectedOpt.objective}</DialogTitle>
                  <Badge
                    className={
                      selectedOpt.status === "concluido"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30 shrink-0"
                    }
                  >
                    {selectedOpt.status === "concluido" ? "Concluído" : "Em progresso"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <DetailRow icon={Target} label="Hipótese">
                  {selectedOpt.hypothesis}
                </DetailRow>

                <DetailRow icon={FlaskConical} label="Teste Aplicado">
                  {selectedOpt.applied_test}
                </DetailRow>

                <DetailRow icon={MessageSquareText} label="Nota">
                  {selectedOpt.notes || "Sem notas"}
                </DetailRow>

                <DetailRow icon={Trophy} label="Resultado Final">
                  {selectedOpt.final_result || "Aguardando resultado"}
                </DetailRow>

                <div className="flex gap-6 pt-1">
                  <DetailRow icon={CalendarDays} label="Início">
                    {formatDate(selectedOpt.start_date)}
                  </DetailRow>
                  <DetailRow icon={CalendarDays} label="Próxima Análise">
                    {formatDate(selectedOpt.next_analysis_date)}
                  </DetailRow>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/optimizations/${selectedOpt.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Editar
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}