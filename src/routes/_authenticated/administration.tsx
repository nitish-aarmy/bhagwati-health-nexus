import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState, StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { auditLogsQuery, staffQuery } from "@/lib/queries";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/administration")({
  component: AdministrationPage,
});

function AdministrationPage() {
  const staff = useQuery(staffQuery());
  const audit = useQuery(auditLogsQuery());

  const rows = staff.data ?? [];
  const logs = audit.data ?? [];
  const admins = rows.filter((r) =>
    r.roles.some((role) => ["super_admin", "owner", "admin"].includes(role)),
  ).length;

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Directory of hospital staff, assigned roles and the tamper-evident audit trail."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Staff accounts" value={rows.length} icon={Users} />
        <StatCard label="Administrators" value={admins} icon={ShieldCheck} />
        <StatCard label="Audit events" value={logs.length} hint="Latest 100" icon={ScrollText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Staff directory
          </h2>
          {rows.length === 0 ? (
            <EmptyState
              title="No staff yet"
              description="Accounts appear here once team members sign up and receive a role."
            />
          ) : (
            <div className="space-y-3">
              {rows.map((person) => (
                <article
                  key={person.id}
                  className="neo flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{person.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[person.designation, person.department, person.employee_code]
                        .filter(Boolean)
                        .join(" · ") || "No department assigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {person.roles.length === 0 && <Badge variant="outline">No role</Badge>}
                    {person.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {ROLE_LABELS[role as AppRole] ?? role}
                      </Badge>
                    ))}
                    {!person.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Audit trail
          </h2>
          {logs.length === 0 ? (
            <EmptyState
              title="No activity recorded"
              description="Every clinical and billing action is appended here automatically."
            />
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="neo-sm p-3 text-sm">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.entity}
                    {log.actor_name ? ` · ${log.actor_name}` : ""} ·{" "}
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}