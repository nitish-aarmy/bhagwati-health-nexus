import { supabase } from "@/integrations/supabase/client";

type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append-only audit trail. Failures are swallowed so a logging problem never
 * blocks a clinical action, but they are reported to the console for ops.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const actorId = data.user?.id;
    if (!actorId) return;
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_name: input.actorName ?? data.user?.email ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as never,
    });
    if (error) console.error("[audit] failed to record", error.message);
  } catch (error) {
    console.error("[audit] unexpected failure", error);
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}