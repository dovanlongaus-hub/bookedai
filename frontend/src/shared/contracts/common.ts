export type DeploymentMode =
  | 'standalone_app'
  | 'embedded_widget'
  | 'plugin_integrated'
  | 'headless_api';

export type ApiChannel =
  | 'public_web'
  | 'embedded_widget'
  | 'tenant_app'
  | 'sms'
  | 'whatsapp'
  | 'admin';

export interface ApiActorContext {
  channel: ApiChannel;
  tenant_id?: string | null;
  tenant_ref?: string | null;
  actor_id?: string | null;
  role?: string | null;
  deployment_mode?: DeploymentMode | null;
}

export type FeatureFlagKey =
  | 'billing_webhook_shadow_mode'
  | 'new_booking_domain_dual_write'
  | 'crm_sync_v1_enabled'
  | 'email_template_engine_v1'
  | 'tenant_mode_enabled'
  | 'new_admin_bookings_view';

export interface DomainResult {
  status: 'ok' | 'pending' | 'error';
  message?: string | null;
}
