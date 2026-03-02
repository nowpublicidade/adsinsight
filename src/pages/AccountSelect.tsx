import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Building2, ArrowRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountSelect() {
  const { user, role, availableClients, selectClient, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
    // Admin não passa por aqui
    if (!loading && role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, role, navigate]);

  const handleSelect = (clientId: string) => {
    selectClient(clientId);
    navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sem contas vinculadas
  if (availableClients.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface))] border border-border flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma conta vinculada</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Você ainda não tem acesso a nenhuma conta. Entre em contato com o administrador.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {/* Glow de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 20%, hsl(262 83% 58% / 0.10), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="now! insight" className="h-9 w-auto object-contain" />
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-8 shadow-card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1.5">Selecione uma conta</h2>
            <p className="text-sm text-muted-foreground">
              Você tem acesso a {availableClients.length} {availableClients.length === 1 ? 'conta' : 'contas'}. Escolha qual deseja acessar.
            </p>
          </div>

          <div className="space-y-3">
            {availableClients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelect(client.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--periwinkle)/0.5)] hover:bg-[hsl(var(--surface-2)/0.8)] transition-all duration-200 group text-left"
              >
                {/* Avatar / Logo */}
                <div className="w-11 h-11 rounded-xl border border-border bg-[hsl(var(--surface))] flex items-center justify-center shrink-0 overflow-hidden">
                  {client.logo_url ? (
                    <img
                      src={client.logo_url}
                      alt={client.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-[hsl(var(--periwinkle))]">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground">Clique para acessar</p>
                </div>

                {/* Seta */}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(var(--periwinkle))] group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Botão de sair */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
