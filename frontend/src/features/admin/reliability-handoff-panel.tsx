import { useEffect, useMemo, useState } from 'react';
import { brandName } from '../../components/landing/data';
import { sendAdminDiscordHandoff } from './api';

type HandoffFormat = 'discord' | 'slack' | 'ticket' | 'incident';

const handoffFormats: {
  value: HandoffFormat;
  label: string;
  audience: string;
  suggestedTitle: string;
  intro: string;
}[] = [
  {
    value: 'discord',
    label: 'Discord',
    audience: 'Team channel update',
    suggestedTitle: `${brandName} team update`,
    intro: 'Use this format to post a quick progress summary into the shared Discord channel.',
  },
  {
    value: 'slack',
    label: 'Slack',
    audience: 'Ops channel handoff',
    suggestedTitle: `${brandName} reliability triage update`,
    intro: 'Use this short format for rapid operator or release-channel updates.',
  },
  {
    value: 'ticket',
    label: 'Ticket',
    audience: 'Task or issue tracker',
    suggestedTitle: 'Reliability follow-up task',
    intro: 'Use this format when the lane needs a more structured async follow-up item.',
  },
  {
    value: 'incident',
    label: 'Incident',
    audience: 'Incident log or release hold note',
    suggestedTitle: 'Reliability incident note',
    intro: 'Use this format when the lane is part of a rollout hold, incident note, or risk review.',
  },
];

type ReliabilityHandoffPanelProps = {
  laneLabel: string;
  laneTitle: string;
  laneSummary: string;
  primaryActionLabel: string;
  checklist: string[];
  storageKey: string;
  apiBaseUrl: string;
  sessionToken: string;
  discordConfigured: boolean;
};

export function ReliabilityHandoffPanel({
  laneLabel,
  laneTitle,
  laneSummary,
  primaryActionLabel,
  checklist,
  storageKey,
  apiBaseUrl,
  sessionToken,
  discordConfigured,
}: ReliabilityHandoffPanelProps) {
  const [operatorNote, setOperatorNote] = useState('');
  const [exportStatus, setExportStatus] = useState('No export package prepared yet.');
  const [handoffFormat, setHandoffFormat] = useState<HandoffFormat>('discord');
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const laneToken = useMemo(
    () => laneLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    [laneLabel],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setOperatorNote(window.localStorage.getItem(storageKey) ?? '');
    setExportStatus('No export package prepared yet.');
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, operatorNote);
  }, [operatorNote, storageKey]);

  const exportSummary = useMemo(() => {
    const followUpNote = operatorNote.trim() || 'No local operator note recorded yet.';
    if (handoffFormat === 'discord') {
      return [
        `Team update: ${laneLabel}`,
        `Summary: ${laneSummary}`,
        `Primary action: ${primaryActionLabel}`,
        `Operator note: ${followUpNote}`,
        'Checklist:',
        ...checklist.map((item, index) => `${index + 1}. ${item}`),
        'Suggested use: Discord team update or async ops channel summary.',
      ].join('\n');
    }

    if (handoffFormat === 'ticket') {
      return [
        `Title: Reliability follow-up - ${laneLabel}`,
        `Focus lane: ${laneToken}`,
        `Summary: ${laneSummary}`,
        `Primary action: ${primaryActionLabel}`,
        `Operator note: ${followUpNote}`,
        'Acceptance checklist:',
        ...checklist.map((item, index) => `${index + 1}. ${item}`),
        'Suggested use: task tracker or team handoff ticket.',
      ].join('\n');
    }

    if (handoffFormat === 'incident') {
      return [
        `Incident note: ${laneLabel}`,
        `Risk lane: ${laneToken}`,
        `Current posture: ${laneSummary}`,
        `Immediate action: ${primaryActionLabel}`,
        `Operator note: ${followUpNote}`,
        'Triage checkpoints:',
        ...checklist.map((item, index) => `- ${index + 1}. ${item}`),
        'Suggested use: release hold, incident journal, or escalation note.',
      ].join('\n');
    }

    return [
      `Lane: ${laneLabel}`,
      `Lane tag: ${laneToken}`,
      `Lane focus: ${laneToken}`,
      `Summary: ${laneSummary}`,
      `Primary action: ${primaryActionLabel}`,
      `Operator note: ${followUpNote}`,
      'Checklist:',
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      'Suggested use: Slack or fast operator handoff.',
    ].join('\n');
  }, [checklist, handoffFormat, laneLabel, laneSummary, laneToken, operatorNote, primaryActionLabel]);

  const selectedFormat = handoffFormats.find((format) => format.value === handoffFormat) ?? handoffFormats[0];

  async function prepareExportPackage() {
    setExportStatus('Export package refreshed for handoff.');

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportSummary);
      setExportStatus('Export package copied to clipboard and ready for handoff.');
    } catch {
      setExportStatus('Export package refreshed for handoff.');
    }
  }

  async function sendDiscordUpdate() {
    if (!discordConfigured || sendingDiscord) {
      return;
    }

    setSendingDiscord(true);
    setExportStatus('Sending handoff to Discord...');

    try {
      const response = await sendAdminDiscordHandoff(apiBaseUrl, sessionToken, {
        title: `${laneTitle}`,
        summary: exportSummary,
        lane_label: laneLabel,
        handoff_format: handoffFormat,
      });
      setExportStatus(response.message);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'Could not send Discord handoff.');
    } finally {
      setSendingDiscord(false);
    }
  }

  function clearOperatorNote() {
    setOperatorNote('');
    setExportStatus('Local operator note cleared.');
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.5rem] border border-violet-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          Operator notes and export cues
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {handoffFormats.map((format) => (
            <button
              key={format.value}
              type="button"
              aria-pressed={handoffFormat === format.value}
              onClick={() => setHandoffFormat(format.value)}
              className={`rounded-[1.25rem] border px-4 py-3 text-left text-sm transition ${
                handoffFormat === format.value
                  ? 'border-violet-300 bg-violet-50 text-violet-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="font-semibold">{format.label} format</div>
              <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                {format.audience}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-[1.25rem] border border-violet-200 bg-violet-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Packaging guidance
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-950">{selectedFormat.suggestedTitle}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedFormat.intro}</p>
        </div>
        <label className="mt-3 block text-sm font-semibold text-slate-950" htmlFor="reliability-operator-note">
          Operator note
        </label>
        <textarea
          id="reliability-operator-note"
          value={operatorNote}
          onChange={(event) => setOperatorNote(event.target.value)}
          placeholder="Capture the lane-specific follow-up you want to hand off after this review."
          className="mt-3 min-h-[140px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
        />
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Keep this note local and additive. It is meant for operator handoff, not as an
          authoritative backend workflow record.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void prepareExportPackage();
            }}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Prepare export package
          </button>
          <button
            type="button"
            onClick={() => {
              void sendDiscordUpdate();
            }}
            disabled={!discordConfigured || sendingDiscord}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              discordConfigured && !sendingDiscord
                ? 'bg-violet-600 text-white hover:bg-violet-500'
                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            {sendingDiscord ? 'Sending to Discord...' : 'Send to Discord'}
          </button>
          <button
            type="button"
            onClick={clearOperatorNote}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            Clear local note
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-violet-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          Export-ready summary
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use this summary in Slack, ticket handoff, or incident notes.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Discord webhook: {discordConfigured ? 'configured and ready to post.' : 'not configured yet.'}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Suggested audience
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-950">{selectedFormat.audience}</div>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Suggested title
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-950">{selectedFormat.suggestedTitle}</div>
          </div>
        </div>
        <textarea
          readOnly
          value={exportSummary}
          className="mt-3 min-h-[220px] w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
        />
        <p className="mt-3 text-sm font-medium text-violet-700">{exportStatus}</p>
      </div>
    </div>
  );
}
