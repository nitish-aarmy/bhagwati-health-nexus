import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FlaskConical, Receipt } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalPage,
});

function PortalPage() {
  const portal = useQuery({
    queryKey: ["portal"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return null;
      const { data: patient, error } = await supabase
        .from("patients")
        .select("id, full_name, uhid, phone, blood_group")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!patient) return { patient: null, appointments: [], labs: [], invoices: [] };

      const [appointments, labs, invoices] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, scheduled_at, status, doctor_name, department, token_number")
          .eq("patient_id", patient.id)
          .order("scheduled_at", { ascending: false })
          .limit(20),
        supabase
          .from("lab_orders")
          .select("id, test_name, status, result_summary, is_abnormal, created_at")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("invoices")
          .select("id, invoice_number, total, paid_amount, status, created_at")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        patient,
        appointments: appointments.data ?? [],
        labs: labs.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });

  const data = portal.data;

  if (!data?.patient) {
    return <SelfRegistration loading={portal.isLoading} />;
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${data.patient.full_name}`}
        description={`UHID ${data.patient.uhid}${data.patient.blood_group ? ` · Blood group ${data.patient.blood_group}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-4" /> Appointments
          </h2>
          {data.appointments.length === 0 ? (
            <EmptyState title="No visits yet" description="Booked consultations will show up here." />
          ) : (
            <ul className="space-y-2">
              {data.appointments.map((a) => (
                <li key={a.id} className="neo-sm p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.doctor_name ?? a.department ?? "Consultation"}</p>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()}
                    {a.token_number ? ` · Token ${a.token_number}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="size-4" /> Lab reports
          </h2>
          {data.labs.length === 0 ? (
            <EmptyState title="No reports" description="Approved lab results appear here." />
          ) : (
            <ul className="space-y-2">
              {data.labs.map((l) => (
                <li key={l.id} className="neo-sm p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{l.test_name}</p>
                    {l.is_abnormal && <Badge variant="destructive">Review</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {l.result_summary || l.status} · {new Date(l.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="size-4" /> Bills
          </h2>
          {data.invoices.length === 0 ? (
            <EmptyState title="No bills" description="Your invoices and payments appear here." />
          ) : (
            <ul className="space-y-2">
              {data.invoices.map((i) => (
                <li key={i.id} className="neo-sm p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{i.invoice_number}</p>
                    <Badge variant="outline">{i.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(i.total))} · paid {formatCurrency(Number(i.paid_amount))}
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