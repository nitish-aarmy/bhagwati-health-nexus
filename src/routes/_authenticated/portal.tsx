import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState, StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, recordAudit } from "@/lib/audit";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/portal")({
  beforeLoad: guardModuleAccess("portal"),
  component: PortalPage,
});

function PortalPage() {
  const queryClient = useQueryClient();
  const [visitType, setVisitType] = useState<"opd" | "ipd">("opd");

  const profile = useQuery({
    queryKey: ["portal-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const appointments = useQuery({
    queryKey: ["portal-appointments", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", profile.data!.id)
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const labs = useQuery({
    queryKey: ["portal-labs", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_orders")
        .select("*")
        .eq("patient_id", profile.data!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invoices = useQuery({
    queryKey: ["portal-invoices", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", profile.data!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ipdAdmissions = useQuery({
    queryKey: ["portal-ipd", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ipd_admissions")
        .select("*")
        .eq("patient_id", profile.data!.id)
        .order("admitted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentTransactions = useQuery({
    queryKey: ["portal-payments", profile.data?.id],
    enabled: Boolean(profile.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("patient_id", profile.data!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const register = useMutation({
    mutationFn: async (form: FormData) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      const fullName = String(form.get("full_name") ?? "").trim();
      const phone = String(form.get("phone") ?? "").trim();
      const gender = String(form.get("gender") ?? "other").trim().toLowerCase() || "other";
      if (!fullName || !phone) throw new Error("Name and mobile are required");

      const { data: inserted, error } = await supabase
        .from("patients")
        .insert({
          user_id: auth.user.id,
          full_name: fullName,
          phone,
          gender,
          notes: String(form.get("notes") ?? "") || null,
          blood_group: String(form.get("blood_group") ?? "") || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await recordAudit({
        action: "portal.patient_profile_created",
        entity: "patients",
        entityId: inserted.id,
      });
    },
    onSuccess: () => {
      toast.success("Patient profile created");
      void queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestAppointment = useMutation({
    mutationFn: async (form: FormData) => {
      if (!profile.data) throw new Error("Profile missing");
      const when = String(form.get("scheduled_at") ?? "");
      if (!when) throw new Error("Select preferred time");

      const { data: inserted, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.data.id,
          scheduled_at: new Date(when).toISOString(),
          visit_type: visitType,
          department: String(form.get("department") ?? "") || null,
          reason: String(form.get("reason") ?? "") || null,
          status: "scheduled",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (visitType === "ipd") {
        const ward = String(form.get("ward") ?? "") || null;
        const { error: ipdError } = await supabase.from("ipd_admissions").insert({
          patient_id: profile.data.id,
          appointment_id: inserted.id,
          admission_status: "requested",
          ward,
          admitted_at: new Date(when).toISOString(),
        });
        if (ipdError) throw ipdError;
      }

      await recordAudit({
        action: visitType === "ipd" ? "portal.ipd_requested" : "portal.opd_requested",
        entity: "appointments",
        entityId: inserted.id,
      });
    },
    onSuccess: () => {
      toast.success("Appointment request submitted");
      void queryClient.invalidateQueries({ queryKey: ["portal-appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-ipd"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalBilled = (invoices.data ?? []).reduce((sum, i) => sum + Number(i.total), 0);
  const totalPaid = (invoices.data ?? []).reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const dueAmount = Math.max(totalBilled - totalPaid, 0);
  const opdRequests = (appointments.data ?? []).filter((a) => (a.visit_type ?? "opd") === "opd");

  return (
    <div>
      <PageHeader
        title="My Health Portal"
        description="Appointments, reports and billing on your hospital-linked digital profile."
      />

      {!profile.data ? (
        <section className="neo max-w-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Complete your patient profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your login exists, but your hospital patient record is not linked yet.
          </p>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              register.mutate(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" name="gender" placeholder="female / male / other" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood group</Label>
              <Input id="blood_group" name="blood_group" placeholder="B+" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Medical notes</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Allergies, chronic conditions" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={register.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="UHID" value={profile.data.uhid} />
            <StatCard label="OPD Requests" value={opdRequests.length} />
            <StatCard label="IPD Admissions" value={ipdAdmissions.data?.length ?? 0} />
            <StatCard label="Outstanding" value={formatCurrency(dueAmount)} />
          </div>

          <section className="neo mb-6 p-5">
            <h2 className="font-display text-lg font-semibold">Book OPD / IPD</h2>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                requestAppointment.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="visit_type">Visit type</Label>
                <Select value={visitType} onValueChange={(value) => setVisitType(value as "opd" | "ipd") }>
                  <SelectTrigger id="visit_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opd">OPD</SelectItem>
                    <SelectItem value="ipd">IPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="scheduled_at">Preferred date/time</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" placeholder="General Medicine" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="Follow-up consultation" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ward">Preferred ward (for IPD)</Label>
                <Input id="ward" name="ward" placeholder="General / Private / ICU" />
              </div>
              <div className="sm:col-span-4">
                <Button type="submit" disabled={requestAppointment.isPending}>
                  Request OPD/IPD booking
                </Button>
              </div>
            </form>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="neo p-4">
              <h2 className="mb-3 font-display text-base font-semibold">OPD requests</h2>
              {(appointments.data ?? []).length === 0 ? (
                <EmptyState title="No appointments" description="Your bookings will appear here." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {opdRequests.slice(0, 8).map((a) => (
                    <li key={a.id} className="rounded-xl bg-muted/40 p-2.5">
                      <p className="font-medium">{new Date(a.scheduled_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{a.department || "General"} · {a.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="neo p-4">
              <h2 className="mb-3 font-display text-base font-semibold">IPD tracking</h2>
              {(ipdAdmissions.data ?? []).length === 0 ? (
                <EmptyState title="No IPD admissions" description="Your IPD admissions and bed status will appear here." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(ipdAdmissions.data ?? []).slice(0, 8).map((admission) => (
                    <li key={admission.id} className="rounded-xl bg-muted/40 p-2.5">
                      <p className="font-medium">{admission.ward || "Ward pending"}</p>
                      <p className="text-xs text-muted-foreground">
                        {admission.admission_status} · {new Date(admission.admitted_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="neo p-4">
              <h2 className="mb-3 font-display text-base font-semibold">Payment transactions</h2>
              {(paymentTransactions.data ?? []).length === 0 ? (
                <EmptyState title="No transactions" description="Your payment ledger will appear after first billing payment." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(paymentTransactions.data ?? []).slice(0, 8).map((tx) => (
                    <li key={tx.id} className="rounded-xl bg-muted/40 p-2.5">
                      <p className="font-medium">{formatCurrency(Number(tx.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(tx.payment_mode || "cash").toUpperCase()} · {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="neo mt-6 p-4">
            <h2 className="mb-3 font-display text-base font-semibold">Invoices and due amount</h2>
            {(invoices.data ?? []).length === 0 ? (
              <EmptyState title="No invoices" description="Billing entries will appear here." />
            ) : (
              <ul className="space-y-2 text-sm">
                {(invoices.data ?? []).slice(0, 12).map((i) => (
                  <li key={i.id} className="rounded-xl bg-muted/40 p-2.5">
                    <p className="font-medium">{i.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Paid {formatCurrency(Number(i.paid_amount))} of {formatCurrency(Number(i.total))} · Due{" "}
                      {formatCurrency(Math.max(Number(i.total) - Number(i.paid_amount), 0))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-1">
            <section className="neo p-4">
              <h2 className="mb-3 font-display text-base font-semibold">Lab reports</h2>
              {(labs.data ?? []).length === 0 ? (
                <EmptyState title="No reports" description="Approved reports appear automatically." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(labs.data ?? []).slice(0, 8).map((l) => (
                    <li key={l.id} className="rounded-xl bg-muted/40 p-2.5">
                      <p className="font-medium">{l.test_name}</p>
                      <p className="text-xs text-muted-foreground">{l.status} · {new Date(l.created_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
