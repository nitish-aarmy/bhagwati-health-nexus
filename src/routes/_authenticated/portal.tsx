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
  return <PortalBody />;
}

const selfSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid mobile number"),
  age: z.coerce.number().int().min(0).max(130).optional(),
  gender: z.string().trim().max(20).optional(),
  blood_group: z.string().trim().max(5).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  allergies: z.string().trim().max(300).optional(),
});

function SelfRegistration({ loading }: { loading: boolean }) {
  const queryClient = useQueryClient();

  const register = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = selfSchema.safeParse(Object.fromEntries(form.entries()));
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const v = parsed.data;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again to continue.");
      const { data: inserted, error } = await supabase
        .from("patients")
        .insert({
          user_id: userId,
          full_name: v.full_name,
          phone: v.phone,
          gender: v.gender || "other",
          age: v.age ?? null,
          blood_group: v.blood_group || null,
          city: v.city || null,
          address: v.address || null,
          allergies: v.allergies || null,
          email: auth.user?.email ?? null,
          lead_source: "patient self-registration",
        })
        .select("uhid")
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (patient) => {
      toast.success(`Registration complete · UHID ${patient.uhid}`);
      void queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div>
        <PageHeader title="My health" description="Your personal hospital record." />
        <p className="text-sm text-muted-foreground">Loading your record…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Register yourself as a patient"
        description="Create your hospital record to get a UHID, book visits and view lab reports and bills online."
      />
      <form
        className="neo grid max-w-3xl gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate(new FormData(e.currentTarget));
        }}
      >
        <SelfField name="full_name" label="Full name" required />
        <SelfField name="phone" label="Mobile number" required />
        <SelfField name="age" label="Age" type="number" />
        <SelfField name="gender" label="Gender" placeholder="female / male / other" />
        <SelfField name="blood_group" label="Blood group" />
        <SelfField name="city" label="City / village" defaultValue="Daltonganj" />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={2} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="allergies">Known allergies or conditions</Label>
          <Textarea id="allergies" name="allergies" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={register.isPending}>
            Create my hospital record
          </Button>
        </div>
      </form>
      <div className="mt-6 max-w-3xl">
        <EmptyState
          title="Already registered at the hospital?"
          description="If you already have a UHID from the reception desk, ask the front office to link it to this account."
        />
      </div>
    </div>
  );
}

function SelfField({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}

function PortalBody() {
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