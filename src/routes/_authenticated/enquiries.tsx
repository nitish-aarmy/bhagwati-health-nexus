import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneCall } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { enquiriesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/enquiries")({
  component: EnquiriesPage,
});

type EnquiryStatus = "new" | "contacted" | "converted" | "closed";
const NEXT: { label: string; status: EnquiryStatus }[] = [
  { label: "Mark contacted", status: "contacted" },
  { label: "Converted", status: "converted" },
  { label: "Close", status: "closed" },
];

function EnquiriesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(enquiriesQuery());

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EnquiryStatus }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("enquiries")
        .update({ status, handled_by: auth.user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
      await recordAudit({ action: `enquiry.${status}`, entity: "enquiries", entityId: id });
    },
    onSuccess: () => {
      toast.success("Enquiry updated");
      void queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Patient enquiries"
        description="Website and walk-in enquiries from patients, ready for call back and conversion."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading enquiries…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No enquiries yet" description="Enquiries submitted from the public website land here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((e) => (
            <article key={e.id} className="neo p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{e.full_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {e.phone}
                    {e.city ? ` · ${e.city}` : ""}
                  </p>
                </div>
                <Badge variant={e.status === "new" ? "default" : "outline"}>{e.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {e.department || "General enquiry"}
                {e.preferred_date ? ` · prefers ${new Date(e.preferred_date).toLocaleDateString()}` : ""}
              </p>
              {e.message && <p className="mt-2 text-sm">{e.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary" className="gap-2">
                  <a href={`tel:${e.phone}`}>
                    <PhoneCall className="size-3.5" /> Call
                  </a>
                </Button>
                {NEXT.filter((n) => n.status !== e.status).map((n) => (
                  <Button
                    key={n.status}
                    size="sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: e.id, status: n.status })}
                  >
                    {n.label}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}