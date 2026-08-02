import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { patientsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/patients")({
  component: PatientsPage,
});

const patientSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid phone number"),
  age: z.coerce.number().int().min(0).max(130).optional(),
  gender: z.string().trim().max(20),
  blood_group: z.string().trim().max(5).optional(),
  address: z.string().trim().max(300).optional(),
  lead_source: z.string().trim().max(80).optional(),
  referring_doctor: z.string().trim().max(120).optional(),
  allergies: z.string().trim().max(300).optional(),
});

function PatientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(patientsQuery(search));

  const createPatient = useMutation({
    mutationFn: async (form: FormData) => {
      const raw = Object.fromEntries(form.entries());
      const parsed = patientSchema.safeParse(raw);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const v = parsed.data;
      const { data: inserted, error } = await supabase
        .from("patients")
        .insert({
          full_name: v.full_name,
          phone: v.phone,
          gender: v.gender || "other",
          age: v.age ?? null,
          blood_group: v.blood_group || null,
          address: v.address || null,
          lead_source: v.lead_source || null,
          referring_doctor: v.referring_doctor || null,
          allergies: v.allergies || null,
        })
        .select()
        .single();
      if (error) throw error;
      await recordAudit({
        action: "patient.created",
        entity: "patients",
        entityId: inserted.id,
        metadata: { uhid: inserted.uhid },
      });
      return inserted;
    },
    onSuccess: (patient) => {
      toast.success(`Registered ${patient.full_name} · ${patient.uhid}`);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Patient registry"
        description="Single source of truth shared by reception, pathology, pharmacy and billing."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Register patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New patient registration</DialogTitle>
                <DialogDescription>A hospital UHID is generated automatically.</DialogDescription>
              </DialogHeader>
              <form
                id="patient-form"
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createPatient.mutate(new FormData(e.currentTarget));
                }}
              >
                <Field name="full_name" label="Full name" required />
                <Field name="phone" label="Mobile number" required />
                <Field name="age" label="Age" type="number" />
                <Field name="gender" label="Gender" defaultValue="female" />
                <Field name="blood_group" label="Blood group" />
                <Field name="lead_source" label="Lead source" placeholder="Walk-in / Referral / Camp" />
                <Field name="referring_doctor" label="Referring doctor" />
                <Field name="allergies" label="Known allergies" />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" name="address" rows={2} />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="patient-form" disabled={createPatient.isPending}>
                  Save patient
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="neo-inset mb-4 flex items-center gap-2 px-4 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, mobile or UHID"
          className="w-full bg-transparent py-1 text-sm outline-none"
          aria-label="Search patients"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading registry…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No patients found" description="Register the first patient to start building the medical timeline." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((p) => (
            <article key={p.id} className="neo p-4 transition-smooth hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{p.full_name}</h2>
                  <p className="text-xs text-muted-foreground">{p.uhid}</p>
                </div>
                <Badge variant="secondary">{p.gender}</Badge>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Mobile</dt>
                  <dd className="font-medium text-foreground">{p.phone}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Age</dt>
                  <dd className="font-medium text-foreground">{p.age ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Blood group</dt>
                  <dd className="font-medium text-foreground">{p.blood_group || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Lead source</dt>
                  <dd className="font-medium text-foreground">{p.lead_source || "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
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
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}