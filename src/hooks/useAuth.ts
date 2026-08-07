import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";

export type StaffProfile = {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  is_active: boolean;
};

/** Tracks the Supabase session without blocking SSR. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useCurrentUser() {
  const { user, loading } = useSession();

  const rolesQuery = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.role as AppRole);
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<StaffProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, employee_code, department, designation, phone, is_active")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    user: user as User | null,
    profile: profileQuery.data ?? null,
    roles: rolesQuery.data ?? [],
    loading: loading || rolesQuery.isLoading || profileQuery.isLoading,
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };
}