import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, TrendingUp, Target, Zap } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center animate-glow">
                <BarChart3 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              <span className="text-gradient">Ads Dashboard</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Todas as suas métricas de Meta Ads e Google Ads em um único lugar, 
              com relatórios personalizáveis e insights em tempo real.
            </p>
            
            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="btn-glow text-lg px-8 h-14"
                onClick={() => navigate('/auth')}
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 h-14"
                onClick={() => navigate('/auth')}
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Tudo que você precisa para <span className="text-gradient">crescer</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dashboard completo para gerenciar suas campanhas de anúncios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Métricas Unificadas</h3>
            <p className="text-muted-foreground">
              Veja Meta Ads e Google Ads lado a lado. Compare performance e identifique oportunidades.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Conversões do Pixel</h3>
            <p className="text-muted-foreground">
              Acompanhe ROAS, compras, add to cart e todas as métricas do Pixel do Meta em tempo real.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Relatórios Personalizados</h3>
            <p className="text-muted-foreground">
              Crie múltiplos relatórios com as métricas que importam para você. Arraste e solte para organizar.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Pronto para otimizar suas campanhas?
          </h2>
          <p className="text-muted-foreground mb-8">
            Comece gratuitamente e conecte suas contas em minutos
          </p>
          <Button 
            size="lg" 
            className="btn-glow"
            onClick={() => navigate('/auth')}
          >
            Criar Conta Gratuita
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-gradient">Ads Dashboard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Ads Dashboard. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
