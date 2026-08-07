import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PhoneCall, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { callLogsQuery, patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/calls")({
  beforeLoad: guardModuleAccess("calls"),
  component: CallsPage,
});

function CallsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("connected");

  const calls = useQuery(callLogsQuery());
  const patients = useQuery(patientsQuery(search));

  const logCall = useMutation({
    mutationFn: async ({ patientId, phone }: { patientId: string; phone: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from("call_logs")
        .insert({
          patient_id: patientId,
          phone,
          direction: "outgoing",
          outcome,
          duration_seconds: 0,
          ...(auth.user?.id ? { staff_id: auth.user.id } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      await recordAudit({
        action: "call.logged",
        entity: "call_logs",
        entityId: inserted.id,
        metadata: { outcome },
      });
    },
    onSuccess: () => {
      toast.success("Call logged");
      void queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Call centre"
        description="Hospital-routed call logging and patient interaction tracking."
      />

      <div className="neo mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label htmlFor="patient-search" className="text-xs font-medium text-muted-foreground">
              Find patient for click-to-call
            </label>
            <div className="neo-inset flex items-center gap-2 px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                id="patient-search"
                className="border-0 bg-transparent px-0"
                placeholder="Name, UHID or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Outcome</label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="no-answer">No answer</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="wrong-number">Wrong number</SelectItem>
                <SelectItem value="callback-needed">Callback needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(patients.data ?? []).slice(0, 12).map((p) => (
            <article key={p.id} className="rounded-xl bg-muted/40 p-3">
              <p className="font-medium">{p.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.uhid} · {p.phone}
              </p>
              <Button
                className="mt-2 gap-1"
                size="sm"
                variant="secondary"
                asChild
                onClick={() => logCall.mutate({ patientId: p.id, phone: p.phone })}
              >
                <a href={`tel:${p.phone}`}>
                  <PhoneCall className="size-4" /> Call
                </a>
              </Button>
            </article>
          ))}
        </div>
      </div>

      {(calls.data ?? []).length === 0 ? (
        <EmptyState title="No calls logged" description="Use click-to-call to create interaction history." />
      ) : (
        <div className="neo overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {(calls.data ?? []).map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    {c.patients?.full_name ?? "Unknown"}
                    <p className="text-xs text-muted-foreground">{c.patients?.uhid ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.direction}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.outcome ?? "logged"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
