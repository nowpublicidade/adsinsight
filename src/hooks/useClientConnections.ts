// src/hooks/useClientConnections.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClientConnections {
  meta: boolean;
  google: boolean;
  analytics: boolean;
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
  isLoading: boolean;
}

export function useClientConnections(): ClientConnections {
  const { clientId, isAdmin } = useAuth();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-connections", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select(
          "meta_connected_at, google_connected_at, ga_connected_at, fb_page_connected_at, ig_connected_at, linkedin_connected_at"
        )
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !isAdmin,
    staleTime: 1000 * 60 * 5, // cache por 5 min
  });

  // Admins veem tudo
  if (isAdmin) {
    return { meta: true, google: true, analytics: true, facebook: true, instagram: true, linkedin: true, isLoading: false };
  }

  return {
    meta: !!client?.meta_connected_at,
    google: !!client?.google_connected_at,
    analytics: !!(client as any)?.ga_connected_at,
    facebook: !!(client as any)?.fb_page_connected_at,
    instagram: !!(client as any)?.ig_connected_at,
    linkedin: !!(client as any)?.linkedin_connected_at,
    isLoading,
  };
}
