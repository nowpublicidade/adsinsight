import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Target, Zap } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

const features = [
  {
    icon: TrendingUp,
    title: 'Métricas em tempo real',
    description: 'Meta Ads e Google Ads em um único dashboard',
  },
  {
    icon: Target,
    title: 'ROAS e Conversões',
    description: 'Todas as métricas do Pixel, compras e add to cart',
  },
  {
    icon: Zap,
    title: 'Relatórios automáticos',
    description: 'Dashboards personalizados para seus clientes',
  },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signIn, signUp, user, role, availableClients, clientId, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !role) return;

    if (role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    // Cliente com conta já selecionada (ex: só tem 1 conta)
    if (clientId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Cliente sem conta selecionada → tela de seleção (que trata 0 contas também)
    navigate('/account-select', { replace: true });
  }, [user, role, clientId, availableClients, loading, navigate]);

  const clearErrors = () => setErrors({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe);
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error(
        error.message.includes('Invalid login credentials')
          ? 'Email ou senha incorretos'
          : error.message.includes('Email not confirmed')
          ? 'Confirme seu email antes de entrar'
          : 'Erro ao fazer login. Tente novamente.'
      );
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = signupSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe);
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Esquerda: Features ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 xl:p-16 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 30% 50%, hsl(262 83% 58% / 0.12), transparent 70%)',
          }}
        />
        <div className="relative">
          <img src="/logo.png" alt="now! insight" className="h-12 w-auto object-contain mb-4" />
          <div className="mb-10">
            <h1 className="text-4xl font-bold leading-tight mb-3">
              Controle total dos seus{' '}
              <span className="text-gradient-hero">anúncios</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Dashboard unificado para gestores de tráfego que querem resultados reais.
            </p>
          </div>
          <div className="space-y-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-[hsl(var(--surface))] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--periwinkle)/0.3)]"
              >
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--surface-2))] flex items-center justify-center shrink-0 border border-border">
                  <Icon className="h-4 w-4 text-[hsl(var(--periwinkle))]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Direita: Formulário ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div
          className="absolute inset-0 pointer-events-none lg:hidden"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(262 83% 58% / 0.12), transparent 60%)',
          }}
        />

        <div className="w-full max-w-md relative">
          <div className="mb-8 lg:hidden">
            <img src="/logo.png" alt="now! insight" className="h-9 w-auto object-contain" />
          </div>

          <div className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-8 shadow-card">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1.5">
                {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Entre para acessar seu dashboard' : 'Comece a monitorar suas campanhas'}
              </p>
            </div>

            {/* ── Login Form ── */}
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Senha</Label>
                    <button type="button" className="text-xs text-[hsl(var(--periwinkle))] hover:opacity-80 transition-opacity">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" variant="glow" size="lg" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>
            ) : (
              /* ── Signup Form ── */
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmar senha</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button type="submit" variant="glow" size="lg" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar conta
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); clearErrors(); }}
                  className="text-[hsl(var(--periwinkle))] hover:opacity-80 font-medium transition-opacity"
                >
                  {isLogin ? 'Cadastre-se grátis' : 'Fazer login'}
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="hover:text-foreground underline underline-offset-2 transition-colors">Termos</a>
            {' '}e{' '}
            <a href="#" className="hover:text-foreground underline underline-offset-2 transition-colors">Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
