import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IndianRupee, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState, StatCard } from "@/components/StatCard";
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
import { formatCurrency, recordAudit } from "@/lib/audit";
import { invoicesQuery, patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/billing")({
  beforeLoad: guardModuleAccess("billing"),
  component: BillingPage,
});

function BillingPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [mode, setMode] = useState("cash");
  const { data, isLoading } = useQuery(invoicesQuery());
  const patients = useQuery(patientsQuery(""));

  const invoices = data ?? [];
  const collected = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(Number(i.total) - Number(i.paid_amount), 0),
    0,
  );

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      if (!patientId) throw new Error("Select a patient");
      const description = String(form.get("description") ?? "").trim();
      const amount = Number(form.get("amount") ?? 0);
      const discount = Number(form.get("discount") ?? 0);
      const paid = Number(form.get("paid") ?? 0);
      if (!description) throw new Error("Enter a line item description");
      if (amount <= 0) throw new Error("Amount must be greater than zero");
      const total = Math.max(amount - discount, 0);
      const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
      const { data: inserted, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          items: [{ description, amount }],
          subtotal: amount,
          discount,
          total,
          paid_amount: paid,
          payment_mode: mode,
          status,
        })
        .select()
        .single();
      if (error) throw error;

      if (paid > 0) {
        const { error: txError } = await supabase.from("payment_transactions").insert({
          patient_id: patientId,
          invoice_id: inserted.id,
          transaction_type: "payment",
          amount: paid,
          payment_mode: mode,
          balance_after: Math.max(total - paid, 0),
          notes: "Initial payment at invoice creation",
        });
        if (txError) throw txError;
      }

      await recordAudit({
        action: "invoice.created",
        entity: "invoices",
        entityId: inserted.id,
        metadata: { total, paid },
      });
      return inserted;
    },
    onSuccess: (invoice) => {
      toast.success(`Invoice ${invoice.invoice_number} created`);
      setOpen(false);
      setPatientId("");
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settle = useMutation({
    mutationFn: async (invoice: { id: string; total: number }) => {
      const { data: currentRows, error: currentError } = await supabase
        .from("invoices")
        .select("id, patient_id, paid_amount, total")
        .eq("id", invoice.id)
        .limit(1);
      if (currentError) throw currentError;
      const current = (currentRows ?? [])[0];
      if (!current) throw new Error("Invoice not found");

      const alreadyPaid = Number(current.paid_amount);
      const remaining = Math.max(Number(current.total) - alreadyPaid, 0);

      const { error } = await supabase
        .from("invoices")
        .update({ paid_amount: invoice.total, status: "paid" })
        .eq("id", invoice.id);
      if (error) throw error;

      if (remaining > 0) {
        const { error: txError } = await supabase.from("payment_transactions").insert({
          patient_id: current.patient_id,
          invoice_id: invoice.id,
          transaction_type: "payment",
          amount: remaining,
          payment_mode: "cash",
          balance_after: 0,
          notes: "Settlement payment",
        });
        if (txError) throw txError;
      }

      await recordAudit({ action: "invoice.settled", entity: "invoices", entityId: invoice.id });
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Billing & accounts"
        description="Invoicing, collections and outstanding tracking — the target schema for Chitra Bill Flow sync."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> New invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
              </DialogHeader>
              <form
                id="invoice-form"
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
                  <Label htmlFor="description">Service</Label>
                  <Input id="description" name="description" placeholder="OPD consultation" required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount</Label>
                    <Input id="discount" name="discount" type="number" min="0" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paid">Paid now</Label>
                    <Input id="paid" name="paid" type="number" min="0" defaultValue="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="invoice-form" disabled={create.isPending}>
                  Generate invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Invoices" value={invoices.length} icon={IndianRupee} />
        <StatCard label="Collected" value={formatCurrency(collected)} icon={IndianRupee} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={IndianRupee} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Generate the first invoice to start the cashbook." />
      ) : (
        <div className="neo overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{i.invoice_number}</td>
                  <td className="px-4 py-3">
                    {i.patients?.full_name}
                    <p className="text-xs text-muted-foreground">{i.patients?.uhid}</p>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(Number(i.total))}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(i.paid_amount))}</td>
                  <td className="px-4 py-3">
                    <Badge variant={i.status === "paid" ? "default" : "secondary"}>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => settle.mutate({ id: i.id, total: Number(i.total) })}
                      >
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}