import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PatientShell } from "@/components/PatientShell";
import { useCurrentUser } from "@/hooks/useAuth";
import { isPatientOnly } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { roles, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="neo mx-auto max-w-3xl p-6">
          <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  const shell = isPatientOnly(roles) ? (
    <PatientShell>
      <Outlet />
    </PatientShell>
  ) : (
    <AppShell>
      <Outlet />
    </AppShell>
  );

  return shell;
}