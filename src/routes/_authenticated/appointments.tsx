import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { appointmentsQuery, patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/appointments")({
  beforeLoad: guardModuleAccess("appointments"),
  component: AppointmentsPage,
});

const STATUSES = [
  "scheduled",
  "checked_in",
  "in_consultation",
  "completed",
  "cancelled",
  "no_show",
] as const;

function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const { data, isLoading } = useQuery(appointmentsQuery());
  const patients = useQuery(patientsQuery(""));

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      if (!patientId) throw new Error("Select a patient");
      const scheduled = String(form.get("scheduled_at") ?? "");
      if (!scheduled) throw new Error("Pick a date and time");
      const todayCount = (data ?? []).filter(
        (a) => new Date(a.scheduled_at).toDateString() === new Date(scheduled).toDateString(),
      ).length;
      const { data: inserted, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          scheduled_at: new Date(scheduled).toISOString(),
          department: String(form.get("department") ?? "") || null,
          doctor_name: String(form.get("doctor_name") ?? "") || null,
          reason: String(form.get("reason") ?? "") || null,
          token_number: todayCount + 1,
        })
        .select()
        .single();
      if (error) throw error;
      await recordAudit({ action: "appointment.created", entity: "appointments", entityId: inserted.id });
      return inserted;
    },
    onSuccess: () => {
      toast.success("Appointment booked");
      setOpen(false);
      setPatientId("");
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: status as (typeof STATUSES)[number] })
        .eq("id", id);
      if (error) throw error;
      await recordAudit({ action: "appointment.status_changed", entity: "appointments", entityId: id, metadata: { status } });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["appointments"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Appointments & OPD queue"
        description="Token-based queue management for walk-ins and scheduled consultations."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Book appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Book appointment</DialogTitle>
              </DialogHeader>
              <form
                id="appointment-form"
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {(patients.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} · {p.uhid}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Date & time</Label>
                  <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" name="department" placeholder="General Medicine" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">Doctor</Label>
                  <Input id="doctor_name" name="doctor_name" placeholder="Dr. R. Prasad" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input id="reason" name="reason" placeholder="Fever, 3 days" />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="appointment-form" disabled={create.isPending}>
                  Confirm booking
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No appointments" description="Book the first appointment to start the OPD queue." />
      ) : (
        <div className="neo overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-semibold">{a.token_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.patients?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.patients?.uhid}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.department || "—"}
                    <p className="text-xs text-muted-foreground">{a.doctor_name || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={a.status}
                      onValueChange={(status) => updateStatus.mutate({ id: a.id, status })}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2">Tip</Badge>
        Token numbers are allocated per day automatically.
      </p>
    </div>
  );
}