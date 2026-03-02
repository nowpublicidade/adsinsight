import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, clientId, availableClients, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Não autenticado
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role errada — redireciona para o lugar certo
  if (requiredRole && role !== requiredRole) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // Cliente sem conta selecionada → tela de seleção
  if (role === "client" && !requiredRole && !clientId && availableClients.length > 0) {
    return <Navigate to="/account-select" replace />;
  }

  return <>{children}</>;
}
