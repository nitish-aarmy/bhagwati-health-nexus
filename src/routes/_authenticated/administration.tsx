import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
import {
  downloadEncryptedBackup,
  downloadPlainBackup,
  importEncryptedBackup,
  importPlainBackup,
  resetLocalDatabase,
} from "@/lib/local-backup";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { auditLogsQuery, staffQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";
import { formatDateTimeDMY } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administration")({
  beforeLoad: guardModuleAccess("administration"),
  component: AdministrationPage,
});

function AdministrationPage() {
  const queryClient = useQueryClient();
  const staff = useQuery(staffQuery());
  const audits = useQuery(auditLogsQuery());
  const plainInputRef = useRef<HTMLInputElement>(null);
  const encryptedInputRef = useRef<HTMLInputElement>(null);
  const [passphrase, setPassphrase] = useState("");

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned");
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Unable to read selected file"));
      reader.readAsText(file);
    });
  }

  const exportEncrypted = useMutation({
    mutationFn: () => downloadEncryptedBackup(passphrase),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error || "Failed to export encrypted backup");
        return;
      }
      toast.success("Encrypted backup downloaded");
    },
    onError: () => toast.error("Failed to export encrypted backup"),
  });

  const importPlain = useMutation({
    mutationFn: async (file: File) => {
      const text = await readTextFile(file);
      return importPlainBackup(text);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error || "Import failed");
        return;
      }
      toast.success("Backup imported");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Import failed"),
  });

  const importEncrypted = useMutation({
    mutationFn: async (file: File) => {
      const text = await readTextFile(file);
      return importEncryptedBackup(text, passphrase);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error || "Encrypted import failed");
        return;
      }
      toast.success("Encrypted backup imported");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Encrypted import failed"),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      resetLocalDatabase();
      return true;
    },
    onSuccess: () => {
      toast.success("Local database reset");
      void queryClient.invalidateQueries();
      window.location.href = "/auth";
    },
    onError: () => toast.error("Reset failed"),
  });

  return (
    <div>
      <PageHeader
        title="Administration"
        description="User roles, privilege governance and immutable audit review."
      />

      <section className="neo mb-6 overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Local data controls</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            This app is running on your computer storage. Use backup and restore controls below.
          </p>
        </div>
        <div className="grid gap-4 border-b border-border/60 p-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <p className="text-sm font-medium">Plain backup</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={downloadPlainBackup}>
                Export JSON backup
              </Button>
              <Button type="button" variant="outline" onClick={() => plainInputRef.current?.click()}>
                Import JSON backup
              </Button>
              <input
                ref={plainInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importPlain.mutate(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Encrypted backup</p>
            <Input
              type="password"
              placeholder="Passphrase for encrypted backup"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => exportEncrypted.mutate()}
                disabled={exportEncrypted.isPending}
              >
                Export encrypted backup
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => encryptedInputRef.current?.click()}
              >
                Import encrypted backup
              </Button>
              <input
                ref={encryptedInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importEncrypted.mutate(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </div>
        </div>
        <div className="p-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            Reset local database
          </Button>
        </div>
      </section>

      <section className="neo mb-6 overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Staff & role assignment</h2>
        </div>
        {!staff.data || staff.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No staff profiles yet" description="Create users and assign roles to activate modules." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Assign role</th>
              </tr>
            </thead>
            <tbody>
              {staff.data.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{s.phone || "No mobile"}</p>
                  </td>
                  <td className="px-4 py-3">{s.department || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.roles as AppRole[]).map((r) => (
                        <Badge key={r} variant="outline">
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))}
                      {(s.roles as AppRole[]).length === 0 && <span className="text-muted-foreground">No role</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select onValueChange={(role) => assignRole.mutate({ userId: s.id, role: role as AppRole })}>
                      <SelectTrigger className="h-8 w-52">
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="neo overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Recent audit trail</h2>
        </div>
        {(audits.data ?? []).length === 0 ? (
          <div className="p-4">
            <EmptyState title="No audit events" description="Actions will appear as staff use clinical modules." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {(audits.data ?? []).slice(0, 40).map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTimeDMY(a.created_at)}</td>
                  <td className="px-4 py-3">{a.actor_name || "Unknown"}</td>
                  <td className="px-4 py-3 font-medium">{a.action}</td>
                  <td className="px-4 py-3">{a.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
