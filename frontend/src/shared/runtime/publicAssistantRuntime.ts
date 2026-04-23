import type { ApiChannel, DeploymentMode } from '../contracts/common';
import type { PublicBookingAssistantRuntimeConfig } from '../../components/landing/assistant/publicBookingAssistantV1';

type RuntimePresetInput = {
  channel?: ApiChannel;
  tenantRef?: string | null;
  deploymentMode?: DeploymentMode | null;
  widgetId?: string | null;
  source?: string;
  medium?: string | null;
  campaign?: string | null;
  surface?: string | null;
};

export const BOOKEDAI_PUBLIC_TENANT_REF = 'bookedai-au';

export function createPublicAssistantRuntimeConfig(
  input: RuntimePresetInput,
): PublicBookingAssistantRuntimeConfig {
  return {
    channel: input.channel ?? 'public_web',
    tenantRef: input.tenantRef ?? null,
    deploymentMode: input.deploymentMode ?? 'standalone_app',
    widgetId: input.widgetId ?? null,
    source: input.source ?? 'public_booking_assistant',
    medium: input.medium ?? 'website',
    campaign: input.campaign ?? 'public_booking_assistant',
    surface: input.surface ?? 'public_booking_assistant',
  };
}

export function createBookedAiHomepageRuntimeConfig() {
  return createPublicAssistantRuntimeConfig({
    channel: 'public_web',
    tenantRef: BOOKEDAI_PUBLIC_TENANT_REF,
    deploymentMode: 'standalone_app',
    widgetId: 'bookedai-homepage-live-read',
    source: 'bookedai_homepage',
    medium: 'bookedai_owned_website',
    campaign: 'bookedai_homepage_live_read',
    surface: 'bookedai_homepage_search_shell',
  });
}

export function createEmbeddedWidgetRuntimeConfig(input: {
  tenantRef: string;
  widgetId: string;
  source: string;
  medium?: string | null;
  campaign?: string | null;
  surface: string;
}) {
  return createPublicAssistantRuntimeConfig({
    channel: 'embedded_widget',
    tenantRef: input.tenantRef,
    deploymentMode: 'plugin_integrated',
    widgetId: input.widgetId,
    source: input.source,
    medium: input.medium ?? 'partner_website',
    campaign: input.campaign ?? `${input.widgetId}_embed`,
    surface: input.surface,
  });
}

export function getResultConfidencePresentation(service: {
  source_type?: string | null;
  booking_confidence?: string | null;
  trust_signal?: string | null;
}) {
  const sourceType = (service.source_type || 'service_catalog').trim().toLowerCase();
  const confidence = (service.booking_confidence || '').trim().toLowerCase();

  if (sourceType === 'service_catalog') {
    return {
      label: confidence ? `Tenant-managed • ${confidence}` : 'Tenant-managed result',
      body: 'Ranked from tenant-managed data, so BookedAI can keep a stronger booking path and confidence signal.',
      tone: 'tenant' as const,
    };
  }

  return {
    label: confidence ? `Live web read • ${confidence}` : 'Live web read result',
    body: 'Ranked from live-read web signals. Confidence can be lower than tenant-managed catalog data, so review details before booking.',
    tone: 'live_read' as const,
  };
}
