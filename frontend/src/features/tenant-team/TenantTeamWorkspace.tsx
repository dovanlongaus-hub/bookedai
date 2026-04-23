import type { Dispatch, FormEventHandler, SetStateAction } from 'react';

import type { TenantTeamResponse } from '../../shared/contracts';
import { TenantSectionActivityCard } from '../tenant-shared/TenantSectionActivityCard';

export type TenantInviteMemberFormState = {
  email: string;
  full_name: string;
  role: string;
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return 'Recently updated';
  }
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TenantTeamWorkspace({
  team,
  inviteForm,
  setInviteForm,
  teamPending,
  teamMessage,
  teamError,
  onInviteMember,
  onResendInvite,
  onUpdateMemberAccess,
}: {
  team: TenantTeamResponse;
  inviteForm: TenantInviteMemberFormState;
  setInviteForm: Dispatch<SetStateAction<TenantInviteMemberFormState>>;
  teamPending: boolean;
  teamMessage: string | null;
  teamError: string | null;
  onInviteMember: FormEventHandler<HTMLFormElement>;
  onResendInvite: (email: string) => void;
  onUpdateMemberAccess: (email: string, nextRole: string, nextStatus: string) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Team access
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Roles and permissions
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tenant admins control who can manage billing, who can operate the workspace, and which
            teammates are still in an invited state.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Members
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {team.summary.total_members}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Invited
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {team.summary.invited_members}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Billing managers
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {team.summary.admin_members + team.summary.finance_members}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-950">
              Current access: {team.access.current_role.replace(/_/g, ' ')}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {team.access.can_manage_team
                ? 'This session can invite members and change team roles.'
                : 'This session can view team access but cannot change roles.'}
            </div>
          </div>

          <div className="mt-5">
            <TenantSectionActivityCard label="Team access audit" activity={team.activity} />
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Invite teammate
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Add a tenant member
          </h2>

          <form className="mt-5 space-y-4" onSubmit={onInviteMember}>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Email
              </div>
              <input
                value={inviteForm.email}
                disabled={teamPending || !team.access.can_manage_team}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, email: event.target.value }))
                }
                className="booked-form-input"
                placeholder="teammate@example.com"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Full name
              </div>
              <input
                value={inviteForm.full_name}
                disabled={teamPending || !team.access.can_manage_team}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, full_name: event.target.value }))
                }
                className="booked-form-input"
                placeholder="Finance lead"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Role
              </div>
              <select
                value={inviteForm.role}
                disabled={teamPending || !team.access.can_manage_team}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, role: event.target.value }))
                }
                className="booked-form-input"
              >
                {team.available_roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            {teamError ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {teamError}
              </div>
            ) : null}
            {teamMessage ? (
              <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {teamMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={teamPending || !team.access.can_manage_team || !inviteForm.email.trim()}
              className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                teamPending || !team.access.can_manage_team || !inviteForm.email.trim()
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-slate-950 text-white hover:bg-slate-800'
              }`}
            >
              {teamPending ? 'Saving access...' : 'Invite member'}
            </button>
          </form>

          {team.invite_delivery ? (
            <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Latest invite delivery
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {team.invite_delivery.status === 'sent' ? 'Invite email sent' : 'Manual invite handoff'}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {team.invite_delivery.operator_note}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {team.invite_delivery.recipient_email}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {team.invite_delivery.role.replace(/_/g, ' ')}
                </span>
              </div>
              <a
                href={team.invite_delivery.invite_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open invite link
              </a>
            </div>
          ) : null}

          {team.invite_activity?.length ? (
            <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Recent invite activity
              </div>
              <div className="mt-4 space-y-3">
                {team.invite_activity.map((item) => (
                  <div key={item.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{formatDateLabel(item.created_at)}</span>
                      {item.delivery_status ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                          {item.delivery_status}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {item.recipient_email || 'Invited teammate'}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{item.summary}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {item.role ? item.role.replace(/_/g, ' ') : 'role pending'}
                      {item.actor_id ? ` • invited by ${item.actor_id}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </div>

      <div className="space-y-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Team roster
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Workspace members
          </h2>

          <div className="mt-5 space-y-3">
            {team.members.map((member) => (
              <div
                key={member.email}
                className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {member.full_name || member.email}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{member.email}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {member.auth_provider ?? 'password'} · updated {formatDateLabel(member.updated_at)}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={member.role}
                      onChange={(event) =>
                        onUpdateMemberAccess(member.email, event.target.value, member.status)
                      }
                      disabled={teamPending || !team.access.can_manage_team}
                      className="booked-form-input min-w-[11rem]"
                    >
                      {team.available_roles.map((role) => (
                        <option key={role.code} value={role.code}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={member.status}
                      onChange={(event) =>
                        onUpdateMemberAccess(member.email, member.role, event.target.value)
                      }
                      disabled={teamPending || !team.access.can_manage_team}
                      className="booked-form-input min-w-[10rem]"
                    >
                      <option value="active">Active</option>
                      <option value="invited">Invited</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                {member.status === 'invited' ? (
                  <button
                    type="button"
                    onClick={() => onResendInvite(member.email)}
                    disabled={teamPending || !team.access.can_manage_team}
                    className={`mt-3 inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      teamPending || !team.access.can_manage_team
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Resend invite
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
