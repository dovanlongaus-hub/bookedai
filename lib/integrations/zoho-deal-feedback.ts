type DealOutcomeSummaryItem = {
  id: number;
  local_entity_id: string;
  external_entity_id?: string | null;
  sync_status: string;
  outcome?: string | null;
  stage?: string | null;
  owner_name?: string | null;
  source_label?: string | null;
  closed_at?: string | null;
  lost_reason?: string | null;
  task_completed?: boolean | null;
  task_completed_at?: string | null;
  stage_changed_at?: string | null;
  amount_cents?: number | null;
  occurred_at?: string | null;
};

type DealOwnerPerformanceItem = {
  owner_name: string;
  total_count: number;
  won_count: number;
  lost_count: number;
  won_revenue_cents: number;
};

type DealLostReasonItem = {
  lost_reason: string;
  lost_count: number;
};

type DealStageBreakdownItem = {
  stage: string;
  stage_count: number;
};

type DealOutcomeSummaryResult = {
  enabled: boolean;
  summary: {
    won_count: number;
    lost_count: number;
    won_revenue_cents: number;
    feedback_count: number;
    win_rate: number;
    stage_signal_count: number;
    completed_task_count: number;
  };
  owner_performance: DealOwnerPerformanceItem[];
  lost_reasons: DealLostReasonItem[];
  stage_breakdown: DealStageBreakdownItem[];
  items: DealOutcomeSummaryItem[];
  details?: Record<string, unknown>;
};

function normalizeApiBaseUrl() {
  return process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
}

function authHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.ADMIN_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.ADMIN_API_TOKEN}`;
  }
  return headers;
}

export async function getZohoDealOutcomeSummary(): Promise<DealOutcomeSummaryResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      enabled: false,
        summary: {
          won_count: 0,
          lost_count: 0,
          won_revenue_cents: 0,
          feedback_count: 0,
          win_rate: 0,
          stage_signal_count: 0,
          completed_task_count: 0,
        },
        owner_performance: [],
        lost_reasons: [],
        stage_breakdown: [],
        items: [],
        details: { reason: "missing_public_api_url" },
      };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-feedback/deal-outcome-summary`, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...authHeaders(),
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          data?: {
            summary?: {
              won_count?: number;
              lost_count?: number;
              won_revenue_cents?: number;
              feedback_count?: number;
              win_rate?: number;
              stage_signal_count?: number;
              completed_task_count?: number;
            };
            owner_performance?: DealOwnerPerformanceItem[];
            lost_reasons?: DealLostReasonItem[];
            stage_breakdown?: DealStageBreakdownItem[];
            items?: DealOutcomeSummaryItem[];
          };
          error?: { code?: string; message?: string; details?: Record<string, unknown> };
        }
      | null;

    if (!response.ok) {
      return {
        enabled: true,
        summary: {
          won_count: 0,
          lost_count: 0,
          won_revenue_cents: 0,
          feedback_count: 0,
          win_rate: 0,
          stage_signal_count: 0,
          completed_task_count: 0,
        },
        owner_performance: [],
        lost_reasons: [],
        stage_breakdown: [],
        items: [],
        details: {
          statusCode: response.status,
          error: payload?.error ?? null,
        },
      };
    }

    return {
      enabled: true,
      summary: {
        won_count: payload?.data?.summary?.won_count ?? 0,
        lost_count: payload?.data?.summary?.lost_count ?? 0,
        won_revenue_cents: payload?.data?.summary?.won_revenue_cents ?? 0,
        feedback_count: payload?.data?.summary?.feedback_count ?? 0,
        win_rate: payload?.data?.summary?.win_rate ?? 0,
        stage_signal_count: payload?.data?.summary?.stage_signal_count ?? 0,
        completed_task_count: payload?.data?.summary?.completed_task_count ?? 0,
      },
      owner_performance: payload?.data?.owner_performance ?? [],
      lost_reasons: payload?.data?.lost_reasons ?? [],
      stage_breakdown: payload?.data?.stage_breakdown ?? [],
      items: payload?.data?.items ?? [],
    };
  } catch (error) {
    return {
      enabled: true,
      summary: {
        won_count: 0,
        lost_count: 0,
        won_revenue_cents: 0,
        feedback_count: 0,
        win_rate: 0,
        stage_signal_count: 0,
        completed_task_count: 0,
      },
      owner_performance: [],
      lost_reasons: [],
      stage_breakdown: [],
      items: [],
      details: {
        reason: "request_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}
