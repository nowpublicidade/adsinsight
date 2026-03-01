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

  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, role, loading, navigate]);

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
        error.message.includes('Invalid login credentials') ? 'Email ou senha incorretos'
          : error.message.includes('Email not confirmed') ? 'Confirme seu email antes de fazer login'
            : error.message,
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
      toast.error(error.message.includes('already registered') ? 'Este email já está cadastrado' : error.message);
    } else {
      toast.success('Conta criada! Verifique seu email.');
      setIsLogin(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Esquerda: Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-16 relative overflow-hidden">
        {/* Gradientes decorativos */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 30% 40%, hsl(262 83% 58% / 0.15), transparent 65%), radial-gradient(ellipse 50% 40% at 70% 70%, hsl(252 87% 76% / 0.08), transparent 60%)',
          }}
        />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="mb-12">
            <img
              src="/logo.png"
              alt="now! insight"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold leading-tight mb-3">
              Controle total dos seus{' '}
              <span className="text-gradient-hero">anúncios</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Dashboard unificado para gestores de tráfego que querem resultados reais.
            </p>
          </div>

          {/* Features */}
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

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-3 pt-6 border-t border-border">
            <div className="flex -space-x-2">
              {['M', 'R', 'A', 'F'].map((initial, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-background bg-[hsl(var(--surface-2))] flex items-center justify-center text-xs font-semibold text-[hsl(var(--periwinkle))]"
                >
                  {initial}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">+200 gestores</span> já usam o now! insight
            </p>
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
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <img src="/logo.png" alt="now! insight" className="h-9 w-auto object-contain" />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-8 shadow-card">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1.5">
                {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? 'Entre para acessar seu dashboard'
                  : 'Comece a monitorar suas campanhas'}
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
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
                </Button>
              </form>

            ) : (
              /* ── Signup Form ── */
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname" className="text-sm font-medium">Nome completo</Label>
                  <Input id="signup-fullname" type="text" placeholder="Seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirmar senha</Label>
                  <Input id="signup-confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
                <Button type="submit" variant="glow" size="lg" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : 'Criar conta grátis'}
                </Button>
              </form>
            )}

            {/* Switch */}
            <div className="mt-6 pt-6 border-t border-border text-center">
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
