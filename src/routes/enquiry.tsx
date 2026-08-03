import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Patient Enquiry — Bhagwati Hospital, Daltonganj";
const DESCRIPTION =
  "Send an enquiry to Bhagwati Hospital, Daltonganj. Ask about OPD consultations, pathology tests, packages or appointment availability and our care team will call you back.";

export const Route = createFileRoute("/enquiry")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnquiryPage,
});

const enquirySchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional(),
  department: z.string().trim().max(80).optional(),
  preferred_date: z.string().trim().max(20).optional(),
  message: z.string().trim().max(1000).optional(),
});

function EnquiryPage() {
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = enquirySchema.safeParse(Object.fromEntries(form.entries()));
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const v = parsed.data;
      const { error } = await supabase.from("enquiries").insert({
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || null,
        city: v.city || null,
        department: v.department || null,
        preferred_date: v.preferred_date || null,
        message: v.message || null,
        source: "website",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Enquiry received. Our team will call you shortly.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 lg:px-8">
        <Link to="/">
          <BrandMark />
        </Link>
        <Button asChild variant="secondary">
          <Link to="/auth">Patient login</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 lg:px-8">
        <h1 className="font-display text-3xl font-semibold lg:text-4xl">Patient enquiry</h1>
        <p className="mt-3 text-muted-foreground">{DESCRIPTION}</p>

        {done ? (
          <section className="neo mt-8 flex flex-col items-start gap-3 p-8">
            <CheckCircle2 className="size-8 text-primary" />
            <h2 className="font-display text-xl font-semibold">Thank you — we have your enquiry</h2>
            <p className="text-sm text-muted-foreground">
              A care coordinator from Bhagwati Hospital will contact you on the number you shared.
              For anything urgent, please call the hospital reception directly.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button onClick={() => setDone(false)} variant="secondary">
                Send another enquiry
              </Button>
              <Button asChild>
                <Link to="/auth">Create a patient account</Link>
              </Button>
            </div>
          </section>
        ) : (
          <form
            className="neo mt-8 grid gap-4 p-6 sm:grid-cols-2 lg:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate(new FormData(e.currentTarget));
            }}
          >
            <EnquiryField name="full_name" label="Full name" required />
            <EnquiryField name="phone" label="Mobile number" required placeholder="+91" />
            <EnquiryField name="email" label="Email (optional)" type="email" />
            <EnquiryField name="city" label="City / village" defaultValue="Daltonganj" />
            <EnquiryField name="department" label="Department or service" placeholder="OPD, Pathology, Radiology…" />
            <EnquiryField name="preferred_date" label="Preferred date" type="date" />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="message">How can we help?</Label>
              <Textarea id="message" name="message" rows={4} maxLength={1000} placeholder="Describe your symptoms or the test you need." />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" className="gap-2" disabled={submit.isPending}>
                <PhoneCall className="size-4" /> Request a call back
              </Button>
            </div>
          </form>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Bhagwati Hospital, Daltonganj · Jharkhand
      </footer>
    </div>
  );
}

function EnquiryField({
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