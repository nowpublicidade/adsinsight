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
  availableClients: ClientOption[];
  clientId: string | null;
  selectClient: (clientId: string) => void;
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
    console.log("[Auth] fetchUserData iniciado para:", userId);
    try {
      // 1. Buscar role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      console.log("[Auth] roleData:", roleData, "roleError:", roleError);

      const userRole = roleData?.role as AppRole | undefined;
      if (userRole) setRole(userRole);

      if (userRole === "admin") {
        console.log("[Auth] Usuário é admin, finalizando.");
        setLoading(false);
        return;
      }

      // 2. Buscar acessos
      console.log("[Auth] Buscando user_client_access...");
      const { data: accessData, error: accessError } = await (supabase as any)
        .from("user_client_access")
        .select("client_id")
        .eq("user_id", userId);

      console.log("[Auth] accessData:", accessData, "accessError:", accessError);

      if (accessError) {
        console.error("[Auth] Erro ao buscar acessos:", accessError);
        setLoading(false);
        return;
      }

      const clientIds: string[] = (accessData ?? []).map((r: any) => r.client_id).filter(Boolean);
      console.log("[Auth] clientIds encontrados:", clientIds);

      if (clientIds.length === 0) {
        console.log("[Auth] Nenhum acesso encontrado.");
        setAvailableClients([]);
        setClientId(null);
        setLoading(false);
        return;
      }

      // 3. Buscar dados dos clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, logo_url")
        .in("id", clientIds);

      console.log("[Auth] clientsData:", clientsData, "clientsError:", clientsError);

      if (clientsError) {
        console.error("[Auth] Erro ao buscar clientes:", clientsError);
        setLoading(false);
        return;
      }

      const clients: ClientOption[] = (clientsData ?? []) as ClientOption[];
      setAvailableClients(clients);

      const stored = sessionStorage.getItem(AUTH_CLIENT_KEY);
      if (stored && clients.some((c) => c.id === stored)) {
        console.log("[Auth] Restaurando cliente da sessão:", stored);
        setClientId(stored);
      } else if (clients.length === 1) {
        console.log("[Auth] Selecionando único cliente automaticamente:", clients[0].id);
        setClientId(clients[0].id);
        sessionStorage.setItem(AUTH_CLIENT_KEY, clients[0].id);
      } else {
        console.log("[Auth] Múltiplos clientes, aguardando seleção. Total:", clients.length);
        setClientId(null);
      }
    } catch (error) {
      console.error("[Auth] Erro inesperado:", error);
    } finally {
      setLoading(false);
      console.log("[Auth] fetchUserData finalizado.");
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[Auth] onAuthStateChange evento:", _event, "user:", session?.user?.email);
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
      console.log("[Auth] getSession:", session?.user?.email ?? "sem sessão");
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
    console.log("[Auth] signIn chamado para:", email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[Auth] signIn resultado:", error ?? "sucesso");
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
