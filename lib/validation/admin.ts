import { z } from "zod";

export const adminAuthLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenantSlug: z.string().trim().optional(),
});

export const adminAuthSwitchTenantSchema = z.object({
  tenantId: z.string().trim().min(1, "Tenant is required"),
});

export const adminSupportImpersonationSchema = z.object({
  tenantId: z.string().trim().min(1, "Tenant is required"),
  reason: z.string().trim().max(240, "Reason must stay concise").optional().or(z.literal("")),
});

const userBaseSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid work email"),
  status: z.enum(["ACTIVE", "INVITED", "DISABLED"]).default("INVITED"),
  roleId: z.string().trim().optional().or(z.literal("")),
});

export const userMutationSchema = userBaseSchema;

export const userAccessMutationSchema = z.object({
  status: z.enum(["ACTIVE", "INVITED", "DISABLED"]),
  roleId: z.string().trim().optional().or(z.literal("")),
});

export const userRouteIdSchema = z.object({
  userId: z.string().trim().min(1, "User id is required"),
});

export const tenantSettingsMutationSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  locale: z.string().trim().min(1, "Locale is required"),
  currency: z.string().trim().min(3, "Currency is required").max(3, "Use ISO currency code"),
  logoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  introductionHtml: z.string().trim().optional().or(z.literal("")),
});

export const branchMutationSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Branch slug is required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  timezone: z.string().trim().min(1, "Timezone is required"),
});

export const branchRouteIdSchema = z.object({
  branchId: z.string().trim().min(1, "Branch id is required"),
});

export const branchStateMutationSchema = z.object({
  isActive: z.boolean(),
});

export const billingSettingsMutationSchema = z.object({
  provider: z.string().trim().min(1, "Provider is required"),
  externalId: z.string().trim().optional().or(z.literal("")),
  planCode: z.string().trim().min(1, "Plan code is required"),
  status: z.string().trim().min(1, "Status is required"),
  renewsAt: z.string().trim().optional().or(z.literal("")),
});

export const workspaceGuidesMutationSchema = z.object({
  overview: z.string().trim().optional().or(z.literal("")),
  experience: z.string().trim().optional().or(z.literal("")),
  catalog: z.string().trim().optional().or(z.literal("")),
  plugin: z.string().trim().optional().or(z.literal("")),
  bookings: z.string().trim().optional().or(z.literal("")),
  integrations: z.string().trim().optional().or(z.literal("")),
  billing: z.string().trim().optional().or(z.literal("")),
  team: z.string().trim().optional().or(z.literal("")),
});

export const billingGatewayControlsMutationSchema = z.object({
  merchantModeOverride: z
    .enum(["disabled", "test", "live", "production"])
    .optional()
    .or(z.literal("")),
  stripeCustomerId: z.string().trim().optional().or(z.literal("")),
  stripeCustomerEmail: z.string().trim().email("Enter a valid billing email").optional().or(z.literal("")),
});

export const pluginRuntimeControlsMutationSchema = z.object({
  partnerName: z.string().trim().optional().or(z.literal("")),
  partnerWebsiteUrl: z.string().trim().url("Enter a valid partner website URL").optional().or(z.literal("")),
  bookedaiHost: z.string().trim().url("Enter a valid BookedAI host URL").optional().or(z.literal("")),
  embedPath: z.string().trim().optional().or(z.literal("")),
  widgetScriptPath: z.string().trim().optional().or(z.literal("")),
  widgetId: z.string().trim().optional().or(z.literal("")),
  headline: z.string().trim().optional().or(z.literal("")),
  prompt: z.string().trim().optional().or(z.literal("")),
  accentColor: z.string().trim().optional().or(z.literal("")),
  buttonLabel: z.string().trim().optional().or(z.literal("")),
  modalTitle: z.string().trim().optional().or(z.literal("")),
  supportEmail: z.string().trim().email("Enter a valid support email").optional().or(z.literal("")),
  supportWhatsapp: z.string().trim().optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Enter a valid logo URL").optional().or(z.literal("")),
});

export const paymentMutationSchema = z.object({
  customerId: z.string().trim().min(1, "Customer is required"),
  bookingId: z.string().trim().optional().or(z.literal("")),
  provider: z.string().trim().min(1, "Provider is required"),
  amountCents: z.coerce.number().int().min(1, "Amount must be greater than zero"),
  currency: z.string().trim().min(3, "Currency is required").max(3, "Use ISO currency code"),
  status: z.enum(["pending", "paid", "failed", "refunded"]).default("pending"),
  paymentMethod: z.string().trim().optional().or(z.literal("")),
  externalPaymentId: z.string().trim().optional().or(z.literal("")),
  paidAt: z.string().trim().optional().or(z.literal("")),
});

export const paymentStatusMutationSchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded"]),
  paidAt: z.string().trim().optional().or(z.literal("")),
  refundedAt: z.string().trim().optional().or(z.literal("")),
});

export const paymentRouteIdSchema = z.object({
  paymentId: z.string().trim().min(1, "Payment id is required"),
});

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  status: z.string().trim().default("all"),
});

export const rolePermissionMutationSchema = z.object({
  permissionSlugs: z.array(z.string().trim().min(1)).default([]),
});

export const roleRouteIdSchema = z.object({
  roleId: z.string().trim().min(1, "Role id is required"),
});

export const auditLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  entityType: z.string().trim().default("all"),
});

const customerBaseSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  lifecycleStage: z.string().trim().min(1, "Lifecycle stage is required"),
  sourceLabel: z.string().trim().min(1, "Source is required"),
  tags: z.array(z.string().trim().min(1)).max(8).default([]),
  marketingConsent: z.boolean().default(false),
  notes: z.string().trim().optional(),
});

export const customerFormSchema = customerBaseSchema.refine((value) => Boolean(value.email?.trim()) || Boolean(value.phone?.trim()), {
  message: "Email or phone is required",
  path: ["email"],
});

export const customerMutationSchema = customerBaseSchema.refine(
  (value) => Boolean(value.email?.trim()) || Boolean(value.phone?.trim()),
  {
    message: "Email or phone is required",
    path: ["email"],
  },
);

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  stage: z.string().trim().default("all"),
  source: z.string().trim().default("all"),
  date_from: z.string().trim().optional().or(z.literal("")),
  date_to: z.string().trim().optional().or(z.literal("")),
  sort_by: z
    .enum(["updatedAt", "createdAt", "totalRevenueCents", "lastBookedAt"])
    .default("updatedAt"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const customerRouteIdSchema = z.object({
  customerId: z.string().trim().min(1, "Customer id is required"),
});

const leadBaseSchema = z.object({
  title: z.string().trim().min(1),
  source: z.string().trim().min(1),
  status: z.string().trim().min(1),
  pipelineStage: z.string().trim().min(1),
  score: z.coerce.number().int().min(0).max(100),
  estimatedValueCents: z.coerce.number().int().min(0),
  ownerName: z.string().trim().optional(),
  nextFollowUpAt: z.string().trim().optional().or(z.literal("")),
  lastContactAt: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const leadFormSchema = leadBaseSchema;
export const leadMutationSchema = leadBaseSchema;

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  status: z.string().trim().default("all"),
  pipeline_stage: z.string().trim().default("all"),
  owner: z.string().trim().default("all"),
  view: z.enum(["list", "kanban"]).default("list"),
  sort_by: z
    .enum(["updatedAt", "createdAt", "estimatedValueCents", "nextFollowUpAt"])
    .default("updatedAt"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const leadRouteIdSchema = z.object({
  leadId: z.string().trim().min(1, "Lead id is required"),
});

export const leadConvertBookingSchema = z.object({
  serviceId: z.string().trim().min(1, "Service is required"),
});

export const leadNoteMutationSchema = z.object({
  note: z.string().trim().min(1, "Note is required"),
  contactAt: z.string().trim().optional().or(z.literal("")),
});

export const leadFollowUpMutationSchema = z.object({
  nextFollowUpAt: z.string().trim().min(1, "Follow-up date is required"),
  ownerName: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

const serviceBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  durationMinutes: z.coerce.number().int().min(5, "Duration must be at least 5 minutes"),
  priceCents: z.coerce.number().int().min(0, "Price must be zero or greater"),
});

export const serviceFormSchema = serviceBaseSchema;
export const serviceMutationSchema = serviceBaseSchema;

export const serviceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  sort_by: z.enum(["updatedAt", "name", "priceCents", "durationMinutes"]).default("updatedAt"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const serviceRouteIdSchema = z.object({
  serviceId: z.string().trim().min(1, "Service id is required"),
});

const bookingBaseSchema = z.object({
  customerId: z.string().trim().min(1),
  serviceId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1),
  revenueCents: z.coerce.number().int().min(0),
  channel: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

export const bookingFormSchema = bookingBaseSchema.refine(
  (value) => new Date(value.startAt).getTime() < new Date(value.endAt).getTime(),
  {
    message: "End time must be after start time",
    path: ["endAt"],
  },
);

export const bookingMutationSchema = bookingFormSchema;

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  status: z.string().trim().default("all"),
  view: z.enum(["list", "calendar"]).default("list"),
  sort_by: z.enum(["startAt", "updatedAt", "revenueCents"]).default("startAt"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

export const bookingRouteIdSchema = z.object({
  bookingId: z.string().trim().min(1, "Booking id is required"),
});

export const bookingRescheduleSchema = z
  .object({
    startAt: z.string().trim().min(1),
    endAt: z.string().trim().min(1),
  })
  .refine((value) => new Date(value.startAt).getTime() < new Date(value.endAt).getTime(), {
    message: "End time must be after start time",
    path: ["endAt"],
  });

const campaignBaseSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required"),
  channel: z.string().trim().min(1, "Channel is required"),
  sourcePlatform: z.string().trim().min(1, "Source platform is required"),
  sourceKey: z.string().trim().min(1, "Source key is required"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).default("DRAFT"),
  budgetCents: z.coerce.number().int().min(0, "Budget must be zero or greater"),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
  utmSource: z.string().trim().optional().or(z.literal("")),
  utmMedium: z.string().trim().optional().or(z.literal("")),
  utmCampaign: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const campaignFormSchema = campaignBaseSchema.refine(
  (value) =>
    !value.startDate ||
    !value.endDate ||
    new Date(value.startDate).getTime() <= new Date(value.endDate).getTime(),
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

export const campaignMutationSchema = campaignFormSchema;

export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(""),
  status: z.string().trim().default("all"),
  channel: z.string().trim().default("all"),
  sort_by: z
    .enum(["updatedAt", "startDate", "budgetCents", "paidRevenueCents"])
    .default("updatedAt"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const campaignRouteIdSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required"),
});
