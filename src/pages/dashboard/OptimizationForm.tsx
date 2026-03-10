import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { CalendarIcon, ArrowLeft, Loader2, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function OptimizationForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { clientId } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  const [objective, setObjective] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [appliedTest, setAppliedTest] = useState("");
  const [notes, setNotes] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [status, setStatus] = useState("em_progresso");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [nextAnalysisDate, setNextAnalysisDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!isEditing) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("optimizations")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast({ title: "Erro ao carregar", description: error?.message, variant: "destructive" });
        navigate("/dashboard/optimizations");
        return;
      }
      const d = data as any;
      setObjective(d.objective);
      setHypothesis(d.hypothesis);
      setAppliedTest(d.applied_test);
      setNotes(d.notes || "");
      setFinalResult(d.final_result || "");
      setStatus(d.status);
      setStartDate(d.start_date ? new Date(d.start_date + "T00:00:00") : undefined);
      setNextAnalysisDate(d.next_analysis_date ? new Date(d.next_analysis_date + "T00:00:00") : undefined);
      setFetching(false);
    };
    fetch();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    setLoading(true);
    const payload = {
      client_id: clientId,
      objective,
      hypothesis,
      applied_test: appliedTest,
      notes: notes || null,
      final_result: finalResult || null,
      status,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      next_analysis_date: nextAnalysisDate ? format(nextAnalysisDate, "yyyy-MM-dd") : null,
    };

    const query = isEditing
      ? supabase.from("optimizations").update(payload).eq("id", id)
      : supabase.from("optimizations").insert(payload);

    const { error } = await query;
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: isEditing ? "Otimização atualizada" : "Otimização criada" });
    navigate("/dashboard/optimizations");
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/dashboard/optimizations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{isEditing ? "Editar Otimização" : "Nova Otimização"}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo do Plano *</Label>
            <Input id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} required placeholder="Ex: Aumentar taxa de conversão em 15%" />
          </div>

          {/* Hipótese */}
          <div className="space-y-2">
            <Label htmlFor="hypothesis">Hipótese *</Label>
            <Textarea id="hypothesis" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} required placeholder="Ex: Se alterarmos o CTA para verde, a taxa de clique aumentará" />
          </div>

          {/* Teste Aplicado */}
          <div className="space-y-2">
            <Label htmlFor="appliedTest">Teste Aplicado *</Label>
            <Textarea id="appliedTest" value={appliedTest} onChange={(e) => setAppliedTest(e.target.value)} required placeholder="Ex: Teste A/B com novo CTA na landing page" />
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <Label htmlFor="notes">Nota</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações adicionais..." />
          </div>

          {/* Resultado Final */}
          <div className="space-y-2">
            <Label htmlFor="finalResult">Resultado Final</Label>
            <Textarea id="finalResult" value={finalResult} onChange={(e) => setFinalResult(e.target.value)} placeholder="Ex: Aumento de 12% na taxa de conversão" />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_progresso">Em progresso</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data de Início */}
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Próxima Análise */}
            <div className="space-y-2">
              <Label>Data da Próxima Análise</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nextAnalysisDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextAnalysisDate ? format(nextAnalysisDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={nextAnalysisDate} onSelect={setNextAnalysisDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard/optimizations")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Otimização"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
