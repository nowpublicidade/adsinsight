import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, TrendingUp, Zap, Shield } from "lucide-react";

const stats = [
  { label: "ROAS médio", value: "3.2×", icon: TrendingUp },
  { label: "Horas economizadas/semana", value: "8h", icon: Zap },
  { label: "Precisão dos dados", value: "97%", icon: Shield },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Gradiente radial de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(262 83% 58% / 0.18), transparent 70%)",
        }}
      />

      {/* Grid decorativo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto max-w-7xl px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Esquerda — Texto */}
          <div className="flex flex-col gap-8">
            {/* Badge */}
            <div className="inline-flex">
              <span className="badge-superneon">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
                Novo: Integração com Google Ads GA4
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                Seus anúncios,{" "}
                <span className="text-gradient-hero">um dashboard</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Centralize Meta Ads e Google Ads em um único painel inteligente. 
                Tome decisões mais rápidas com dados em tempo real e insights acionáveis.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Button
                variant="glow"
                size="lg"
                onClick={() => navigate("/auth")}
                className="gap-2 font-semibold"
              >
                Começar grátis
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Ver demonstração
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-4 border-t border-border">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(var(--surface-2))] flex items-center justify-center border border-border">
                    <Icon className="w-4 h-4 text-[hsl(var(--periwinkle))]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direita — Dashboard preview */}
          <div className="relative hidden lg:block">
            {/* Glow de fundo */}
            <div
              className="absolute inset-0 rounded-2xl blur-3xl opacity-20"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--periwinkle)))" }}
            />

            {/* Card principal */}
            <div className="relative rounded-2xl border border-border bg-[hsl(var(--surface))] overflow-hidden shadow-card-hover">
              {/* Topbar simulada */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
                <div className="flex-1 mx-4">
                  <div className="h-5 rounded-md bg-[hsl(var(--surface-2))] flex items-center px-3">
                    <span className="text-xs text-muted-foreground">adsinsight.app/dashboard</span>
                  </div>
                </div>
              </div>

              {/* Dashboard content simulado */}
              <div className="p-6 space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "ROAS", value: "3.8×", color: "var(--periwinkle)", trend: "+12%" },
                    { label: "Investido", value: "R$12.4k", color: "var(--meta)", trend: "+5%" },
                    { label: "Conversões", value: "1.247", color: "var(--success)", trend: "+23%" },
                  ].map(({ label, value, color, trend }) => (
                    <div
                      key={label}
                      className="rounded-lg p-3 bg-[hsl(var(--surface-2))] border border-border"
                    >
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="text-lg font-bold" style={{ color: `hsl(${color})` }}>
                        {value}
                      </div>
                      <div className="text-xs text-green-400">{trend}</div>
                    </div>
                  ))}
                </div>

                {/* Chart simulado */}
                <div className="rounded-lg p-4 bg-[hsl(var(--surface-2))] border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-foreground">Performance (30 dias)</span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--periwinkle))]" />
                        Meta
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--google))]" />
                        Google
                      </span>
                    </div>
                  </div>
                  {/* Barras de gráfico simuladas */}
                  <div className="flex items-end gap-1 h-24">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${h * 0.6}%`,
                            background:
                              i % 2 === 0
                                ? `hsl(var(--periwinkle) / 0.7)`
                                : `hsl(var(--google) / 0.7)`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plataformas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 flex items-center gap-3 bg-[hsl(214_89%_52%/0.1)] border border-[hsl(214_89%_52%/0.25)]">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--meta))] flex items-center justify-center text-white text-xs font-bold">M</div>
                    <div>
                      <div className="text-xs font-medium text-foreground">Meta Ads</div>
                      <div className="text-xs text-green-400">Conectado</div>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 flex items-center gap-3 bg-[hsl(4_90%_58%/0.1)] border border-[hsl(4_90%_58%/0.25)]">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--google))] flex items-center justify-center text-white text-xs font-bold">G</div>
                    <div>
                      <div className="text-xs font-medium text-foreground">Google Ads</div>
                      <div className="text-xs text-green-400">Conectado</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
