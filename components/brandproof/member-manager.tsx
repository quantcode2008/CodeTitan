"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
  removeWorkspaceMemberAction,
} from "@/lib/actions/members";
import { WorkspaceRole } from "@/lib/auth/types";
import {
  Users,
  UserPlus,
  Shield,
  Star,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
} from "lucide-react";

export interface MemberRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  is_designated_reviewer: boolean;
  created_at?: string;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  email?: string;
}

export interface AuditRecord {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  payload: Record<string, any>;
  created_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

export interface MemberManagerProps {
  workspaceId: string;
  initialMembers: MemberRecord[];
  initialAuditEvents: AuditRecord[];
  currentUserRole: WorkspaceRole;
}

export function MemberManager({
  workspaceId,
  initialMembers,
  initialAuditEvents,
  currentUserRole,
}: MemberManagerProps) {
  const [members, setMembers] = React.useState<MemberRecord[]>(initialMembers);
  const [auditEvents, setAuditEvents] = React.useState<AuditRecord[]>(initialAuditEvents);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<WorkspaceRole>("creator");
  const [inviteDesignated, setInviteDesignated] = React.useState(false);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const isAdmin = currentUserRole === "admin";

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg("Only workspace administrators can add members.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await addWorkspaceMemberAction({
        workspaceId,
        email: inviteEmail,
        role: inviteRole,
        isDesignatedReviewer: inviteDesignated,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to add member.");
      } else {
        setSuccessMsg(`Successfully added ${inviteEmail} as ${inviteRole}.`);
        setInviteEmail("");
        setInviteDesignated(false);
        // Refresh local state
        if (res.member) {
          setMembers((prev) => {
            const exists = prev.some((m) => m.id === res.member.id);
            if (exists) {
              return prev.map((m) => (m.id === res.member.id ? res.member : m));
            }
            return [...prev, res.member];
          });
        }
      }
    });
  }

  async function handleRoleChange(
    memberId: string,
    newRole: WorkspaceRole,
    newDesignated: boolean
  ) {
    if (!isAdmin) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateWorkspaceMemberRoleAction({
        workspaceId,
        memberId,
        role: newRole,
        isDesignatedReviewer: newDesignated,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update member role.");
      } else {
        setSuccessMsg("Member permissions updated and recorded in audit log.");
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, role: newRole, is_designated_reviewer: newDesignated }
              : m
          )
        );
      }
    });
  }

  async function handleRemoveMember(memberId: string, nameOrEmail: string) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to remove ${nameOrEmail} from this workspace?`)) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await removeWorkspaceMemberAction({
        workspaceId,
        memberId,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to remove member.");
      } else {
        setSuccessMsg("Member removed from workspace and audited.");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-oxblood-tint/60 border border-oxblood/30 text-oxblood text-xs font-sans flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3 rounded-sm bg-moss-tint/60 border border-moss/30 text-moss text-xs font-sans flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Member Directory */}
      <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rule">
          <div className="flex items-center gap-2 text-sm font-serif font-medium text-ink">
            <Users className="w-4 h-4 text-accent stroke-[1.5]" />
            <span>Workspace Members &amp; Role-Aware Access</span>
          </div>
          <span className="font-mono text-xs text-ink-soft">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        <div className="space-y-3">
          {members.map((member) => {
            const roleBadgeClass = {
              admin: "bg-oxblood-tint text-oxblood border-oxblood/30",
              reviewer: "bg-ochre-tint text-ochre border-ochre/30",
              creator: "bg-slate-tint text-slate border-slate/30",
            }[member.role];

            const displayName =
              member.profiles?.full_name || member.email || `User (${member.user_id.slice(0, 8)}...)`;

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-paper rounded-sm border border-rule gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-paper-sunken border border-rule flex items-center justify-center font-mono text-xs font-bold text-accent">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink">
                        {displayName}
                      </span>
                      <span
                        className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm border ${roleBadgeClass}`}
                      >
                        {member.role}
                      </span>
                      {member.is_designated_reviewer && (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-ochre-tint text-ochre border border-ochre/30">
                          <Star className="w-2.5 h-2.5 fill-ochre" />
                          Designated
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-ink-soft mt-0.5">
                      User ID: {member.user_id}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={member.role}
                      disabled={isPending}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as WorkspaceRole,
                          member.is_designated_reviewer
                        )
                      }
                      className="text-xs font-mono bg-paper-raised border border-rule rounded-sm px-2 py-1 text-ink focus:border-accent"
                    >
                      <option value="creator">Creator</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>

                    {member.role === "reviewer" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          handleRoleChange(
                            member.id,
                            member.role,
                            !member.is_designated_reviewer
                          )
                        }
                        title={
                          member.is_designated_reviewer
                            ? "Revoke designated reviewer authority"
                            : "Grant designated reviewer authority"
                        }
                        className={`p-1 rounded-sm border text-[10px] font-mono transition-colors cursor-pointer ${
                          member.is_designated_reviewer
                            ? "bg-ochre-tint text-ochre border-ochre/40"
                            : "bg-paper-sunken text-ink-soft border-rule hover:text-ink"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveMember(member.id, displayName)}
                      title="Remove member"
                      className="p-1 rounded-sm border border-rule hover:border-oxblood text-ink-soft hover:text-oxblood bg-paper-sunken transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Invite Member Panel (Admin Only) */}
      {isAdmin ? (
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <UserPlus className="w-4 h-4 text-accent stroke-[1.5]" />
            <span>Add Member by Email (Direct Assignment)</span>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-ink-soft mb-1 uppercase tracking-wider">
                  Member Email
                </label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. reviewer@asterandpine.demo"
                  className="font-sans text-xs bg-paper"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-soft mb-1 uppercase tracking-wider">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="w-full text-xs font-mono bg-paper border border-rule rounded-sm px-2.5 py-2 text-ink focus:border-accent"
                >
                  <option value="creator">Creator (Drafting &amp; Scans)</option>
                  <option value="reviewer">Reviewer (Decision Authority)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
            </div>

            {inviteRole === "reviewer" && (
              <label className="flex items-center gap-2 text-xs font-sans text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inviteDesignated}
                  onChange={(e) => setInviteDesignated(e.target.checked)}
                  className="rounded-none border-rule text-accent focus:ring-accent"
                />
                <span>
                  <strong>Designated Reviewer:</strong> Grant authority to sign off on high-severity claim findings.
                </span>
              </label>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="text-xs font-mono tracking-wider uppercase py-2"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
              {isPending ? "Adding Member..." : "Add Workspace Member"}
            </Button>
          </form>

          <p className="text-[11px] font-sans text-ink-soft leading-relaxed border-t border-rule pt-3">
            <strong>Architecture Decision:</strong> We chose direct add of existing registered users by email with immediate role and designated-reviewer assignment into <code className="font-mono text-ink">workspace_members</code>, recording an immutable <code className="font-mono text-ink">member_added</code> record to <code className="font-mono text-ink">audit_events</code>. Seeded accounts: <code className="font-mono">admin@asterandpine.demo</code>, <code className="font-mono">reviewer@asterandpine.demo</code>, <code className="font-mono">creator1@asterandpine.demo</code>, <code className="font-mono">creator2@asterandpine.demo</code>.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-sm bg-paper-sunken border border-rule text-xs text-ink-soft font-sans">
          <Shield className="w-4 h-4 text-accent inline mr-1.5" />
          Member management is restricted to workspace administrators. Your role is <strong>{currentUserRole}</strong>.
        </div>
      )}

      {/* Member & Role Audit Trail */}
      <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
          <History className="w-4 h-4 text-accent stroke-[1.5]" />
          <span>Membership &amp; Role Change Audit Ledger (Append-Only)</span>
        </div>

        {auditEvents.length === 0 ? (
          <div className="text-xs text-ink-soft font-mono py-3">
            No member change events recorded in this workspace session yet.
          </div>
        ) : (
          <div className="space-y-2">
            {auditEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 bg-paper rounded-sm border border-rule flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2"
              >
                <div>
                  <span className="font-semibold text-accent uppercase mr-2">
                    {evt.event_type}
                  </span>
                  <span className="text-ink-soft">
                    {JSON.stringify(evt.payload)}
                  </span>
                </div>
                <div className="text-[10px] text-ink-soft shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-ink-faint" />
                  <span>{new Date(evt.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
