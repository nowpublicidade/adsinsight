import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Zap, Shield, Bell, FileText, Users, ArrowRight, Star, ChevronRight,
} from "lucide-react";
import { useEffect, useRef } from "react";

/* ── Scroll Reveal ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("revealed"); observer.unobserve(el); } },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="reveal" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Data ── */
const features = [
  { icon: BarChart3, title: "Dashboard Unificado", description: "Meta Ads e Google Ads lado a lado. Métricas consolidadas em tempo real sem precisar alternar entre plataformas.", color: "var(--periwinkle)" },
  { icon: Zap, title: "Automação Inteligente", description: "Regras automáticas para pausar campanhas, ajustar orçamentos e alertas quando o ROAS cair abaixo do target.", color: "var(--neon-green)" },
  { icon: Bell, title: "Alertas em Tempo Real", description: "Notificações imediatas por WhatsApp ou email quando métricas críticas mudam.", color: "var(--primary)" },
  { icon: FileText, title: "Relatórios Automáticos", description: "Gere PDFs personalizados para clientes com sua marca. Agendamento semanal ou mensal com um clique.", color: "var(--meta)" },
  { icon: Shield, title: "Dados Seguros", description: "Acesso OAuth2 somente leitura. Seus dados não são vendidos ou compartilhados.", color: "var(--success)" },
  { icon: Users, title: "Multi-cliente", description: "Gerencie todas as contas de clientes em um único login. Perfeito para agências.", color: "var(--google)" },
];

const testimonials = [
  { name: "Mariana Souza", role: "Gestora de Tráfego", company: "Agência Pulse", text: "Reduzi o tempo de relatórios de 6 horas para 20 minutos. O dashboard unificado mudou minha rotina completamente.", stars: 5 },
  { name: "Rafael Torres", role: "CMO", company: "E-commerce BrindeMais", text: "Finalmente consegui enxergar o ROAS real consolidado entre Meta e Google. Identificamos onde estava perdendo dinheiro em 2 dias.", stars: 5 },
  { name: "Amanda Lima", role: "Diretora de Marketing", company: "SaaS Contabilizei", text: "Os alertas automáticos salvaram nossas campanhas várias vezes. Recomendo para qualquer equipe que invista em mídia paga.", stars: 5 },
];

const brands = [
  "Meta Ads", "Google Ads", "Shopify", "RD Station", "HubSpot", "Hotmart", "Kiwify", "Eduzz",
  "Meta Ads", "Google Ads", "Shopify", "RD Station", "HubSpot", "Hotmart", "Kiwify", "Eduzz",
];

const footerLinks = [
  { title: "Produto", links: ["Funcionalidades", "Preços", "Integrações", "Changelog"] },
  { title: "Empresa", links: ["Sobre", "Blog", "Carreiras", "Imprensa"] },
  { title: "Suporte", links: ["Central de Ajuda", "Documentação", "Status", "Contato"] },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />

      {/* ── Brands Marquee ── */}
      <section className="py-16 border-y border-border overflow-hidden">
        <div className="container mx-auto max-w-7xl px-6 mb-8">
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Integra com as principais plataformas
          </p>
        </div>
        <div className="relative overflow-hidden marquee-track">
          <div className="flex gap-12 animate-marquee whitespace-nowrap marquee-content">
            {brands.map((brand, i) => (
              <span key={i} className="text-sm font-semibold text-muted-foreground/40 shrink-0 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--periwinkle)/0.5)]" />
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none opacity-[0.08]"
          style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)" }} />
        <div className="container mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="badge-superneon mb-4 inline-flex">Funcionalidades</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Tudo que você precisa, <span className="text-gradient">em um lugar</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Do relatório ao alerta automático, o now! insight cobre todo o ciclo de gestão.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, description, color }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="group h-full rounded-xl border border-border bg-[hsl(var(--surface))] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover cursor-default">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `hsl(${color} / 0.15)`, border: `1px solid hsl(${color} / 0.25)` }}>
                    <Icon className="w-5 h-5" style={{ color: `hsl(${color})` }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statistics ── */}
      <section className="py-24 border-y border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, hsl(var(--primary) / 0.06), transparent 70%)" }} />
        <div className="container mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {[
                { value: "3.2×", label: "ROAS médio dos clientes", color: "var(--periwinkle)" },
                { value: "8h", label: "Horas economizadas por semana", color: "var(--neon-green)" },
                { value: "97%", label: "Precisão dos dados reportados", color: "var(--primary)" },
              ].map(({ value, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="text-6xl md:text-7xl font-bold tracking-tight" style={{ color: `hsl(${color})` }}>
                    {value}
                  </div>
                  <p className="text-muted-foreground text-base max-w-[200px]">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-32">
        <div className="container mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="badge-superneon mb-4 inline-flex">Depoimentos</span>
              <h2 className="text-4xl md:text-5xl font-bold">
                Quem usa, <span className="text-gradient">recomenda</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, company, text, stars }, i) => (
              <Reveal key={name} delay={i * 100}>
                <div className="h-full rounded-xl border border-border bg-[hsl(var(--surface))] p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="flex gap-1">
                    {Array.from({ length: stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{text}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center text-xs font-bold text-[hsl(var(--periwinkle))]">
                      {name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{name}</div>
                      <div className="text-xs text-muted-foreground">{role} · {company}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, hsl(var(--primary) / 0.12), transparent 70%)" }} />
        <div className="container mx-auto max-w-3xl px-6 text-center relative">
          <Reveal>
            <span className="badge-superneon mb-6 inline-flex">Comece hoje</span>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Pronto para ter controle <span className="text-gradient">total</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Conecte suas contas em menos de 5 minutos. Sem cartão de crédito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="glow" size="xl" onClick={() => navigate("/auth")} className="gap-2">
                Criar conta grátis <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="xl" className="gap-2">
                Falar com vendas <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <img src="/logo.png" alt="now! insight" className="h-9 w-auto object-contain mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Dashboard unificado para gestores de tráfego e agências que querem resultados reais.
              </p>
            </div>
            {footerLinks.map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} now! insight. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              {["Privacidade", "Termos", "Cookies"].map((item) => (
                <a key={item} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
