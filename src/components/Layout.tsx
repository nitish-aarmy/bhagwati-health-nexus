import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HOSPITAL_INFO } from "@/lib/data";
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  FileText,
  Menu,
  X,
  Activity,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/new-test", label: "New Test", icon: FlaskConical },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/reports", label: "Reports", icon: FileText },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-background p-6 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="lg:hidden absolute top-4 right-4 neo-btn p-2"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="neo-flat p-5 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="text-primary" size={28} />
            <h1 className="font-heading font-bold text-lg text-foreground">
              {HOSPITAL_INFO.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {HOSPITAL_INFO.tagline}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {HOSPITAL_INFO.address}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  active
                    ? "neo-pressed bg-primary/10 text-primary"
                    : "neo-btn text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="neo-concave p-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            Bhagwati Hospital Nexus
          </p>
          <p className="text-[10px] text-muted-foreground">Pathology System v1.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="p-4 lg:p-6 flex items-center gap-4">
          <button
            className="lg:hidden neo-btn p-3"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="neo-flat px-4 py-2 text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        <div className="px-4 lg:px-8 pb-8">{children}</div>
      </main>
    </div>
  );
}
