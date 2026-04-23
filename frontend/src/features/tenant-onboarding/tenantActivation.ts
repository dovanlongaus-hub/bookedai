import type {
  TenantAuthSessionResponse,
  TenantOnboardingResponse,
  TenantOverviewResponse,
} from '../../shared/contracts';

export type TenantActivationPanel = 'overview' | 'experience' | 'catalog' | 'billing' | 'team';

export type TenantActivationState = {
  phase:
    | 'preview'
    | 'verify_identity'
    | 'complete_profile'
    | 'add_catalog'
    | 'publish_offer'
    | 'configure_billing'
    | 'start_subscription'
    | 'activation_complete';
  headline: string;
  body: string;
  actionLabel: string;
  actionPanel: TenantActivationPanel | null;
  statusTone: 'sky' | 'amber' | 'emerald';
  checklist: Array<{
    id: string;
    label: string;
    done: boolean;
    detail: string;
  }>;
};

function hasCompletedStep(onboarding: TenantOnboardingResponse, stepId: string) {
  return onboarding.steps.some((step) => step.id === stepId && step.status === 'complete');
}

function getVerticalHint(tenant: TenantOverviewResponse['tenant']) {
  const slug = tenant.slug.toLowerCase();
  const industry = (tenant.industry || '').toLowerCase();

  if (slug.includes('future-swim') || slug.includes('swim') || industry.includes('swim')) {
    return 'For swim schools, activation is only complete once parents can discover classes, enquire safely, and the workspace can prove booked lesson revenue.';
  }

  if (slug.includes('chess') || industry.includes('chess')) {
    return 'For chess programs, activation is only complete once beginner-to-advanced offers are visible, enquiries convert cleanly, and recurring class revenue becomes measurable.';
  }

  if (slug.includes('mentor') || industry.includes('mentor') || industry.includes('ai')) {
    return 'For AI mentor offers, activation is only complete once consultation packages are live, enterprise follow-up is visible, and package revenue can be traced back to BookedAI.';
  }

  return 'Activation is only complete once this workspace has a publishable offer, commercial posture, and a visible value story.';
}

function isFutureSwimTenant(tenant: TenantOverviewResponse['tenant']) {
  const slug = tenant.slug.toLowerCase();
  const industry = (tenant.industry || '').toLowerCase();
  return slug.includes('future-swim') || slug.includes('swim') || industry.includes('swim');
}

export function deriveTenantActivationState({
  session,
  onboarding,
  overview,
}: {
  session: TenantAuthSessionResponse | null;
  onboarding: TenantOnboardingResponse;
  overview: TenantOverviewResponse;
}): TenantActivationState {
  const futureSwim = isFutureSwimTenant(overview.tenant);
  const checklist = [
    {
      id: 'identity',
      label: 'Identity verified',
      done: Boolean(session?.session_token),
      detail: session
        ? 'Write access is available for this tenant workspace.'
        : 'Sign in or claim access before making tenant-owned changes.',
    },
    {
      id: 'business_profile',
      label: 'Business profile ready',
      done: hasCompletedStep(onboarding, 'business_profile'),
      detail: 'Business name, industry, timezone, and workspace basics are set.',
    },
    {
      id: 'catalog',
      label: 'Catalog added',
      done: onboarding.checkpoints.catalog_records > 0,
      detail: `${onboarding.checkpoints.catalog_records} service record(s) currently exist in this tenant catalog.`,
    },
    {
      id: 'publish',
      label: 'Public offer live',
      done: onboarding.checkpoints.published_records > 0,
      detail: `${onboarding.checkpoints.published_records} published service record(s) are visible for discovery.`,
    },
    {
      id: 'billing',
      label: 'Billing and subscription posture',
      done:
        onboarding.checkpoints.has_billing_account && onboarding.checkpoints.has_active_subscription,
      detail:
        onboarding.checkpoints.has_billing_account
          ? onboarding.checkpoints.has_active_subscription
            ? 'Billing identity and an active or trialing subscription are both attached.'
            : 'Billing identity exists, but an active or trialing subscription is still missing.'
          : 'Billing identity is not configured yet.',
    },
  ];

  if (!session) {
    return {
      phase: 'verify_identity',
      headline: 'Verify tenant identity first',
      body: `Preview is available, but activation cannot start until a real tenant session exists. ${getVerticalHint(overview.tenant)}`,
      actionLabel: 'Open sign-in flow',
      actionPanel: null,
      statusTone: 'sky',
      checklist,
    };
  }

  if (!hasCompletedStep(onboarding, 'business_profile')) {
    return {
      phase: 'complete_profile',
      headline: futureSwim ? 'Complete the swim school profile' : 'Complete the business profile',
      body: `Set the workspace basics first so later catalog, billing, and reporting states have a stable tenant identity. ${getVerticalHint(overview.tenant)}`,
      actionLabel: futureSwim ? 'Open swim business profile' : 'Open experience studio',
      actionPanel: 'experience',
      statusTone: 'amber',
      checklist,
    };
  }

  if (onboarding.checkpoints.catalog_records < 1) {
    return {
      phase: 'add_catalog',
      headline: futureSwim ? 'Add the first lesson or class offer' : 'Add the first offer to activate this workspace',
      body: `This tenant still needs at least one real offer in the catalog before BookedAI can convert discovery into bookings or consultations. ${getVerticalHint(overview.tenant)}`,
      actionLabel: futureSwim ? 'Open lesson catalog' : 'Open catalog workspace',
      actionPanel: 'catalog',
      statusTone: 'amber',
      checklist,
    };
  }

  if (onboarding.checkpoints.published_records < 1) {
    return {
      phase: 'publish_offer',
      headline: futureSwim ? 'Publish one search-ready lesson' : 'Publish one search-ready offer',
      body: `Catalog data exists, but activation is still blocked until at least one service is publicly publishable. ${getVerticalHint(overview.tenant)}`,
      actionLabel: futureSwim ? 'Review publish-ready lessons' : 'Review publish-ready offers',
      actionPanel: 'catalog',
      statusTone: 'amber',
      checklist,
    };
  }

  if (!onboarding.checkpoints.has_billing_account) {
    return {
      phase: 'configure_billing',
      headline: 'Attach billing identity before paid rollout',
      body: 'Discovery and catalog setup are moving, but paid SaaS posture is still incomplete until billing identity and merchant mode are configured truthfully.',
      actionLabel: 'Open billing workspace',
      actionPanel: 'billing',
      statusTone: 'amber',
      checklist,
    };
  }

  if (!onboarding.checkpoints.has_active_subscription) {
    return {
      phase: 'start_subscription',
      headline: 'Start a trial or active subscription',
      body: 'The workspace now needs a live commercial state so BookedAI can connect operational usage to plan posture and future revenue proof.',
      actionLabel: 'Review plan and trial state',
      actionPanel: 'billing',
      statusTone: 'amber',
      checklist,
    };
  }

  return {
      phase: 'activation_complete',
    headline: futureSwim ? 'Future Swim activation baseline is complete' : 'Tenant activation baseline is complete',
    body: futureSwim
      ? 'This workspace has crossed the setup baseline. The next priority is proving monthly value through parent enquiries, lessons booked, lesson revenue, and retention-oriented reporting.'
      : 'This workspace has crossed the setup baseline. The next priority is proving monthly value through leads, bookings, paid revenue, and retention-oriented reporting.',
    actionLabel: 'Review workspace overview',
    actionPanel: 'overview',
    statusTone: 'emerald',
    checklist,
  };
}
