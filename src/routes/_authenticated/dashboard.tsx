import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FlaskConical, IndianRupee, PhoneCall, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { StatCard, EmptyState } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/audit";
import { appointmentsQuery, followUpsQuery, invoicesQuery, labOrdersQuery, patientsQuery } from "@/lib/queries";
import { primaryRoleLabel } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function isToday(value: string) {
  const d = new Date(value);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function DashboardPage() {
  const { profile, roles } = useCurrentUser();
  const patients = useQuery(patientsQuery(""));
  const appointments = useQuery(appointmentsQuery());
  const labs = useQuery(labOrdersQuery());
  const invoices = useQuery(invoicesQuery());
  const followUps = useQuery(followUpsQuery());

  const todayAppointments = (appointments.data ?? []).filter((a) => isToday(a.scheduled_at));
  const pendingLabs = (labs.data ?? []).filter((l) => l.status !== "approved" && l.status !== "cancelled");
  const collectedToday = (invoices.data ?? [])
    .filter((i) => isToday(i.created_at))
    .reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const outstanding = (invoices.data ?? []).reduce(
    (sum, i) => sum + Math.max(Number(i.total) - Number(i.paid_amount), 0),
    0,
  );
  const dueFollowUps = (followUps.data ?? []).filter(
    (f) => !f.is_done && f.due_date <= new Date().toISOString().slice(0, 10),
  );

  return (
    <div>
      <PageHeader
        title={`Good day${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={`${primaryRoleLabel(roles)} · Bhagwati Hospital, Daltonganj`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered patients" value={patients.data?.length ?? 0} icon={Users} hint="Total in registry" />
        <StatCard label="Today's appointments" value={todayAppointments.length} icon={CalendarDays} hint="OPD & consultations" />
        <StatCard label="Pending lab reports" value={pendingLabs.length} icon={FlaskConical} hint="Awaiting approval" />
        <StatCard label="Collected today" value={formatCurrency(collectedToday)} icon={IndianRupee} hint={`${formatCurrency(outstanding)} outstanding`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="neo p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Today's queue</h2>
          {todayAppointments.length === 0 ? (
            <EmptyState title="No appointments today" description="Book a walk-in or scheduled appointment from the Appointments module." />
          ) : (
            <ul className="space-y-2">
              {todayAppointments.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.patients?.full_name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      Token {a.token_number ?? "—"} · {a.department ?? "General"} ·{" "}
                      {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant="secondary">{a.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="neo p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Follow-ups due</h2>
          {dueFollowUps.length === 0 ? (
            <EmptyState title="Nothing pending" description="The follow-up engine will surface medicine, payment and revisit reminders here." />
          ) : (
            <ul className="space-y-2">
              {dueFollowUps.slice(0, 8).map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.patients?.full_name ?? "Patient"}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.message ?? f.type}</p>
                  </div>
                  <Badge variant="outline">{f.due_date}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="neo mt-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <PhoneCall className="size-4 text-primary" /> Integration surface
        </h2>
        <p className="text-sm text-muted-foreground">
          Bhagwati Pathology Nexus and Chitra Bill Flow read and write through this same patient
          registry — pathology orders sync into the Laboratory module and invoices into Billing, so
          UHIDs stay identical across all three products.
        </p>
      </section>
    </div>
  );
}