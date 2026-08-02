import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Moon,
  PhoneCall,
  Receipt,
  ShieldCheck,
  Sun,
  Users,
  BellRing,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { canAccess, primaryRoleLabel, type ModuleKey } from "@/lib/roles";

type NavItem = {
  key: ModuleKey;
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Patients", to: "/patients", icon: Users },
  { key: "appointments", label: "Appointments", to: "/appointments", icon: CalendarDays },
  { key: "laboratory", label: "Laboratory", to: "/laboratory", icon: FlaskConical },
  { key: "billing", label: "Billing", to: "/billing", icon: Receipt },
  { key: "followups", label: "Follow-ups", to: "/followups", icon: BellRing },
  { key: "calls", label: "Call Centre", to: "/calls", icon: PhoneCall },
  { key: "administration", label: "Administration", to: "/administration", icon: ShieldCheck },
  { key: "portal", label: "My Health", to: "/portal", icon: Activity },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("bh-theme");
    const next = stored === "dark";
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("bh-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-md">
        <Activity className="size-5" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">Bhagwati Smart Hospital</p>
          <p className="text-[11px] text-muted-foreground">One Hospital. One Secure Platform.</p>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, user } = useCurrentUser();
  const signOut = useSignOut();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV_ITEMS.filter((item) => canAccess(item.key, roles));

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar p-4 transition-smooth",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-2 py-2">
          <BrandMark />
        </div>
        <nav className="mt-6 space-y-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                  active
                    ? "neo-sm text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-4 space-y-3">
          <div className="neo-sm p-3">
            <p className="truncate text-sm font-semibold">
              {profile?.full_name || user?.email || "Staff member"}
            </p>
            <p className="text-xs text-muted-foreground">{primaryRoleLabel(roles)}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden text-sm text-muted-foreground lg:block">
            Bhagwati Hospital, Daltonganj &middot; Jharkhand
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}