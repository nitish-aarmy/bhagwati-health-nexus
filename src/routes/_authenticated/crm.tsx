import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Phone, PhoneCall, Plus, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { callLogsQuery, followUpsQuery, patientsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmPage,
});

function CrmPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [channel, setChannel] = useState("call");
  const followUps = useQuery(followUpsQuery());
  const calls = useQuery(callLogsQuery());
  const patients = useQuery(patientsQuery(""));

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      if (!patientId) throw new Error("Select a patient");
      const dueAt = String(form.get("due_at") ?? "");
      if (!dueAt) throw new Error("Pick a due date");
      const { data: inserted, error } = await supabase
        .from("follow_ups")
        .insert({
          patient_id: patientId,
          due_at: new Date(dueAt).toISOString(),
          channel,
          reason: String(form.get("reason") ?? "") || null,
          notes: String(form.get("notes") ?? "") || null,
        })
        .select()
        .single();
      if (error) throw error;
      await recordAudit({ action: "follow_up.created", entity: "follow_ups", entityId: inserted.id });
      return inserted;
    },
    onSuccess: () => {
      toast.success("Follow-up scheduled");
      setOpen(false);
      setPatientId("");
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await recordAudit({ action: "follow_up.completed", entity: "follow_ups", entityId: id });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const logCall = useMutation({
    mutationFn: async ({ patient, phone }: { patient: string; phone: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("call_logs").insert({
        patient_id: patient,
        phone,
        direction: "outbound",
        outcome: "connected",
        agent_id: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Call logged");
      void queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (followUps.data ?? []).filter((f) => f.status !== "completed");

  return (
    <div>
      <PageHeader
        title="CRM & follow-up engine"
        description="Recall queue, click-to-call and outcome logging for every patient touchpoint."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Schedule follow-up
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule follow-up</DialogTitle>
              </DialogHeader>
              <form
                id="followup-form"
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
                  <Label htmlFor="due_at">Due</Label>
                  <Input id="due_at" name="due_at" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input id="reason" name="reason" placeholder="Post-op review" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="followup-form" disabled={create.isPending}>
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recall queue
          </h2>
          {pending.length === 0 ? (
            <EmptyState title="Nothing due" description="Scheduled recalls will appear here with call actions." />
          ) : (
            <div className="space-y-3">
              {pending.map((f) => (
                <article key={f.id} className="neo flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{f.patients?.full_name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.reason || "Follow-up"} · due {new Date(f.due_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{f.channel}</Badge>
                    {f.patients?.phone && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        asChild
                        onClick={() =>
                          logCall.mutate({ patient: f.patient_id, phone: f.patients!.phone })
                        }
                      >
                        <a href={`tel:${f.patients.phone}`}>
                          <PhoneCall className="size-4" /> Call
                        </a>
                      </Button>
                    )}
                    <Button size="sm" onClick={() => complete.mutate(f.id)}>
                      Done
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent calls
          </h2>
          {(calls.data ?? []).length === 0 ? (
            <EmptyState title="No calls logged" description="Calls placed from the recall queue are logged automatically." />
          ) : (
            <ul className="space-y-2">
              {(calls.data ?? []).map((c) => (
                <li key={c.id} className="neo-sm flex items-center gap-3 p-3 text-sm">
                  <Phone className="size-4 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.patients?.full_name ?? c.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.direction} · {c.outcome ?? "logged"} · {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="neo mt-4 flex gap-3 p-4 text-sm">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              AI recall suggestions and automated WhatsApp reminders plug into this queue in the next phase.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}