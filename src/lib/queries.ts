import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const patientsQuery = (search: string) =>
  queryOptions({
    queryKey: ["patients", search],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const term = search.trim();
      if (term) {
        query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,uhid.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

export const appointmentsQuery = () =>
  queryOptions({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(full_name, uhid, phone)")
        .order("scheduled_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const labOrdersQuery = () =>
  queryOptions({
    queryKey: ["lab-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_orders")
        .select("*, patients(full_name, uhid, phone)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const invoicesQuery = () =>
  queryOptions({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, patients(full_name, uhid, phone)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const followUpsQuery = () =>
  queryOptions({
    queryKey: ["follow-ups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*, patients(full_name, uhid, phone)")
        .order("due_date", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const callLogsQuery = () =>
  queryOptions({
    queryKey: ["call-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*, patients(full_name, uhid)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const auditLogsQuery = () =>
  queryOptions({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

export const staffQuery = () =>
  queryOptions({
    queryKey: ["staff"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return (profiles ?? []).map((profile) => ({
        ...profile,
        roles: (roles ?? []).filter((r) => r.user_id === profile.id).map((r) => r.role),
      }));
    },
  });

export const enquiriesQuery = () =>
  queryOptions({
    queryKey: ["enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });