import { ShadowDriftExample } from './types';
import { ShadowDiagnosticsMetrics } from './shadow-diagnostics-metrics';
import { ShadowDiagnosticsLegend } from './shadow-diagnostics-legend';
import { ShadowDiagnosticsReferences } from './shadow-diagnostics-references';
import { ShadowDiagnosticsSummary } from './shadow-diagnostics-summary';
import { ShadowDiagnosticsExamples } from './shadow-diagnostics-examples';

type ShadowDiagnosticsPanelProps = {
  enhancedViewEnabled: boolean;
  shadowStatus: string;
  shadowMatched: number;
  shadowMismatch: number;
  shadowMissing: number;
  shadowPaymentStatusMismatch: number;
  shadowMeetingStatusMismatch?: number;
  shadowWorkflowStatusMismatch?: number;
  shadowEmailStatusMismatch?: number;
  shadowAmountMismatch: number;
  shadowFieldParityMismatch: number;
  recentDriftExamples?: ShadowDriftExample[];
  onSelectBooking?: (bookingReference: string) => void;
};

export function ShadowDiagnosticsPanel({
  enhancedViewEnabled,
  shadowStatus,
  shadowMatched,
  shadowMismatch,
  shadowMissing,
  shadowPaymentStatusMismatch,
  shadowMeetingStatusMismatch,
  shadowWorkflowStatusMismatch,
  shadowEmailStatusMismatch,
  shadowAmountMismatch,
  shadowFieldParityMismatch,
  recentDriftExamples,
  onSelectBooking,
}: ShadowDiagnosticsPanelProps) {
  const totalCompared = shadowMatched + shadowMismatch + shadowMissing;
  const matchedRate = totalCompared > 0 ? Math.round((shadowMatched / totalCompared) * 100) : 0;

  return (
    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ShadowDiagnosticsSummary enhancedViewEnabled={enhancedViewEnabled} shadowStatus={shadowStatus} />
        <ShadowDiagnosticsMetrics
          totalCompared={totalCompared}
          shadowMatched={shadowMatched}
          shadowMismatch={shadowMismatch}
          shadowMissing={shadowMissing}
          shadowPaymentStatusMismatch={shadowPaymentStatusMismatch}
          shadowMeetingStatusMismatch={shadowMeetingStatusMismatch}
          shadowWorkflowStatusMismatch={shadowWorkflowStatusMismatch}
          shadowEmailStatusMismatch={shadowEmailStatusMismatch}
          shadowAmountMismatch={shadowAmountMismatch}
          shadowFieldParityMismatch={shadowFieldParityMismatch}
          matchedRate={matchedRate}
        />
      </div>
      <ShadowDiagnosticsReferences
        shadowPaymentStatusMismatch={shadowPaymentStatusMismatch}
        shadowMeetingStatusMismatch={shadowMeetingStatusMismatch}
        shadowWorkflowStatusMismatch={shadowWorkflowStatusMismatch}
        shadowEmailStatusMismatch={shadowEmailStatusMismatch}
        shadowAmountMismatch={shadowAmountMismatch}
        shadowFieldParityMismatch={shadowFieldParityMismatch}
        recentDriftExamples={recentDriftExamples}
        onSelectBooking={onSelectBooking}
      />
      <ShadowDiagnosticsExamples
        recentDriftExamples={recentDriftExamples}
        onSelectBooking={onSelectBooking}
      />
      <ShadowDiagnosticsLegend className="mt-3" />
    </div>
  );
}
