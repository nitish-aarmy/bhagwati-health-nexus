import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isPatientOnly } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bhagwati Smart Hospital ERP" },
      {
        name: "description",
        content:
          "Secure ERP + EMR + CRM for Bhagwati Hospital with patient registry, OPD, lab, billing and follow-up workflows.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      const roleList = (roles ?? []).map((r) => r.role);
      void navigate({ to: isPatientOnly(roleList) || roleList.length === 0 ? "/portal" : "/dashboard" });
    })();
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,123,255,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(49,130,206,0.12),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-12">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </header>

        <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.3fr_1fr]">
          <section>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" /> One Hospital. One Secure Platform.
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Bhagwati Smart Hospital ERP
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Production-ready operations console for patient registration, appointments, laboratory,
              billing, follow-ups and patient self-service from one audited backend.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 justify-between gap-3 px-4">
                <Link to="/auth?login=patient">
                  <span className="flex items-center gap-2">
                    <UserRound className="size-4" /> Login as Patient
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-between gap-3 px-4">
                <Link to="/auth?login=staff">
                  <span className="flex items-center gap-2">
                    <Stethoscope className="size-4" /> Login as Staff
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="neo grid gap-3 p-5 text-sm">
            <Card title="Reception" body="Register patients, allocate UHIDs and manage OPD queue tokens." />
            <Card title="Laboratory" body="Track samples, update findings and approve reports for release." />
            <Card title="Billing" body="Create invoices, capture payments and monitor outstanding balances." />
            <Card title="CRM" body="Run follow-ups and maintain communication trail for every patient." />
          </section>
        </main>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-xl bg-muted/45 p-3.5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </article>
  );
}
