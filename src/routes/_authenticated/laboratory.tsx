import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
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
import { labOrdersQuery, patientsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/laboratory")({
  component: LaboratoryPage,
});

const LAB_STATUSES = [
  "ordered",
  "sample_collected",
  "processing",
  "completed",
  "approved",
  "cancelled",
] as const;

function LaboratoryPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [category, setCategory] = useState("pathology");
  const { data, isLoading } = useQuery(labOrdersQuery());
  const patients = useQuery(patientsQuery(""));

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      if (!patientId) throw new Error("Select a patient");
      const testName = String(form.get("test_name") ?? "").trim();
      if (testName.length < 2) throw new Error("Enter the test name");
      const { data: inserted, error } = await supabase
        .from("lab_orders")
        .insert({
          patient_id: patientId,
          test_name: testName,
          category,
          price: Number(form.get("price") ?? 0),
          barcode: `BH${Date.now().toString().slice(-9)}`,
        })
        .select()
        .single();
      if (error) throw error;
      await recordAudit({ action: "lab_order.created", entity: "lab_orders", entityId: inserted.id });
      return inserted;
    },
    onSuccess: () => {
      toast.success("Lab order created");
      setOpen(false);
      setPatientId("");
      void queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      status,
      result,
    }: {
      id: string;
      status?: (typeof LAB_STATUSES)[number];
      result?: string;
    }) => {
      const patch: {
        status?: (typeof LAB_STATUSES)[number];
        collected_at?: string;
        approved_at?: string;
        approved_by?: string | null;
        result_summary?: string;
      } = {};
      if (status) {
        patch.status = status;
        if (status === "sample_collected") patch.collected_at = new Date().toISOString();
        if (status === "approved") {
          const { data: auth } = await supabase.auth.getUser();
          patch.approved_at = new Date().toISOString();
          patch.approved_by = auth.user?.id ?? null;
        }
      }
      if (result !== undefined) patch.result_summary = result;
      const { error } = await supabase.from("lab_orders").update(patch).eq("id", id);
      if (error) throw error;
      await recordAudit({ action: "lab_order.updated", entity: "lab_orders", entityId: id, metadata: patch });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["lab-orders"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Laboratory & radiology"
        description="Sample tracking, barcoding, result entry and pathologist approval. Compatible with Bhagwati Pathology Nexus orders."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> New lab order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create lab order</DialogTitle>
              </DialogHeader>
              <form
                id="lab-form"
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
                  <Label htmlFor="test_name">Test</Label>
                  <Input id="test_name" name="test_name" placeholder="CBC, LFT, Chest X-Ray" required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pathology">Pathology</SelectItem>
                      <SelectItem value="radiology">Radiology</SelectItem>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (INR)</Label>
                  <Input id="price" name="price" type="number" min="0" step="1" defaultValue="0" />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="lab-form" disabled={create.isPending}>
                  Create order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading lab worklist…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Worklist empty" description="Create a lab order or let pathology orders sync in from the integration API." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(data ?? []).map((o) => (
            <article key={o.id} className="neo p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{o.test_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {o.patients?.full_name} · {o.patients?.uhid} · {o.barcode}
                  </p>
                </div>
                <Badge variant={o.status === "approved" ? "default" : "secondary"}>
                  {o.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <Textarea
                className="mt-3"
                rows={2}
                defaultValue={o.result_summary ?? ""}
                placeholder="Result summary / findings"
                onBlur={(e) => {
                  if (e.target.value !== (o.result_summary ?? "")) {
                    update.mutate({ id: o.id, result: e.target.value });
                  }
                }}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={o.status}
                  onValueChange={(status) =>
                    update.mutate({ id: o.id, status: status as (typeof LAB_STATUSES)[number] })
                  }
                >
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {o.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => update.mutate({ id: o.id, status: "approved" })}
                  >
                    <ShieldCheck className="size-4" /> Approve & release
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}