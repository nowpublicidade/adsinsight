import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Lightbulb, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("optimizations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Otimização excluída" });
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
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : optimizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nenhuma otimização cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                optimizations.map((opt) => (
                  <TableRow key={opt.id}>
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link to={`/dashboard/optimizations/${opt.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(opt.id)}
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
    </DashboardLayout>
  );
}
