import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { canAccess, isPatientOnly, type AppRole, type ModuleKey } from "@/lib/roles";

async function getCurrentUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.role as AppRole);
}

export function guardModuleAccess(module: ModuleKey) {
  return async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw redirect({ to: "/auth" });

    const roles = await getCurrentUserRoles(auth.user.id);
    if (!canAccess(module, roles)) {
      const fallback = isPatientOnly(roles) || roles.length === 0 ? "/portal" : "/dashboard";
      throw redirect({ to: fallback });
    }

    return { user: auth.user, roles };
  };
}
