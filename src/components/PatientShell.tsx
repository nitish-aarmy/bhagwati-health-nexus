import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, CalendarDays, CreditCard, LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";

const PATIENT_NAV = [
  {
    to: "/portal",
    label: "My Care",
    icon: Activity,
    description: "Profile, reports, and treatment updates",
  },
] as const;

export function PatientShell({ children }: { children: ReactNode }) {
  const { profile, user } = useCurrentUser();
  const signOut = useSignOut();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(26,110,255,0.16),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(16,190,180,0.16),transparent_30%),radial-gradient(circle_at_80%_85%,rgba(41,113,255,0.12),transparent_35%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="neo mb-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <BrandMark />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Patient App
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="neo self-start p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Patient profile</p>
            <div className="neo-inset p-3">
              <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email || "Patient"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Self-service care and billing console</p>
            </div>

            <nav className="mt-4 space-y-2">
              {PATIENT_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "block rounded-2xl p-3 transition-smooth",
                      active ? "neo-sm" : "bg-muted/45 hover:bg-muted/65",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <p className="text-sm font-medium">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <QuickCard icon={CalendarDays} label="OPD/IPD Booking" />
              <QuickCard icon={CreditCard} label="Payments & Due" />
            </div>

            <Button
              variant="ghost"
              className="mt-4 w-full justify-start gap-2"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <div className="neo-inset flex items-center gap-2 p-3">
      <Icon className="size-4 text-primary" />
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
