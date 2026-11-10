import { AppShell } from "@/components/brandproof/app-shell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Settings, Shield, Database } from "lucide-react";
import { getSessionUser, requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberManager, MemberRecord, AuditRecord } from "@/components/brandproof/member-manager";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings & Access Control — BrandProof",
  description: "Workspace configuration, member roles, designated reviewer thresholds, and audit retention.",
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/settings");
  }

  const supabase = await createClient();

  // Find user's current workspace membership
  const { data: userMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, is_designated_reviewer, workspaces (id, name, slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Fallback to Aster & Pine demo workspace if not explicitly joined
  const workspaceId =
    userMembership?.workspace_id || "b0000000-0000-0000-0000-000000000001";
  const currentUserRole = userMembership?.role || "admin";

  const adminSb = createAdminClient();

  // 1. Fetch workspace profile
  const { data: workspace } = await adminSb
    .from("workspaces")
    .select("id, name, slug, description")
    .eq("id", workspaceId)
    .maybeSingle();

  // 2. Fetch workspace members with profiles
  const { data: rawMembers } = await adminSb
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, is_designated_reviewer, created_at, profiles (full_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  // Get user emails from auth.users for display
  const { data: authUserData } = await adminSb.auth.admin.listUsers();
  const emailMap = new Map(authUserData?.users.map((u) => [u.id, u.email]) || []);

  const members: MemberRecord[] = (rawMembers || []).map((m: any) => ({
    id: m.id,
    workspace_id: m.workspace_id,
    user_id: m.user_id,
    role: m.role,
    is_designated_reviewer: m.is_designated_reviewer,
    created_at: m.created_at,
    profiles: m.profiles,
    email: emailMap.get(m.user_id),
  }));

  // 3. Fetch member & role audit events
  const { data: rawAuditEvents } = await adminSb
    .from("audit_events")
    .select("id, event_type, entity_type, entity_id, actor_id, payload, created_at, profiles (full_name)")
    .eq("workspace_id", workspaceId)
    .in("event_type", ["member_added", "role_changed", "member_removed", "workspace_created"])
    .order("created_at", { ascending: false })
    .limit(20);

  const auditEvents: AuditRecord[] = (rawAuditEvents || []).map((a: any) => ({
    id: a.id,
    event_type: a.event_type,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    actor_id: a.actor_id,
    payload: a.payload || {},
    created_at: a.created_at,
    profiles: a.profiles,
  }));

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Settings & Members", href: "/settings" },
      ]}
      currentRole={currentUserRole}
    >
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-rule pb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Workspace Configuration &amp; Access Control
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Governance &amp; Workspace Settings
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Manage brand knowledge base sources, member role authorization, designated reviewer thresholds, and audit retention.
          </p>
        </div>

        {/* Member Directory and Access Control Component */}
        <MemberManager
          workspaceId={workspaceId}
          initialMembers={members}
          initialAuditEvents={auditEvents}
          currentUserRole={currentUserRole}
        />

        {/* Workspace Identity Profile */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Settings className="w-4 h-4 text-accent stroke-[1.5]" />
            Workspace Profile
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Workspace Name"
              defaultValue={workspace?.name || "Aster & Pine (Demo)"}
              disabled
            />
            <Input
              label="Slug Identifier"
              defaultValue={workspace?.slug || "aster-and-pine"}
              disabled
              hint="Unique tenant slug used for private storage paths and RLS policies"
            />
          </div>
        </div>

        {/* Governance & Review Policy */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Shield className="w-4 h-4 text-accent stroke-[1.5]" />
            Governance Thresholds
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Critical Severity Routing"
              defaultValue="designated"
              options={[
                { value: "designated", label: "Require Designated Reviewer Sign-off" },
                { value: "any_reviewer", label: "Any Reviewer" },
                { value: "admin_only", label: "Admin Only" },
              ]}
              hint="High-risk claims require designated reviewer approval"
            />
            <Select
              label="Audit Log Retention"
              defaultValue="immutable"
              options={[
                { value: "immutable", label: "Permanent Immutable Ledger (Append-Only)" },
                { value: "7years", label: "7 Years Statutory Regulatory Hold" },
              ]}
              hint="Append-only Postgres ledger protected by DB triggers"
            />
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Database className="w-4 h-4 text-accent stroke-[1.5]" />
            Infrastructure Status
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-paper rounded-sm border border-rule">
              <div>
                <p className="font-semibold text-ink">Supabase PostgreSQL</p>
                <p className="text-[11px] text-ink-faint">Connected to frwyivmydlskebnjgybl.supabase.co</p>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium text-[10px]">
                Active (14 Tables, RLS Enabled)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-paper rounded-sm border border-rule">
              <div>
                <p className="font-semibold text-ink">LLM Governance Provider</p>
                <p className="text-[11px] text-ink-faint">Google Gemini 2.5 Flash Adapter (Structured JSON Output)</p>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium text-[10px]">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
