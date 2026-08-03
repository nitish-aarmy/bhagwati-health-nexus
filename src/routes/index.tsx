import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  FlaskConical,
  PhoneCall,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const TITLE = "Bhagwati Smart Hospital ERP — Daltonganj";
const DESCRIPTION =
  "Unified hospital operating system for Bhagwati Hospital, Daltonganj: reception, OPD queue, pathology, billing, CRM follow-ups and a secure patient portal.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

const MODULES = [
  { icon: Users, title: "Reception & registry", copy: "Instant UHID registration, search and patient master records." },
  { icon: CalendarDays, title: "OPD queue", copy: "Token-based appointment flow from check-in to consultation notes." },
  { icon: FlaskConical, title: "Pathology", copy: "Order worklist, result entry and pathologist approval before release." },
  { icon: Receipt, title: "Billing & accounts", copy: "GST-ready invoices, part payments and daily collection tracking." },
  { icon: PhoneCall, title: "CRM & follow-ups", copy: "Recall queue with click-to-call and outcome logging for every patient." },
  { icon: ShieldCheck, title: "Roles & audit", copy: "16 staff roles, row-level data isolation and an append-only audit trail." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 lg:px-8">
        <BrandMark />
        <Button asChild>
          <Link to="/auth">Staff sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
        <section className="neo mt-6 p-8 lg:p-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Activity className="size-3.5" /> One hospital. One secure platform.
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight lg:text-5xl">
            Bhagwati Smart Hospital ERP
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{DESCRIPTION}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Enter the hospital workspace</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Patient portal</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/enquiry">Patient enquiry</Link>
            </Button>
          </div>
        </section>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="neo p-6">
              <span className="neo-inset flex size-10 items-center justify-center text-primary">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Bhagwati Hospital, Daltonganj · Jharkhand
      </footer>
    </div>
  );
}
