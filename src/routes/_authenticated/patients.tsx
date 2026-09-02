import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/patients")({
  beforeLoad: guardModuleAccess("patients"),
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
  speciality: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  lead_source: z.string().trim().max(80).optional(),
  referring_doctor: z.string().trim().max(120).optional(),
  treating_doctor: z.string().trim().max(120).optional(),
});

function PatientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [showAddSpecialty, setShowAddSpecialty] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(patientsQuery(search));

  const SPECIALITIES = ["GENERAL SURGERY", "ORTHOPEDICS", "OBS AND GYNE", "ENT", "MEDICINE"];

  const savePatient = useMutation({
    mutationFn: async ({ form, patientId }: { form: FormData; patientId?: string }) => {
      const raw = Object.fromEntries(form.entries());
      const parsed = patientSchema.safeParse(raw);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const v = parsed.data;
      const values = {
        full_name: v.full_name.toUpperCase(),
        phone: v.phone,
        gender: (v.gender || "OTHER").toUpperCase(),
        age: v.age ?? null,
        speciality: v.speciality?.toUpperCase() || null,
        address: v.address?.toUpperCase() || null,
        lead_source: v.lead_source?.toUpperCase() || null,
        referring_doctor: v.referring_doctor?.toUpperCase() || null,
        treating_doctor: v.treating_doctor?.toUpperCase() || null,
      };
      const query = patientId
        ? supabase.from("patients").update(values).eq("id", patientId)
        : supabase.from("patients").insert(values);
      const { data: saved, error } = await query.select().single();
      if (error) throw error;
      await recordAudit({
        action: patientId ? "patient.updated" : "patient.created",
        entity: "patients",
        entityId: saved.id,
        metadata: { uhid: saved.uhid },
      });
      return saved;
    },
    onSuccess: (patient) => {
      toast.success(`${editingPatient ? "Updated" : "Registered"} ${patient.full_name} · ${patient.uhid}`);
      setOpen(false);
      setEditingPatient(null);
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
              <Button className="gap-2" onClick={() => setEditingPatient(null)}>
                <Plus className="size-4" /> Register patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPatient ? "Edit patient details" : "New patient registration"}</DialogTitle>
                <DialogDescription>A hospital UHID is generated automatically.</DialogDescription>
              </DialogHeader>
              <form
                key={editingPatient?.id ?? "new"}
                id="patient-form"
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  savePatient.mutate({ form: new FormData(e.currentTarget), patientId: editingPatient?.id });
                }}
              >
                <Field name="full_name" label="Full name" required defaultValue={editingPatient?.full_name} />
                <Field name="phone" label="Mobile number" required defaultValue={editingPatient?.phone} />
                <Field name="age" label="Age" type="number" defaultValue={editingPatient?.age?.toString()} />
                <Field name="gender" label="Gender" defaultValue={editingPatient?.gender ?? "FEMALE"} />
                
                <div className="space-y-2">
                  <Label htmlFor="speciality">Speciality</Label>
                  <div className="flex gap-2">
                    <Select defaultValue={editingPatient?.speciality || ""} name="speciality">
                      <SelectTrigger id="speciality" className="flex-1">
                        <SelectValue placeholder="Select speciality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {SPECIALITIES.map((spec) => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddSpecialty(!showAddSpecialty)}
                    >
                      Add
                    </Button>
                  </div>
                  {showAddSpecialty && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Enter new speciality"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (newSpecialty.trim()) {
                            SPECIALITIES.push(newSpecialty.toUpperCase());
                            setNewSpecialty("");
                            setShowAddSpecialty(false);
                            toast.success("Speciality added");
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treating_doctor">Treating Doctor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="treating_doctor"
                      name="treating_doctor"
                      placeholder="Select or add doctor"
                      defaultValue={editingPatient?.treating_doctor || ""}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddDoctor(!showAddDoctor)}
                    >
                      Add
                    </Button>
                  </div>
                  {showAddDoctor && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Enter doctor name"
                        value={newDoctor}
                        onChange={(e) => setNewDoctor(e.target.value)}
                        className="text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (newDoctor.trim()) {
                            const formElement = document.getElementById("patient-form") as HTMLFormElement;
                            const doctorInput = formElement?.elements.namedItem("treating_doctor") as HTMLInputElement;
                            if (doctorInput) doctorInput.value = newDoctor.toUpperCase();
                            setNewDoctor("");
                            setShowAddDoctor(false);
                            toast.success("Doctor added");
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <Field name="lead_source" label="Lead source" placeholder="Walk-in / Referral / Camp" defaultValue={editingPatient?.lead_source ?? undefined} />
                <Field name="referring_doctor" label="Referring doctor" defaultValue={editingPatient?.referring_doctor ?? undefined} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" name="address" rows={2} defaultValue={editingPatient?.address ?? undefined} />
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="patient-form" disabled={savePatient.isPending}>
                  {editingPatient ? "Update patient" : "Save patient"}
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
                  <h2 className="truncate font-display text-base font-semibold">{p.full_name?.toUpperCase()}</h2>
                  <p className="text-xs text-muted-foreground">{p.uhid}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${p.full_name}`}
                    title="Edit patient"
                    onClick={() => {
                      setEditingPatient(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Badge variant="secondary">{p.gender?.toUpperCase()}</Badge>
                </div>
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
                  <dt>Speciality</dt>
                  <dd className="font-medium text-foreground">{p.speciality?.toUpperCase() || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Lead source</dt>
                  <dd className="font-medium text-foreground">{p.lead_source?.toUpperCase() || "—"}</dd>
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