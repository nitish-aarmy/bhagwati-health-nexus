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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { followUpsQuery, patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/followups")({
  beforeLoad: guardModuleAccess("followups"),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("revisit");

  const followUps = useQuery(followUpsQuery());
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
          due_date: new Date(dueAt).toISOString().slice(0, 10),
          type: type as "revisit" | "lab" | "medicine" | "payment" | "vaccination" | "custom",
          message: String(form.get("message") ?? "") || null,
        })
        .select()
        .single();
      if (error) throw error;

      await recordAudit({
        action: "follow_up.created",
        entity: "follow_ups",
        entityId: inserted.id,
        metadata: { type },
      });
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
        .update({ is_done: true, outcome: "completed" })
        .eq("id", id);
      if (error) throw error;
      await recordAudit({ action: "follow_up.completed", entity: "follow_ups", entityId: id });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (followUps.data ?? []).filter((f) => !f.is_done);

  return (
    <div>
      <PageHeader
        title="Follow-up engine"
        description="Medication, revisit, lab and payment reminders with full timeline traceability."
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
                  <Label htmlFor="due_at">Due date</Label>
                  <Input id="due_at" name="due_at" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revisit">Revisit</SelectItem>
                      <SelectItem value="lab">Lab report</SelectItem>
                      <SelectItem value="medicine">Medicine refill</SelectItem>
                      <SelectItem value="payment">Payment due</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={2} placeholder="Follow-up notes" />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="followup-form" disabled={create.isPending}>
                  Save reminder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending follow-ups"
          description="Scheduled reminders will appear here for telecalling and care coordination."
        />
      ) : (
        <div className="space-y-3">
          {pending.map((f) => (
            <article key={f.id} className="neo flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{f.patients?.full_name ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground">{f.message || "Follow-up"}</p>
                <p className="text-xs text-muted-foreground">Due {new Date(f.due_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{f.type}</Badge>
                <Button size="sm" onClick={() => complete.mutate(f.id)}>
                  Mark done
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
