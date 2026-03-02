import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "client";

export interface ClientOption {
  id: string;
  name: string;
  logo_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** Lista de contas que o usuário tem acesso */
  availableClients: ClientOption[];
  /** Conta atualmente selecionada (null = ainda não escolheu) */
  clientId: string | null;
  /** Define a conta ativa e persiste na sessão */
  selectClient: (clientId: string) => void;
  /** Limpa a conta ativa (volta para tela de seleção) */
  clearSelectedClient: () => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AUTH_CLIENT_KEY = "selected_client_id";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // 1. Buscar role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      // 2. Buscar todos os clientes que o usuário tem acesso
      const { data: accessData } = await supabase
        .from("user_client_access")
        .select("client_id, clients(id, name, logo_url)")
        .eq("user_id", userId);

      const clients: ClientOption[] = (accessData ?? []).map((row: any) => row.clients).filter(Boolean);

      setAvailableClients(clients);

      // 3. Restaurar cliente selecionado da sessão (sessionStorage)
      const stored = sessionStorage.getItem(AUTH_CLIENT_KEY);
      if (stored && clients.some((c) => c.id === stored)) {
        setClientId(stored);
      } else if (clients.length === 1) {
        // Se só tem uma conta, seleciona automaticamente
        setClientId(clients[0].id);
        sessionStorage.setItem(AUTH_CLIENT_KEY, clients[0].id);
      } else {
        setClientId(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setAvailableClients([]);
        setClientId(null);
        sessionStorage.removeItem(AUTH_CLIENT_KEY);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const selectClient = useCallback((id: string) => {
    setClientId(id);
    sessionStorage.setItem(AUTH_CLIENT_KEY, id);
  }, []);

  const clearSelectedClient = useCallback(() => {
    setClientId(null);
    sessionStorage.removeItem(AUTH_CLIENT_KEY);
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    sessionStorage.removeItem(AUTH_CLIENT_KEY);
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    availableClients,
    clientId,
    selectClient,
    clearSelectedClient,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
