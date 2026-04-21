export type PricingPlanId = 'basic' | 'standard' | 'pro';

export type PricingOnboardingMode = 'online' | 'onsite';

export interface PricingConsultationRequest {
  plan_id: PricingPlanId;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  business_name: string;
  business_type: string;
  onboarding_mode: PricingOnboardingMode;
  startup_referral_eligible: boolean;
  referral_partner?: string | null;
  referral_location?: string | null;
  preferred_date: string;
  preferred_time: string;
  timezone: string;
  notes?: string | null;
  source_page?: string | null;
  source_section?: string | null;
  source_cta?: string | null;
  source_detail?: string | null;
  source_plan_id?: string | null;
  source_flow_mode?: string | null;
  source_path?: string | null;
  source_referrer?: string | null;
}

export interface PricingConsultationResponse {
  status: string;
  consultation_reference: string;
  plan_id: PricingPlanId;
  package_name?: string;
  plan_name: string;
  amount_aud: number;
  amount_label: string;
  preferred_date: string;
  preferred_time: string;
  timezone: string;
  onboarding_mode: PricingOnboardingMode;
  trial_days: number;
  trial_summary: string;
  startup_offer_applied: boolean;
  startup_offer_summary: string | null;
  onsite_travel_fee_note: string | null;
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string | null;
  email_status: 'sent' | 'pending_manual_followup';
}
