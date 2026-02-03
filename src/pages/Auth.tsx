import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, BarChart3, TrendingUp, Target } from 'lucide-react';

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

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Confirme seu email antes de fazer login');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.');
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
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        <div className="relative z-10 text-center space-y-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-gradient">Ads Dashboard</h1>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4 text-left p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50">
              <TrendingUp className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Métricas em tempo real</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe Meta Ads e Google Ads em um único lugar
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 text-left p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50">
              <Target className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Conversões do Pixel</h3>
                <p className="text-sm text-muted-foreground">
                  ROAS, compras, add to cart e todas as métricas do Pixel
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 text-left p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50">
              <BarChart3 className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Relatórios personalizados</h3>
                <p className="text-sm text-muted-foreground">
                  Crie dashboards com as métricas que importam para você
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">Ads Dashboard</span>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Entre para acessar seu dashboard' 
                : 'Comece a monitorar suas campanhas'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••"
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full btn-glow" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu nome"
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu@email.com"
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••"
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••"
                            className="bg-background/50"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full btn-glow" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin 
                  ? 'Não tem conta? Cadastre-se' 
                  : 'Já tem conta? Faça login'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
