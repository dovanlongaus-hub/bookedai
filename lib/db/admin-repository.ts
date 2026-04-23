import { randomUUID } from "node:crypto";

import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

export type TenantOption = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  locale: string;
};

export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UserRecord = {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  status: string;
  roleIds: string[];
  roleNames: string[];
  primaryRoleId?: string;
  primaryRoleName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type RoleRecord = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  permissionSlugs: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type PermissionRecord = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TenantSettingsRecord = {
  tenantId: string;
  values: Record<string, unknown>;
};

export type TenantProfileRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type BranchRecord = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TenantBillingOverview = {
  tenantId: string;
  subscription: {
    id: string;
    provider: string;
    planCode: string;
    status: string;
    renewsAt?: string;
    externalId?: string;
  } | null;
  invoiceSummary: {
    totalInvoices: number;
    openInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalBilledCents: number;
    totalPaidCents: number;
    outstandingCents: number;
    currency: string;
  };
};

export type BranchMutationInput = {
  name: string;
  slug: string;
  timezone: string;
};

export type BillingSettingsMutationInput = {
  provider: string;
  externalId?: string;
  planCode: string;
  status: string;
  renewsAt?: string;
};

export type WorkspaceGuidesRecord = {
  overview: string;
  experience: string;
  catalog: string;
  plugin: string;
  bookings: string;
  integrations: string;
  billing: string;
  team: string;
};

export type WorkspaceGuidesMutationInput = Partial<WorkspaceGuidesRecord>;

export type BillingGatewayControlRecord = {
  merchantModeOverride?: string;
  stripeCustomerId?: string;
  stripeCustomerEmail?: string;
  lastSyncedAt?: string;
};

export type BillingGatewayControlMutationInput = {
  merchantModeOverride?: string;
  stripeCustomerId?: string;
  stripeCustomerEmail?: string;
};

export type PluginRuntimeControlRecord = {
  partnerName?: string;
  partnerWebsiteUrl?: string;
  bookedaiHost?: string;
  embedPath?: string;
  widgetScriptPath?: string;
  widgetId?: string;
  headline?: string;
  prompt?: string;
  accentColor?: string;
  buttonLabel?: string;
  modalTitle?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
  logoUrl?: string;
};

export type PluginRuntimeControlMutationInput = PluginRuntimeControlRecord;

export type UserMutationInput = {
  name?: string;
  email: string;
  status: string;
  roleId?: string;
};

export type UserAccessMutationInput = {
  status: string;
  roleId?: string;
};

export type TenantSettingsMutationInput = {
  name: string;
  timezone: string;
  locale: string;
  currency: string;
  logoUrl?: string;
  introductionHtml?: string;
};

export type PaymentListOptions = {
  tenantId: string;
  status?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type CustomerRecord = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  lifecycleStage: string;
  sourceLabel: string;
  tags: string[];
  marketingConsent: boolean;
  notes?: string;
  notesSummary?: string;
  totalBookings: number;
  totalRevenueCents: number;
  lastBookedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CustomerMutationInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  lifecycleStage: string;
  sourceLabel: string;
  tags: string[];
  marketingConsent: boolean;
  notes?: string;
};

export type CustomerListOptions = {
  tenantId: string;
  query?: string;
  lifecycleStage?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "updatedAt" | "createdAt" | "totalRevenueCents" | "lastBookedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type LeadRecord = {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  title: string;
  source: string;
  status: string;
  pipelineStage: string;
  score: number;
  estimatedValueCents: number;
  ownerName?: string;
  nextFollowUpAt?: string;
  lastContactAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type LeadMutationInput = {
  title: string;
  source: string;
  status: string;
  pipelineStage: string;
  score: number;
  estimatedValueCents: number;
  ownerName?: string;
  nextFollowUpAt?: string;
  lastContactAt?: string;
  notes?: string;
};

export type LeadListOptions = {
  tenantId: string;
  query?: string;
  status?: string;
  pipelineStage?: string;
  owner?: string;
  sortBy?: "updatedAt" | "createdAt" | "estimatedValueCents" | "nextFollowUpAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ServiceRecord = {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ServiceMutationInput = {
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type ServiceListOptions = {
  tenantId: string;
  query?: string;
  sortBy?: "updatedAt" | "name" | "priceCents" | "durationMinutes";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type CampaignRecord = {
  id: string;
  tenantId: string;
  name: string;
  channel: string;
  sourcePlatform: string;
  sourceKey: string;
  status: string;
  budgetCents: number;
  startDate?: string;
  endDate?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  notes?: string;
  sourcedLeads: number;
  sourcedCustomers: number;
  bookingsCount: number;
  paidRevenueCents: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CampaignMutationInput = {
  name: string;
  channel: string;
  sourcePlatform: string;
  sourceKey: string;
  status: string;
  budgetCents: number;
  startDate?: string;
  endDate?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  notes?: string;
};

export type CampaignListOptions = {
  tenantId: string;
  query?: string;
  status?: string;
  channel?: string;
  sortBy?: "updatedAt" | "startDate" | "budgetCents" | "paidRevenueCents";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type BookingRecord = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  status: string;
  startAt: string;
  endAt: string;
  revenueCents: number;
  channel: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type BookingMutationInput = {
  customerId: string;
  serviceId: string;
  status: string;
  startAt: string;
  endAt: string;
  revenueCents: number;
  channel: string;
  notes?: string;
};

export type BookingListOptions = {
  tenantId: string;
  query?: string;
  status?: string;
  sortBy?: "startAt" | "updatedAt" | "revenueCents";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type CustomerPaymentRecord = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  bookingId?: string;
  bookingLabel?: string;
  amountCents: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod?: string;
  externalPaymentId?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMutationInput = {
  customerId: string;
  bookingId?: string;
  provider: string;
  amountCents: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  externalPaymentId?: string;
  paidAt?: string;
};

export type PaymentStatusMutationInput = {
  status: string;
  paidAt?: string;
  refundedAt?: string;
};

export type RolePermissionMutationInput = {
  permissionSlugs: string[];
};

export type LeadNoteMutationInput = {
  note: string;
  contactAt?: string;
};

export type LeadFollowUpMutationInput = {
  nextFollowUpAt: string;
  ownerName?: string;
  note?: string;
};

export type AuditLogListOptions = {
  tenantId: string;
  entityType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogRecord = {
  id: string;
  tenantId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type ActivityTimelineItem = {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  entityType: string;
  tone?: "default" | "success" | "warning" | "info";
};

export type DashboardSummary = {
  pipelineValueCents: number;
  monthRevenueCents: number;
  outstandingRevenueCents: number;
  paidBookings: number;
  unpaidBookings: number;
  missedLeads: number;
  bookingConversionRate: number;
  activeCustomers: number;
  upcomingBookings: number;
};

export type DashboardRecentBooking = BookingRecord & {
  paymentStatus: string;
  paidValueCents: number;
  outstandingValueCents: number;
};

export type DashboardCollectionItem = DashboardRecentBooking & {
  overdueDays: number;
  agingBucket: "current" | "1_7_days" | "8_14_days" | "15_plus_days";
};

export type DashboardSnapshot = {
  summary: DashboardSummary;
  revenueSeries: Array<{ label: string; valueCents: number }>;
  agingSeries: Array<{ label: string; count: number; valueCents: number }>;
  bookingStatusSeries: Array<{ label: string; count: number }>;
  leadStageSeries: Array<{ label: string; count: number }>;
  overdueFollowUps: LeadRecord[];
  recentBookings: DashboardRecentBooking[];
  collectionQueue: DashboardCollectionItem[];
};

export type ReportsSnapshot = {
  summary: {
    paidRevenueCents: number;
    outstandingRevenueCents: number;
    recoveredRevenueCents: number;
    collectionCoverageRate: number;
    repeatRevenueCents: number;
    repeatCustomerRate: number;
  };
  paidUnpaidTrend: Array<{ label: string; paidCents: number; unpaidCents: number }>;
  recoveredRevenueSeries: Array<{ label: string; valueCents: number }>;
  agingSeries: Array<{ label: string; count: number; valueCents: number }>;
  collectionQueue: DashboardCollectionItem[];
  repeatRevenueSeries: Array<{ label: string; valueCents: number }>;
  sourceAttribution: Array<{ label: string; customerCount: number; revenueCents: number }>;
  retentionSegments: Array<{ label: string; customerCount: number; revenueCents: number }>;
  sourceFunnel: Array<{
    label: string;
    leadsCount: number;
    bookingsCount: number;
    paidRevenueCents: number;
    bookingConversionRate: number;
  }>;
};

export type ReportsFilterOptions = {
  source?: string;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
};

type QueryOptions = {
  tenantId: string;
  query?: string;
  lifecycleStage?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

type MockStore = {
  tenants: TenantOption[];
  users: UserRecord[];
  roles: RoleRecord[];
  settings: TenantSettingsRecord[];
  branches: BranchRecord[];
  subscriptions: Array<{
    id: string;
    tenantId: string;
    provider: string;
    externalId?: string;
    planCode: string;
    status: string;
    renewsAt?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;
  invoices: Array<{
    id: string;
    tenantId: string;
    subscriptionId?: string;
    provider: string;
    externalId?: string;
    amountCents: number;
    currency: string;
    status: string;
    dueAt?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  }>;
  customers: CustomerRecord[];
  leads: LeadRecord[];
  campaigns: CampaignRecord[];
  services: ServiceRecord[];
  bookings: BookingRecord[];
  payments: CustomerPaymentRecord[];
  auditLogs: AuditLogRecord[];
};

declare global {
  var __bookedaiAdminMockStore: MockStore | undefined;
}

function isoNow() {
  return new Date().toISOString();
}

function buildFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function summarizeNotes(notes?: string) {
  const value = notes?.trim();
  if (!value) {
    return undefined;
  }

  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

function appendTimestampedNote(existing: string | undefined, note: string, occurredAt?: string) {
  const cleanNote = note.trim();
  if (!cleanNote) {
    return existing;
  }

  const stamp = (occurredAt || isoNow()).slice(0, 16).replace("T", " ");
  const nextEntry = `[${stamp}] ${cleanNote}`;
  return existing?.trim() ? `${existing.trim()}\n\n${nextEntry}` : nextEntry;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTags(tags?: string[]) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}

function parseTagsJson(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function readSettingsObject(
  values: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = values[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

function mapCustomerRecord(customer: any): CustomerRecord {
  const bookings = Array.isArray(customer.bookings)
    ? customer.bookings.filter((booking: any) => !booking.deletedAt)
    : [];
  const sortedBookings = [...bookings].sort((left: any, right: any) =>
    String(right.startAt).localeCompare(String(left.startAt)),
  );

  return {
    id: customer.id,
    tenantId: customer.tenantId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName: customer.fullName || buildFullName(customer.firstName, customer.lastName),
    email: normalizeOptional(customer.email),
    phone: normalizeOptional(customer.phone),
    company: normalizeOptional(customer.company),
    lifecycleStage: customer.lifecycleStage,
    sourceLabel: normalizeOptional(customer.sourceLabel) ?? "manual_entry",
    tags: parseTagsJson(customer.tagsJson),
    marketingConsent: Boolean(customer.marketingConsent),
    notes: normalizeOptional(customer.notes),
    notesSummary: normalizeOptional(customer.notesSummary) ?? summarizeNotes(customer.notes ?? undefined),
    totalBookings: bookings.length || Number(customer.totalBookings || 0),
    totalRevenueCents:
      bookings.reduce((sum: number, booking: any) => sum + Number(booking.revenueCents || 0), 0) ||
      Number(customer.totalRevenueCents || 0),
    lastBookedAt:
      toIsoString(sortedBookings[0]?.startAt) ?? toIsoString(customer.lastBookedAt) ?? undefined,
    createdAt: toIsoString(customer.createdAt) ?? isoNow(),
    updatedAt: toIsoString(customer.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(customer.deletedAt) ?? null,
  };
}

function mapUserRecord(user: any): UserRecord {
  const assignedRoles = Array.isArray(user.assignedRoles) ? user.assignedRoles : [];
  const activeRoles = assignedRoles
    .filter((assignment: any) => !assignment.deletedAt && assignment.role && !assignment.role.deletedAt)
    .map((assignment: any) => assignment.role);

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: normalizeOptional(user.name),
    status: String(user.status),
    roleIds: activeRoles.map((role: any) => String(role.id)),
    roleNames: activeRoles.map((role: any) => String(role.name)),
    primaryRoleId: activeRoles[0]?.id ?? undefined,
    primaryRoleName: activeRoles[0]?.name ?? undefined,
    createdAt: toIsoString(user.createdAt) ?? isoNow(),
    updatedAt: toIsoString(user.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(user.deletedAt) ?? null,
  };
}

function mapRoleRecord(role: any): RoleRecord {
  const rolePermissions = Array.isArray(role.rolePermissions) ? role.rolePermissions : [];
  return {
    id: role.id,
    tenantId: role.tenantId,
    name: role.name,
    slug: role.slug,
    description: normalizeOptional(role.description),
    permissionSlugs: rolePermissions
      .map((item: any) => item.permission?.slug)
      .filter((value: unknown): value is string => typeof value === "string"),
    createdAt: toIsoString(role.createdAt) ?? isoNow(),
    updatedAt: toIsoString(role.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(role.deletedAt) ?? null,
  };
}

function mapPermissionRecord(permission: any): PermissionRecord {
  return {
    id: permission.id,
    tenantId: permission.tenantId,
    name: permission.name,
    slug: permission.slug,
    description: normalizeOptional(permission.description),
    category: normalizeOptional(permission.category),
    createdAt: toIsoString(permission.createdAt) ?? isoNow(),
    updatedAt: toIsoString(permission.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(permission.deletedAt) ?? null,
  };
}

function mapLeadRecord(lead: any): LeadRecord {
  return {
    id: lead.id,
    tenantId: lead.tenantId,
    customerId: lead.customerId ?? undefined,
    customerName: lead.customer?.fullName ?? undefined,
    title: lead.title,
    source: lead.source,
    status: String(lead.status),
    pipelineStage: lead.pipelineStage,
    score: Number(lead.score || 0),
    estimatedValueCents: Number(lead.estimatedValueCents || 0),
    ownerName: normalizeOptional(lead.ownerName),
    nextFollowUpAt: toIsoString(lead.nextFollowUpAt),
    lastContactAt: toIsoString(lead.lastContactAt),
    notes: normalizeOptional(lead.notes),
    createdAt: toIsoString(lead.createdAt) ?? isoNow(),
    updatedAt: toIsoString(lead.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(lead.deletedAt) ?? null,
  };
}

function mapCampaignRecord(campaign: any): CampaignRecord {
  return {
    id: campaign.id,
    tenantId: campaign.tenantId,
    name: campaign.name,
    channel: campaign.channel,
    sourcePlatform: campaign.sourcePlatform,
    sourceKey: campaign.sourceKey,
    status: String(campaign.status),
    budgetCents: Number(campaign.budgetCents || 0),
    startDate: toIsoString(campaign.startDate),
    endDate: toIsoString(campaign.endDate),
    utmSource: normalizeOptional(campaign.utmSource),
    utmMedium: normalizeOptional(campaign.utmMedium),
    utmCampaign: normalizeOptional(campaign.utmCampaign),
    notes: normalizeOptional(campaign.notes),
    sourcedLeads: Number(campaign.sourcedLeads || 0),
    sourcedCustomers: Number(campaign.sourcedCustomers || 0),
    bookingsCount: Number(campaign.bookingsCount || 0),
    paidRevenueCents: Number(campaign.paidRevenueCents || 0),
    createdAt: toIsoString(campaign.createdAt) ?? isoNow(),
    updatedAt: toIsoString(campaign.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(campaign.deletedAt) ?? null,
  };
}

function mapServiceRecord(service: any): ServiceRecord {
  return {
    id: service.id,
    tenantId: service.tenantId,
    name: service.name,
    durationMinutes: Number(service.durationMinutes || 0),
    priceCents: Number(service.priceCents || 0),
    currency: service.currency,
    isActive: Boolean(service.isActive),
    createdAt: toIsoString(service.createdAt) ?? isoNow(),
    updatedAt: toIsoString(service.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(service.deletedAt) ?? null,
  };
}

function mapBookingRecord(booking: any): BookingRecord {
  return {
    id: booking.id,
    tenantId: booking.tenantId,
    customerId: booking.customerId,
    customerName: booking.customer?.fullName ?? booking.customerName ?? "Unknown customer",
    serviceId: booking.serviceId,
    serviceName: booking.service?.name ?? booking.serviceName ?? "Unknown service",
    status: String(booking.status),
    startAt: toIsoString(booking.startAt) ?? isoNow(),
    endAt: toIsoString(booking.endAt) ?? isoNow(),
    revenueCents: Number(booking.revenueCents || 0),
    channel: booking.channel,
    notes: normalizeOptional(booking.notes),
    createdAt: toIsoString(booking.createdAt) ?? isoNow(),
    updatedAt: toIsoString(booking.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(booking.deletedAt) ?? null,
  };
}

function mapPaymentRecord(payment: any): CustomerPaymentRecord {
  return {
    id: payment.id,
    tenantId: payment.tenantId,
    customerId: payment.customerId,
    customerName: normalizeOptional(payment.customer?.fullName ?? payment.customerName),
    bookingId: payment.bookingId ?? undefined,
    bookingLabel:
      normalizeOptional(
        payment.booking?.service?.name ??
          payment.bookingLabel ??
          payment.booking?.serviceName,
      ) ?? undefined,
    amountCents: Number(payment.amountCents || 0),
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    paymentMethod: normalizeOptional(payment.paymentMethod),
    externalPaymentId: normalizeOptional(payment.externalPaymentId),
    paidAt: toIsoString(payment.paidAt),
    refundedAt: toIsoString(payment.refundedAt),
    createdAt: toIsoString(payment.createdAt) ?? isoNow(),
    updatedAt: toIsoString(payment.updatedAt) ?? isoNow(),
  };
}

function mapBranchRecord(branch: any): BranchRecord {
  return {
    id: branch.id,
    tenantId: branch.tenantId,
    name: branch.name,
    slug: branch.slug,
    timezone: branch.timezone,
    isActive: Boolean(branch.isActive),
    createdAt: toIsoString(branch.createdAt) ?? isoNow(),
    updatedAt: toIsoString(branch.updatedAt) ?? isoNow(),
    deletedAt: toIsoString(branch.deletedAt) ?? null,
  };
}

function getMockStore(): MockStore {
  if (!global.__bookedaiAdminMockStore) {
    global.__bookedaiAdminMockStore = {
      tenants: [
        {
          id: "tenant_harbour_glow",
          slug: "harbour-glow",
          name: "Harbour Glow Spa",
          timezone: "Australia/Sydney",
          locale: "en-AU",
        },
        {
          id: "tenant_metro_movers",
          slug: "metro-movers",
          name: "Metro Movers",
          timezone: "Australia/Melbourne",
          locale: "en-AU",
        },
      ],
      users: [
        {
          id: "user_admin_1",
          tenantId: "tenant_harbour_glow",
          email: "ops@harbour-glow.example",
          name: "BookedAI Operator",
          status: "ACTIVE",
          roleIds: ["role_tenant_admin"],
          roleNames: ["Tenant Admin"],
          primaryRoleId: "role_tenant_admin",
          primaryRoleName: "Tenant Admin",
          createdAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
      ],
      roles: [
        {
          id: "role_tenant_admin",
          tenantId: "tenant_harbour_glow",
          name: "Tenant Admin",
          slug: "tenant-admin",
          description: "Full workspace control.",
          permissionSlugs: ["dashboard.view", "customers.manage", "bookings.manage"],
          createdAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
      ],
      settings: [
        {
          tenantId: "tenant_harbour_glow",
          values: {
            branding: {
              logoUrl: "https://upload.bookedai.au/branding/harbour-glow/logo.svg",
              introductionHtml: "<p>Harbour Glow Spa drives premium booking conversion.</p>",
            },
            tenant_workspace: {
              guides: {
                overview:
                  "Review revenue, bookings, and next operator actions before changing downstream tenant workflows.",
                experience:
                  "Keep branding, intro HTML, and workspace identity aligned with the live tenant runtime.",
                catalog:
                  "Publish only services that are pricing-complete and booking-ready.",
                plugin:
                  "Treat plugin settings like production embed configuration, not marketing copy.",
                bookings:
                  "Keep booking follow-up tight around payment and schedule confidence.",
                integrations:
                  "Confirm provider posture and retry backlog before changing connected systems.",
                billing:
                  "Keep billing identity and collection posture ready for live Stripe operations.",
                team:
                  "Use least privilege and keep finance-sensitive access narrow.",
              },
            },
            billing_gateway: {
              merchantModeOverride: "live",
              stripeCustomerId: "cus_mock_harbour_glow",
              stripeCustomerEmail: "billing@harbour-glow.example",
              lastSyncedAt: "2026-04-21T09:00:00.000Z",
            },
            partner_plugin_interface: {
              partnerName: "Harbour Glow Spa",
              partnerWebsiteUrl: "https://harbourglow.example",
              bookedaiHost: "https://product.bookedai.au",
              embedPath: "/partner/harbour-glow/embed",
              widgetScriptPath: "/partner-plugins/ai-mentor-pro-widget.js",
              widgetId: "harbour-glow-plugin",
              headline: "Book Harbour Glow Spa through BookedAI",
              prompt: "Book Harbour Glow Spa through BookedAI",
              accentColor: "#1f7a6b",
              buttonLabel: "Book Harbour Glow",
              modalTitle: "Harbour Glow Spa",
              supportEmail: "support@harbourglow.example",
              supportWhatsapp: "+61400111222",
              logoUrl: "https://upload.bookedai.au/branding/harbour-glow/logo.svg",
            },
          },
        },
      ],
      branches: [
        {
          id: "branch_1",
          tenantId: "tenant_harbour_glow",
          name: "Harbour Glow Sydney CBD",
          slug: "sydney-cbd",
          timezone: "Australia/Sydney",
          isActive: true,
          createdAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "branch_2",
          tenantId: "tenant_harbour_glow",
          name: "Harbour Glow Bondi",
          slug: "bondi",
          timezone: "Australia/Sydney",
          isActive: true,
          createdAt: "2026-04-08T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
      ],
      subscriptions: [
        {
          id: "sub_1",
          tenantId: "tenant_harbour_glow",
          provider: "stripe",
          externalId: "sub_mock_harbour_glow",
          planCode: "pro",
          status: "active",
          renewsAt: "2026-05-01T00:00:00.000Z",
          createdAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
      ],
      invoices: [
        {
          id: "inv_1",
          tenantId: "tenant_harbour_glow",
          subscriptionId: "sub_1",
          provider: "stripe",
          externalId: "inv_mock_paid",
          amountCents: 12900,
          currency: "AUD",
          status: "paid",
          dueAt: "2026-04-15T00:00:00.000Z",
          paidAt: "2026-04-14T10:00:00.000Z",
          createdAt: "2026-04-10T09:00:00.000Z",
          updatedAt: "2026-04-14T10:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "inv_2",
          tenantId: "tenant_harbour_glow",
          subscriptionId: "sub_1",
          provider: "stripe",
          externalId: "inv_mock_open",
          amountCents: 12900,
          currency: "AUD",
          status: "open",
          dueAt: "2026-04-28T00:00:00.000Z",
          createdAt: "2026-04-21T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
      ],
      customers: [
        {
          id: "cust_1",
          tenantId: "tenant_harbour_glow",
          firstName: "Ava",
          lastName: "Morgan",
          fullName: "Ava Morgan",
          email: "ava@example.com",
          phone: "+61 400 111 111",
          company: "North Pier Legal",
          lifecycleStage: "vip",
          sourceLabel: "website_chat",
          tags: ["vip", "retention"],
          marketingConsent: true,
          notes: "Books quarterly executive treatment packages. Prefers Friday morning appointments and typically pays before arrival.",
          notesSummary: "Books quarterly executive treatment packages. Prefers Friday morning appointments and typically pays before arrival.",
          totalBookings: 6,
          totalRevenueCents: 83400,
          lastBookedAt: "2026-04-17T09:00:00.000Z",
          createdAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-21T09:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "cust_2",
          tenantId: "tenant_harbour_glow",
          firstName: "Leo",
          lastName: "Bennett",
          fullName: "Leo Bennett",
          email: "leo@example.com",
          phone: "+61 400 222 222",
          company: "Harbour Tech",
          lifecycleStage: "active",
          sourceLabel: "missed_call_recovery",
          tags: ["upsell", "reactivated"],
          marketingConsent: false,
          notes: "Lead converted from concierge callback. Needs a tighter follow-up loop when packages change.",
          notesSummary: "Lead converted from concierge callback. Needs a tighter follow-up loop when packages change.",
          totalBookings: 2,
          totalRevenueCents: 27800,
          lastBookedAt: "2026-04-15T12:00:00.000Z",
          createdAt: "2026-04-05T12:00:00.000Z",
          updatedAt: "2026-04-20T12:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "cust_3",
          tenantId: "tenant_harbour_glow",
          firstName: "Mia",
          lastName: "Walker",
          fullName: "Mia Walker",
          email: "mia@example.com",
          phone: "+61 400 333 333",
          company: "Waterside Studio",
          lifecycleStage: "at_risk",
          sourceLabel: "instagram_campaign",
          tags: ["follow_up", "high_value"],
          marketingConsent: true,
          notes: "Qualified through a launch campaign but has not confirmed the second booking yet.",
          notesSummary: "Qualified through a launch campaign but has not confirmed the second booking yet.",
          totalBookings: 1,
          totalRevenueCents: 18900,
          lastBookedAt: "2026-04-12T15:00:00.000Z",
          createdAt: "2026-04-10T15:00:00.000Z",
          updatedAt: "2026-04-21T16:00:00.000Z",
          deletedAt: null,
        },
      ],
      leads: [
        {
          id: "lead_1",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_3",
          customerName: "Mia Walker",
          title: "Wedding party package enquiry",
          source: "website_chat",
          status: "QUALIFIED",
          pipelineStage: "qualified",
          score: 86,
          estimatedValueCents: 220000,
          ownerName: "BookedAI SDR",
          nextFollowUpAt: "2026-04-23T10:00:00.000Z",
          lastContactAt: "2026-04-21T08:00:00.000Z",
          notes: "High-intent party booking for June.",
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-21T08:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "lead_2",
          tenantId: "tenant_harbour_glow",
          title: "Executive recovery package callback",
          source: "missed_call_recovery",
          status: "CONTACTED",
          pipelineStage: "follow_up",
          score: 72,
          estimatedValueCents: 27800,
          ownerName: "Amy Tran",
          nextFollowUpAt: "2026-04-24T02:30:00.000Z",
          lastContactAt: "2026-04-21T06:30:00.000Z",
          notes: "Requested lunchtime slots next week.",
          createdAt: "2026-04-19T09:30:00.000Z",
          updatedAt: "2026-04-21T07:15:00.000Z",
          deletedAt: null,
        },
        {
          id: "lead_3",
          tenantId: "tenant_harbour_glow",
          title: "VIP retention upsell",
          source: "referral",
          status: "PROPOSAL_SENT",
          pipelineStage: "proposal",
          score: 91,
          estimatedValueCents: 83400,
          ownerName: "BookedAI Operator",
          nextFollowUpAt: "2026-04-22T14:00:00.000Z",
          lastContactAt: "2026-04-21T12:30:00.000Z",
          notes: "Upsell path for quarterly package renewal.",
          createdAt: "2026-04-17T14:00:00.000Z",
          updatedAt: "2026-04-21T12:30:00.000Z",
          deletedAt: null,
        },
      ],
      campaigns: [
        {
          id: "camp_1",
          tenantId: "tenant_harbour_glow",
          name: "Instagram Glow Launch",
          channel: "paid_social",
          sourcePlatform: "instagram",
          sourceKey: "instagram_campaign",
          status: "ACTIVE",
          budgetCents: 750000,
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-04-30T23:59:59.000Z",
          utmSource: "instagram",
          utmMedium: "paid_social",
          utmCampaign: "glow-launch-apr",
          notes: "Drives premium facial and recovery-package enquiries into the April conversion push.",
          sourcedLeads: 1,
          sourcedCustomers: 1,
          bookingsCount: 1,
          paidRevenueCents: 18900,
          createdAt: "2026-04-01T08:00:00.000Z",
          updatedAt: "2026-04-21T08:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "camp_2",
          tenantId: "tenant_harbour_glow",
          name: "Missed Call Recovery Sprint",
          channel: "ops_reactivation",
          sourcePlatform: "telephony",
          sourceKey: "missed_call_recovery",
          status: "ACTIVE",
          budgetCents: 120000,
          startDate: "2026-04-10T00:00:00.000Z",
          endDate: "2026-04-30T23:59:59.000Z",
          utmSource: "ops",
          utmMedium: "callback",
          utmCampaign: "missed-call-sprint",
          notes: "Operational callback loop to recover leads that missed first contact.",
          sourcedLeads: 1,
          sourcedCustomers: 1,
          bookingsCount: 1,
          paidRevenueCents: 0,
          createdAt: "2026-04-10T08:00:00.000Z",
          updatedAt: "2026-04-21T10:00:00.000Z",
          deletedAt: null,
        },
      ],
      services: [
        {
          id: "svc_1",
          tenantId: "tenant_harbour_glow",
          name: "Signature Facial",
          durationMinutes: 60,
          priceCents: 13900,
          currency: "AUD",
          isActive: true,
          createdAt: "2026-04-10T08:00:00.000Z",
          updatedAt: "2026-04-20T08:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "svc_2",
          tenantId: "tenant_harbour_glow",
          name: "Executive Recovery Ritual",
          durationMinutes: 90,
          priceCents: 27800,
          currency: "AUD",
          isActive: true,
          createdAt: "2026-04-14T10:30:00.000Z",
          updatedAt: "2026-04-20T10:30:00.000Z",
          deletedAt: null,
        },
      ],
      bookings: [
        {
          id: "book_1",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_1",
          customerName: "Ava Morgan",
          serviceId: "svc_1",
          serviceName: "Signature Facial",
          status: "CONFIRMED",
          startAt: "2026-04-24T09:30:00.000Z",
          endAt: "2026-04-24T10:30:00.000Z",
          revenueCents: 13900,
          channel: "website",
          notes: "Confirmed online booking.",
          createdAt: "2026-04-21T08:00:00.000Z",
          updatedAt: "2026-04-21T08:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "book_2",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_2",
          customerName: "Leo Bennett",
          serviceId: "svc_2",
          serviceName: "Executive Recovery Ritual",
          status: "PENDING",
          startAt: "2026-04-26T11:30:00.000Z",
          endAt: "2026-04-26T13:00:00.000Z",
          revenueCents: 27800,
          channel: "phone",
          notes: "Waiting on confirmation call back.",
          createdAt: "2026-04-21T11:30:00.000Z",
          updatedAt: "2026-04-21T11:30:00.000Z",
          deletedAt: null,
        },
        {
          id: "book_3",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_3",
          customerName: "Mia Walker",
          serviceId: "svc_1",
          serviceName: "Signature Facial",
          status: "COMPLETED",
          startAt: "2026-04-12T15:00:00.000Z",
          endAt: "2026-04-12T16:00:00.000Z",
          revenueCents: 18900,
          channel: "instagram",
          notes: "Completed successfully.",
          createdAt: "2026-04-12T15:00:00.000Z",
          updatedAt: "2026-04-12T16:30:00.000Z",
          deletedAt: null,
        },
      ],
      payments: [
        {
          id: "pay_1",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_1",
          customerName: "Ava Morgan",
          bookingId: "book_1",
          bookingLabel: "Signature Facial",
          amountCents: 13900,
          currency: "AUD",
          status: "paid",
          provider: "stripe",
          paymentMethod: "card",
          externalPaymentId: "pi_seeded_ava",
          paidAt: "2026-04-21T09:05:00.000Z",
          createdAt: "2026-04-21T09:00:00.000Z",
          updatedAt: "2026-04-21T09:05:00.000Z",
        },
        {
          id: "pay_2",
          tenantId: "tenant_harbour_glow",
          customerId: "cust_3",
          customerName: "Mia Walker",
          bookingId: "book_3",
          bookingLabel: "Signature Facial",
          amountCents: 18900,
          currency: "AUD",
          status: "paid",
          provider: "stripe",
          paymentMethod: "card",
          externalPaymentId: "pi_seeded_mia",
          paidAt: "2026-04-12T16:10:00.000Z",
          createdAt: "2026-04-12T16:00:00.000Z",
          updatedAt: "2026-04-12T16:10:00.000Z",
        },
      ],
      auditLogs: [
        {
          id: "audit_1",
          tenantId: "tenant_harbour_glow",
          actorUserId: "user_admin",
          entityType: "customer",
          entityId: "cust_1",
          action: "customer.updated",
          summary: "Updated consent and notes for Ava Morgan.",
          createdAt: "2026-04-21T09:10:00.000Z",
        },
        {
          id: "audit_2",
          tenantId: "tenant_harbour_glow",
          actorUserId: "user_admin",
          entityType: "customer",
          entityId: "cust_2",
          action: "customer.created",
          summary: "Created Leo Bennett from missed-call recovery flow.",
          createdAt: "2026-04-05T12:05:00.000Z",
        },
      ],
    };
  }

  return global.__bookedaiAdminMockStore;
}

function paginate<T>(items: T[], page = 1, pageSize = 10): PaginationResult<T> {
  const safePage = Math.max(page, 1);
  const safeSize = Math.max(pageSize, 1);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / safeSize), 1);
  const start = (safePage - 1) * safeSize;

  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages,
  };
}

function matchesQuery(text: string, query?: string) {
  if (!query?.trim()) {
    return true;
  }

  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function matchesDateRange(value: string, dateFrom?: string, dateTo?: string) {
  if (dateFrom && value.slice(0, 10) < dateFrom) {
    return false;
  }

  if (dateTo && value.slice(0, 10) > dateTo) {
    return false;
  }

  return true;
}

function compareStrings(left?: string | null, right?: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function deriveBookingPaymentMetrics(
  booking: BookingRecord,
  payments: CustomerPaymentRecord[],
): Pick<DashboardRecentBooking, "paymentStatus" | "paidValueCents" | "outstandingValueCents"> {
  const linkedPayments = payments.filter((payment) => payment.bookingId === booking.id);
  const statuses = linkedPayments.map((payment) => payment.status);
  const paidValueCents = linkedPayments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const outstandingValueCents = Math.max(booking.revenueCents - paidValueCents, 0);

  let paymentStatus = "unlinked";
  if (paidValueCents >= booking.revenueCents && booking.revenueCents > 0) {
    paymentStatus = "paid";
  } else if (paidValueCents > 0) {
    paymentStatus = "partially_paid";
  } else if (statuses.includes("pending")) {
    paymentStatus = "pending";
  } else if (statuses.includes("failed")) {
    paymentStatus = "failed";
  } else if (statuses.includes("refunded")) {
    paymentStatus = "refunded";
  }

  return {
    paymentStatus,
    paidValueCents,
    outstandingValueCents,
  };
}

function deriveCollectionItem(
  booking: BookingRecord,
  payments: CustomerPaymentRecord[],
): DashboardCollectionItem {
  const metrics = deriveBookingPaymentMetrics(booking, payments);
  const overdueMs = Date.now() - new Date(booking.startAt).getTime();
  const overdueDays = metrics.outstandingValueCents > 0 ? Math.max(Math.floor(overdueMs / 86400000), 0) : 0;
  let agingBucket: DashboardCollectionItem["agingBucket"] = "current";

  if (overdueDays >= 15) {
    agingBucket = "15_plus_days";
  } else if (overdueDays >= 8) {
    agingBucket = "8_14_days";
  } else if (overdueDays >= 1) {
    agingBucket = "1_7_days";
  }

  return {
    ...booking,
    ...metrics,
    overdueDays,
    agingBucket,
  };
}

function enrichCampaignMetrics(
  campaign: CampaignRecord,
  leads: LeadRecord[],
  customers: CustomerRecord[],
  bookings: BookingRecord[],
  payments: CustomerPaymentRecord[],
): CampaignRecord {
  const sourceKey = campaign.sourceKey.trim().toLowerCase();
  const sourcedLeads = leads.filter((lead) => lead.source.trim().toLowerCase() === sourceKey);
  const sourcedCustomers = customers.filter(
    (customer) => customer.sourceLabel.trim().toLowerCase() === sourceKey,
  );
  const sourcedCustomerIds = new Set(sourcedCustomers.map((customer) => customer.id));
  const campaignBookings = bookings.filter((booking) => sourcedCustomerIds.has(booking.customerId));
  const campaignBookingIds = new Set(campaignBookings.map((booking) => booking.id));
  const paidRevenueCents = payments
    .filter((payment) => payment.status === "paid")
    .filter(
      (payment) =>
        (payment.bookingId && campaignBookingIds.has(payment.bookingId)) ||
        sourcedCustomerIds.has(payment.customerId),
    )
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return {
    ...campaign,
    sourcedLeads: sourcedLeads.length,
    sourcedCustomers: sourcedCustomers.length,
    bookingsCount: campaignBookings.length,
    paidRevenueCents,
  };
}

function sortTimeline(items: ActivityTimelineItem[]) {
  return [...items].sort((left, right) => compareStrings(right.occurredAt, left.occurredAt));
}

function sortCustomers(
  customers: CustomerRecord[],
  sortBy: CustomerListOptions["sortBy"] = "updatedAt",
  sortOrder: CustomerListOptions["sortOrder"] = "desc",
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...customers].sort((left, right) => {
    let value = 0;

    if (sortBy === "createdAt") {
      value = compareStrings(left.createdAt, right.createdAt);
    } else if (sortBy === "totalRevenueCents") {
      value = left.totalRevenueCents - right.totalRevenueCents;
    } else if (sortBy === "lastBookedAt") {
      value = compareStrings(left.lastBookedAt, right.lastBookedAt);
    } else {
      value = compareStrings(left.updatedAt, right.updatedAt);
    }

    return value * direction;
  });
}

function sortLeads(
  leads: LeadRecord[],
  sortBy: LeadListOptions["sortBy"] = "updatedAt",
  sortOrder: LeadListOptions["sortOrder"] = "desc",
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...leads].sort((left, right) => {
    let value = 0;

    if (sortBy === "createdAt") {
      value = compareStrings(left.createdAt, right.createdAt);
    } else if (sortBy === "estimatedValueCents") {
      value = left.estimatedValueCents - right.estimatedValueCents;
    } else if (sortBy === "nextFollowUpAt") {
      value = compareStrings(left.nextFollowUpAt, right.nextFollowUpAt);
    } else {
      value = compareStrings(left.updatedAt, right.updatedAt);
    }

    return value * direction;
  });
}

function sortServices(
  services: ServiceRecord[],
  sortBy: ServiceListOptions["sortBy"] = "updatedAt",
  sortOrder: ServiceListOptions["sortOrder"] = "desc",
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...services].sort((left, right) => {
    let value = 0;

    if (sortBy === "name") {
      value = compareStrings(left.name, right.name);
    } else if (sortBy === "priceCents") {
      value = left.priceCents - right.priceCents;
    } else if (sortBy === "durationMinutes") {
      value = left.durationMinutes - right.durationMinutes;
    } else {
      value = compareStrings(left.updatedAt, right.updatedAt);
    }

    return value * direction;
  });
}

function sortCampaigns(
  campaigns: CampaignRecord[],
  sortBy: CampaignListOptions["sortBy"] = "updatedAt",
  sortOrder: CampaignListOptions["sortOrder"] = "desc",
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...campaigns].sort((left, right) => {
    let value = 0;

    if (sortBy === "startDate") {
      value = compareStrings(left.startDate, right.startDate);
    } else if (sortBy === "budgetCents") {
      value = left.budgetCents - right.budgetCents;
    } else if (sortBy === "paidRevenueCents") {
      value = left.paidRevenueCents - right.paidRevenueCents;
    } else {
      value = compareStrings(left.updatedAt, right.updatedAt);
    }

    return value * direction;
  });
}

function sortBookings(
  bookings: BookingRecord[],
  sortBy: BookingListOptions["sortBy"] = "startAt",
  sortOrder: BookingListOptions["sortOrder"] = "asc",
) {
  const direction = sortOrder === "desc" ? -1 : 1;

  return [...bookings].sort((left, right) => {
    let value = 0;

    if (sortBy === "updatedAt") {
      value = compareStrings(left.updatedAt, right.updatedAt);
    } else if (sortBy === "revenueCents") {
      value = left.revenueCents - right.revenueCents;
    } else {
      value = compareStrings(left.startAt, right.startAt);
    }

    return value * direction;
  });
}

function mapTenantOptions() {
  return async (userId: string, role?: string): Promise<TenantOption[]> => {
    if (isDatabaseConfigured()) {
      const prisma = getPrismaClient();
      if (!prisma) {
        return getMockStore().tenants;
      }

      if (role === "PLATFORM_OWNER" || role === "SUPER_ADMIN") {
        const tenants = await prisma.tenant.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        });
        return tenants.map((tenant) => ({
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          timezone: tenant.timezone,
          locale: tenant.locale,
        }));
      }

      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null, tenant: { deletedAt: null } },
        include: { tenant: true },
      });

      if (user?.tenant) {
        return [
          {
            id: user.tenant.id,
            slug: user.tenant.slug,
            name: user.tenant.name,
            timezone: user.tenant.timezone,
            locale: user.tenant.locale,
          },
        ];
      }
    }

    return getMockStore().tenants;
  };
}

export function getAdminRepository() {
  const listTenantOptions = mapTenantOptions();

  return {
    listTenantOptions,
    async getTenantProfile(tenantId: string): Promise<TenantProfileRecord | null> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId, deletedAt: null },
          });

          if (!tenant) {
            return null;
          }

          return {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            status: String(tenant.status),
            timezone: tenant.timezone,
            locale: tenant.locale,
            currency: tenant.currency,
            createdAt: tenant.createdAt.toISOString(),
            updatedAt: tenant.updatedAt.toISOString(),
          };
        }
      }

      const tenant = getMockStore().tenants.find((item) => item.id === tenantId);
      if (!tenant) {
        return null;
      }

      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: "ACTIVE",
        timezone: tenant.timezone,
        locale: tenant.locale,
        currency: "AUD",
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: isoNow(),
      };
    },
    async listUsers(tenantId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const users = await prisma.user.findMany({
            where: { tenantId, deletedAt: null },
            include: {
              assignedRoles: {
                where: { deletedAt: null, role: { deletedAt: null } },
                include: { role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          });
          return users.map(mapUserRecord);
        }
      }

      return getMockStore().users.filter((user) => user.tenantId === tenantId && !user.deletedAt);
    },
    async listRoles(tenantId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const roles = await prisma.role.findMany({
            where: { tenantId, deletedAt: null },
            include: {
              rolePermissions: {
                where: { deletedAt: null, permission: { deletedAt: null } },
                include: { permission: true },
              },
            },
            orderBy: { createdAt: "asc" },
          });
          return roles.map(mapRoleRecord);
        }
      }

      return getMockStore().roles.filter((role) => role.tenantId === tenantId && !role.deletedAt);
    },
    async listPermissions(tenantId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const permissions = await prisma.permission.findMany({
            where: { tenantId, deletedAt: null },
            orderBy: [{ category: "asc" }, { slug: "asc" }],
          });
          return permissions.map(mapPermissionRecord);
        }
      }

      const slugs = Array.from(
        new Set(getMockStore().roles.filter((role) => role.tenantId === tenantId).flatMap((role) => role.permissionSlugs)),
      );
      return slugs.map((slug) => ({
        id: slug,
        tenantId,
        name: slug.replace(/[.:_-]/g, " "),
        slug,
        description: undefined,
        category: slug.split(/[.:]/)[0] || "general",
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: isoNow(),
        deletedAt: null,
      }));
    },
    async getTenantSettings(tenantId: string): Promise<TenantSettingsRecord> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const settings = await prisma.tenantSetting.findMany({
            where: { tenantId, deletedAt: null },
          });
          return {
            tenantId,
            values: Object.fromEntries(settings.map((setting) => [setting.key, setting.valueJson])),
          };
        }
      }

      return (
        getMockStore().settings.find((item) => item.tenantId === tenantId) ?? {
          tenantId,
          values: {},
        }
      );
    },
    async getWorkspaceGuides(tenantId: string): Promise<WorkspaceGuidesRecord> {
      const settings = await this.getTenantSettings(tenantId);
      const workspace = readSettingsObject(settings.values, "tenant_workspace");
      const guides = readSettingsObject(workspace, "guides");

      return {
        overview:
          normalizeOptional(guides.overview as string | undefined) ??
          "Review the live operating posture first: revenue capture, onboarding progress, and next actions.",
        experience:
          normalizeOptional(guides.experience as string | undefined) ??
          "Update tenant identity, imagery, and HTML introduction here so the workspace stays enterprise-ready.",
        catalog:
          normalizeOptional(guides.catalog as string | undefined) ??
          "Keep services complete, priced, and publish-ready before widening search exposure.",
        plugin:
          normalizeOptional(guides.plugin as string | undefined) ??
          "Use plugin controls for production embed posture and saved runtime snippets.",
        bookings:
          normalizeOptional(guides.bookings as string | undefined) ??
          "Monitor bookings, payment dependency, and follow-up confidence from one queue.",
        integrations:
          normalizeOptional(guides.integrations as string | undefined) ??
          "Treat provider posture as controlled infrastructure and confirm alerts before changing sync behavior.",
        billing:
          normalizeOptional(guides.billing as string | undefined) ??
          "Keep billing identity and collection readiness accurate so tenant operations stay commercially safe.",
        team:
          normalizeOptional(guides.team as string | undefined) ??
          "Manage roles with least-privilege discipline and keep finance access narrow.",
      };
    },
    async updateWorkspaceGuides(
      tenantId: string,
      payload: WorkspaceGuidesMutationInput,
      actorUserId: string,
    ): Promise<WorkspaceGuidesRecord> {
      const nextGuides = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, normalizeOptional(value)]),
      );

      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.tenantSetting.findFirst({
            where: { tenantId, key: "tenant_workspace" },
          });
          const existingWorkspace =
            existing?.valueJson && typeof existing.valueJson === "object" && !Array.isArray(existing.valueJson)
              ? (existing.valueJson as Record<string, unknown>)
              : {};
          const existingGuides = readSettingsObject(existingWorkspace, "guides");

          await prisma.tenantSetting.upsert({
            where: {
              tenantId_key: {
                tenantId,
                key: "tenant_workspace",
              },
            },
            update: {
              valueJson: {
                ...existingWorkspace,
                guides: {
                  ...existingGuides,
                  ...Object.fromEntries(
                    Object.entries(nextGuides).filter(([, value]) => typeof value === "string" && value),
                  ),
                },
              } as any,
              deletedAt: null,
            },
            create: {
              tenantId,
              key: "tenant_workspace",
              valueJson: {
                guides: Object.fromEntries(
                  Object.entries(nextGuides).filter(([, value]) => typeof value === "string" && value),
                ),
              } as any,
            },
          });
        }
      } else {
        const store = getMockStore();
        const existing = store.settings.find((item) => item.tenantId === tenantId);
        const existingValues = existing?.values ?? {};
        const existingWorkspace = readSettingsObject(existingValues, "tenant_workspace");
        const existingGuides = readSettingsObject(existingWorkspace, "guides");
        const nextValues = {
          ...existingValues,
          tenant_workspace: {
            ...existingWorkspace,
            guides: {
              ...existingGuides,
              ...Object.fromEntries(
                Object.entries(nextGuides).filter(([, value]) => typeof value === "string" && value),
              ),
            },
          },
        };
        if (existing) {
          existing.values = nextValues;
        } else {
          store.settings.push({ tenantId, values: nextValues });
        }
      }

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "tenant_settings",
        entityId: tenantId,
        action: "tenant.workspace_guides.updated",
        summary: "Updated workspace operational guides.",
        metadata: {
          keys: Object.keys(nextGuides).filter((key) => nextGuides[key] !== undefined),
        },
      });

      return this.getWorkspaceGuides(tenantId);
    },
    async getBillingGatewayControls(tenantId: string): Promise<BillingGatewayControlRecord> {
      const settings = await this.getTenantSettings(tenantId);
      const gateway = readSettingsObject(settings.values, "billing_gateway");
      return {
        merchantModeOverride: normalizeOptional(gateway.merchantModeOverride as string | undefined),
        stripeCustomerId: normalizeOptional(gateway.stripeCustomerId as string | undefined),
        stripeCustomerEmail: normalizeOptional(gateway.stripeCustomerEmail as string | undefined),
        lastSyncedAt: normalizeOptional(gateway.lastSyncedAt as string | undefined),
      };
    },
    async getPluginRuntimeControls(tenantId: string): Promise<PluginRuntimeControlRecord> {
      const settings = await this.getTenantSettings(tenantId);
      const plugin = readSettingsObject(settings.values, "partner_plugin_interface");
      return {
        partnerName: normalizeOptional(plugin.partnerName as string | undefined),
        partnerWebsiteUrl: normalizeOptional(plugin.partnerWebsiteUrl as string | undefined),
        bookedaiHost: normalizeOptional(plugin.bookedaiHost as string | undefined),
        embedPath: normalizeOptional(plugin.embedPath as string | undefined),
        widgetScriptPath: normalizeOptional(plugin.widgetScriptPath as string | undefined),
        widgetId: normalizeOptional(plugin.widgetId as string | undefined),
        headline: normalizeOptional(plugin.headline as string | undefined),
        prompt: normalizeOptional(plugin.prompt as string | undefined),
        accentColor: normalizeOptional(plugin.accentColor as string | undefined),
        buttonLabel: normalizeOptional(plugin.buttonLabel as string | undefined),
        modalTitle: normalizeOptional(plugin.modalTitle as string | undefined),
        supportEmail: normalizeOptional(plugin.supportEmail as string | undefined),
        supportWhatsapp: normalizeOptional(plugin.supportWhatsapp as string | undefined),
        logoUrl: normalizeOptional(plugin.logoUrl as string | undefined),
      };
    },
    async updateBillingGatewayControls(
      tenantId: string,
      payload: BillingGatewayControlMutationInput,
      actorUserId: string,
    ): Promise<BillingGatewayControlRecord> {
      const nextGateway = {
        merchantModeOverride: normalizeOptional(payload.merchantModeOverride),
        stripeCustomerId: normalizeOptional(payload.stripeCustomerId),
        stripeCustomerEmail: normalizeOptional(payload.stripeCustomerEmail),
        lastSyncedAt: isoNow(),
      };

      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.tenantSetting.findFirst({
            where: { tenantId, key: "billing_gateway" },
          });
          const existingGateway =
            existing?.valueJson && typeof existing.valueJson === "object" && !Array.isArray(existing.valueJson)
              ? (existing.valueJson as Record<string, unknown>)
              : {};

          await prisma.tenantSetting.upsert({
            where: {
              tenantId_key: {
                tenantId,
                key: "billing_gateway",
              },
            },
            update: {
              valueJson: {
                ...existingGateway,
                ...nextGateway,
              },
              deletedAt: null,
            },
            create: {
              tenantId,
              key: "billing_gateway",
              valueJson: nextGateway,
            },
          });
        }
      } else {
        const store = getMockStore();
        const existing = store.settings.find((item) => item.tenantId === tenantId);
        const existingValues = existing?.values ?? {};
        const existingGateway = readSettingsObject(existingValues, "billing_gateway");
        const nextValues = {
          ...existingValues,
          billing_gateway: {
            ...existingGateway,
            ...nextGateway,
          },
        };
        if (existing) {
          existing.values = nextValues;
        } else {
          store.settings.push({ tenantId, values: nextValues });
        }
      }

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "tenant_settings",
        entityId: tenantId,
        action: "tenant.billing_gateway.updated",
        summary: "Updated billing gateway controls.",
        metadata: nextGateway,
      });

      return this.getBillingGatewayControls(tenantId);
    },
    async updatePluginRuntimeControls(
      tenantId: string,
      payload: PluginRuntimeControlMutationInput,
      actorUserId: string,
    ): Promise<PluginRuntimeControlRecord> {
      const nextPlugin = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, normalizeOptional(value)]),
      );

      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.tenantSetting.findFirst({
            where: { tenantId, key: "partner_plugin_interface" },
          });
          const existingPlugin =
            existing?.valueJson && typeof existing.valueJson === "object" && !Array.isArray(existing.valueJson)
              ? (existing.valueJson as Record<string, unknown>)
              : {};

          await prisma.tenantSetting.upsert({
            where: {
              tenantId_key: {
                tenantId,
                key: "partner_plugin_interface",
              },
            },
            update: {
              valueJson: {
                ...existingPlugin,
                ...Object.fromEntries(
                  Object.entries(nextPlugin).filter(([, value]) => typeof value === "string" && value),
                ),
              } as any,
              deletedAt: null,
            },
            create: {
              tenantId,
              key: "partner_plugin_interface",
              valueJson: Object.fromEntries(
                Object.entries(nextPlugin).filter(([, value]) => typeof value === "string" && value),
              ) as any,
            },
          });
        }
      } else {
        const store = getMockStore();
        const existing = store.settings.find((item) => item.tenantId === tenantId);
        const existingValues = existing?.values ?? {};
        const existingPlugin = readSettingsObject(existingValues, "partner_plugin_interface");
        const nextValues = {
          ...existingValues,
          partner_plugin_interface: {
            ...existingPlugin,
            ...Object.fromEntries(
              Object.entries(nextPlugin).filter(([, value]) => typeof value === "string" && value),
            ),
          },
        };
        if (existing) {
          existing.values = nextValues;
        } else {
          store.settings.push({ tenantId, values: nextValues });
        }
      }

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "tenant_settings",
        entityId: tenantId,
        action: "tenant.plugin_runtime.updated",
        summary: "Updated plugin runtime controls.",
        metadata: {
          keys: Object.keys(nextPlugin).filter((key) => nextPlugin[key] !== undefined),
        },
      });

      return this.getPluginRuntimeControls(tenantId);
    },
    async listBranches(tenantId: string): Promise<BranchRecord[]> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const branches = await prisma.branch.findMany({
            where: { tenantId },
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
          });
          return branches.map(mapBranchRecord);
        }
      }

      return getMockStore()
        .branches.filter((branch) => branch.tenantId === tenantId)
        .sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
          }
          return left.name.localeCompare(right.name);
        });
    },
    async getBranchById(tenantId: string, branchId: string): Promise<BranchRecord | null> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const branch = await prisma.branch.findFirst({
            where: { tenantId, id: branchId },
          });
          return branch ? mapBranchRecord(branch) : null;
        }
      }

      return (
        getMockStore().branches.find((branch) => branch.tenantId === tenantId && branch.id === branchId) ?? null
      );
    },
    async createBranch(tenantId: string, payload: BranchMutationInput, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.branch.create({
            data: {
              tenantId,
              name: payload.name,
              slug: payload.slug,
              timezone: payload.timezone,
              isActive: true,
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "branch",
            entityId: created.id,
            action: "branch.created",
            summary: `Created branch ${created.name}.`,
            metadata: {
              slug: created.slug,
              timezone: created.timezone,
            },
          });
          return mapBranchRecord(created);
        }
      }

      const now = isoNow();
      const branch: BranchRecord = {
        id: randomUUID(),
        tenantId,
        name: payload.name,
        slug: payload.slug,
        timezone: payload.timezone,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const store = getMockStore();
      store.branches.unshift(branch);
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "branch",
        entityId: branch.id,
        action: "branch.created",
        summary: `Created branch ${branch.name}.`,
        metadata: {
          slug: branch.slug,
          timezone: branch.timezone,
        },
      });
      return branch;
    },
    async updateBranch(
      tenantId: string,
      branchId: string,
      payload: BranchMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.branch.findFirst({
            where: { tenantId, id: branchId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.branch.update({
            where: { id: branchId },
            data: {
              name: payload.name,
              slug: payload.slug,
              timezone: payload.timezone,
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "branch",
            entityId: updated.id,
            action: "branch.updated",
            summary: `Updated branch ${updated.name}.`,
            metadata: {
              before: {
                name: existing.name,
                slug: existing.slug,
                timezone: existing.timezone,
              },
              after: {
                name: updated.name,
                slug: updated.slug,
                timezone: updated.timezone,
              },
            },
          });
          return mapBranchRecord(updated);
        }
      }

      const store = getMockStore();
      const branch = store.branches.find((item) => item.tenantId === tenantId && item.id === branchId);
      if (!branch || branch.deletedAt) {
        return null;
      }

      const before = {
        name: branch.name,
        slug: branch.slug,
        timezone: branch.timezone,
      };
      branch.name = payload.name;
      branch.slug = payload.slug;
      branch.timezone = payload.timezone;
      branch.updatedAt = isoNow();
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "branch",
        entityId: branch.id,
        action: "branch.updated",
        summary: `Updated branch ${branch.name}.`,
        metadata: {
          before,
          after: {
            name: branch.name,
            slug: branch.slug,
            timezone: branch.timezone,
          },
        },
      });
      return branch;
    },
    async setBranchActiveState(
      tenantId: string,
      branchId: string,
      isActive: boolean,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.branch.findFirst({
            where: {
              tenantId,
              id: branchId,
              ...(isActive ? {} : { deletedAt: null }),
            },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.branch.update({
            where: { id: branchId },
            data: {
              isActive,
              deletedAt: isActive ? null : new Date(),
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "branch",
            entityId: updated.id,
            action: isActive ? "branch.reactivated" : "branch.archived",
            summary: `${isActive ? "Reactivated" : "Archived"} branch ${updated.name}.`,
          });
          return mapBranchRecord(updated);
        }
      }

      const store = getMockStore();
      const branch = store.branches.find((item) => item.tenantId === tenantId && item.id === branchId);
      if (!branch) {
        return null;
      }
      branch.isActive = isActive;
      branch.deletedAt = isActive ? null : isoNow();
      branch.updatedAt = isoNow();
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "branch",
        entityId: branch.id,
        action: isActive ? "branch.reactivated" : "branch.archived",
        summary: `${isActive ? "Reactivated" : "Archived"} branch ${branch.name}.`,
      });
      return branch;
    },
    async getTenantBillingOverview(tenantId: string): Promise<TenantBillingOverview> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const [subscription, invoices] = await Promise.all([
            prisma.subscription.findFirst({
              where: { tenantId, deletedAt: null },
              orderBy: [{ renewsAt: "desc" }, { createdAt: "desc" }],
            }),
            prisma.invoice.findMany({
              where: { tenantId, deletedAt: null },
              orderBy: { createdAt: "desc" },
            }),
          ]);

          const currency = invoices[0]?.currency ?? "AUD";
          const totalBilledCents = invoices.reduce((sum, invoice) => sum + Number(invoice.amountCents || 0), 0);
          const totalPaidCents = invoices
            .filter((invoice) => invoice.status === "paid")
            .reduce((sum, invoice) => sum + Number(invoice.amountCents || 0), 0);
          const openInvoices = invoices.filter((invoice) => invoice.status === "open").length;
          const paidInvoices = invoices.filter((invoice) => invoice.status === "paid").length;
          const overdueInvoices = invoices.filter((invoice) => {
            if (invoice.status === "paid" || !invoice.dueAt) {
              return false;
            }
            return invoice.dueAt.getTime() < Date.now();
          }).length;

          return {
            tenantId,
            subscription: subscription
              ? {
                  id: subscription.id,
                  provider: subscription.provider,
                  planCode: subscription.planCode,
                  status: subscription.status,
                  renewsAt: toIsoString(subscription.renewsAt),
                  externalId: normalizeOptional(subscription.externalId),
                }
              : null,
            invoiceSummary: {
              totalInvoices: invoices.length,
              openInvoices,
              paidInvoices,
              overdueInvoices,
              totalBilledCents,
              totalPaidCents,
              outstandingCents: Math.max(totalBilledCents - totalPaidCents, 0),
              currency,
            },
          };
        }
      }

      const store = getMockStore();
      const subscription =
        store.subscriptions
          .filter((item) => item.tenantId === tenantId && !item.deletedAt)
          .sort((left, right) => compareStrings(right.renewsAt, left.renewsAt))[0] ?? null;
      const invoices = store.invoices.filter((item) => item.tenantId === tenantId && !item.deletedAt);
      const currency = invoices[0]?.currency ?? "AUD";
      const totalBilledCents = invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0);
      const totalPaidCents = invoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + invoice.amountCents, 0);

      return {
        tenantId,
        subscription: subscription
          ? {
              id: subscription.id,
              provider: subscription.provider,
              planCode: subscription.planCode,
              status: subscription.status,
              renewsAt: subscription.renewsAt,
              externalId: subscription.externalId,
            }
          : null,
        invoiceSummary: {
          totalInvoices: invoices.length,
          openInvoices: invoices.filter((invoice) => invoice.status === "open").length,
          paidInvoices: invoices.filter((invoice) => invoice.status === "paid").length,
          overdueInvoices: invoices.filter((invoice) => {
            if (invoice.status === "paid" || !invoice.dueAt) {
              return false;
            }
            return new Date(invoice.dueAt).getTime() < Date.now();
          }).length,
          totalBilledCents,
          totalPaidCents,
          outstandingCents: Math.max(totalBilledCents - totalPaidCents, 0),
          currency,
        },
      };
    },
    async updateTenantBillingSettings(
      tenantId: string,
      payload: BillingSettingsMutationInput,
      actorUserId: string,
    ): Promise<TenantBillingOverview> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.subscription.findFirst({
            where: { tenantId, deletedAt: null },
            orderBy: [{ renewsAt: "desc" }, { createdAt: "desc" }],
          });

          if (existing) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: {
                provider: payload.provider,
                externalId: normalizeOptional(payload.externalId) ?? null,
                planCode: payload.planCode,
                status: payload.status,
                renewsAt: payload.renewsAt ? new Date(payload.renewsAt) : null,
              },
            });
          } else {
            await prisma.subscription.create({
              data: {
                tenantId,
                provider: payload.provider,
                externalId: normalizeOptional(payload.externalId) ?? null,
                planCode: payload.planCode,
                status: payload.status,
                renewsAt: payload.renewsAt ? new Date(payload.renewsAt) : null,
              },
            });
          }
        }
      } else {
        const store = getMockStore();
        const existing = store.subscriptions.find((item) => item.tenantId === tenantId && !item.deletedAt);
        if (existing) {
          existing.provider = payload.provider;
          existing.externalId = normalizeOptional(payload.externalId);
          existing.planCode = payload.planCode;
          existing.status = payload.status;
          existing.renewsAt = normalizeOptional(payload.renewsAt);
          existing.updatedAt = isoNow();
        } else {
          store.subscriptions.unshift({
            id: randomUUID(),
            tenantId,
            provider: payload.provider,
            externalId: normalizeOptional(payload.externalId),
            planCode: payload.planCode,
            status: payload.status,
            renewsAt: normalizeOptional(payload.renewsAt),
            createdAt: isoNow(),
            updatedAt: isoNow(),
            deletedAt: null,
          });
        }
      }

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "subscription",
        entityId: tenantId,
        action: "tenant.billing.updated",
        summary: `Updated billing baseline to ${payload.planCode} (${payload.status}).`,
        metadata: {
          provider: payload.provider,
          planCode: payload.planCode,
          status: payload.status,
          renewsAt: payload.renewsAt,
        },
      });

      return this.getTenantBillingOverview(tenantId);
    },
    async listPayments(options: PaymentListOptions): Promise<PaginationResult<CustomerPaymentRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const payments = await prisma.payment.findMany({
            where: { tenantId: options.tenantId, deletedAt: null },
            include: {
              customer: true,
              booking: {
                include: { service: true },
              },
            },
            orderBy: { createdAt: "desc" },
          });
          const filtered = payments
            .map(mapPaymentRecord)
            .filter((payment) =>
              options.status && options.status !== "all" ? payment.status === options.status : true,
            )
            .filter((payment) =>
              matchesQuery(
                `${payment.provider} ${payment.status} ${payment.paymentMethod ?? ""} ${payment.externalPaymentId ?? ""}`,
                options.query,
              ),
            );

          return paginate(filtered, options.page, options.pageSize);
        }
      }

      const filtered = getMockStore()
        .payments.filter((payment) => payment.tenantId === options.tenantId)
        .filter((payment) =>
          options.status && options.status !== "all" ? payment.status === options.status : true,
        )
        .filter((payment) =>
          matchesQuery(
            `${payment.provider} ${payment.status} ${payment.paymentMethod ?? ""} ${payment.externalPaymentId ?? ""}`,
            options.query,
          ),
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return paginate(filtered, options.page, options.pageSize);
    },
    async createUser(tenantId: string, payload: UserMutationInput, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.user.create({
            data: {
              tenantId,
              email: payload.email.trim().toLowerCase(),
              name: normalizeOptional(payload.name) || payload.email.trim().toLowerCase(),
              status: payload.status as any,
            },
            include: {
              assignedRoles: {
                where: { deletedAt: null, role: { deletedAt: null } },
                include: { role: true },
              },
            },
          });

          if (payload.roleId) {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId: created.id,
                roleId: payload.roleId,
              },
            });
          }

          const refreshed = await prisma.user.findFirst({
            where: { id: created.id, tenantId, deletedAt: null },
            include: {
              assignedRoles: {
                where: { deletedAt: null, role: { deletedAt: null } },
                include: { role: true },
              },
            },
          });

          const record = mapUserRecord(refreshed ?? created);
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "user",
            entityId: record.id,
            action: "user.created",
            summary: `Created team member ${record.name || record.email}.`,
            metadata: {
              email: record.email,
              status: record.status,
              primaryRoleId: record.primaryRoleId,
            },
          });
          return record;
        }
      }

      const store = getMockStore();
      const created: UserRecord = {
        id: randomUUID(),
        tenantId,
        email: payload.email.trim().toLowerCase(),
        name: normalizeOptional(payload.name) || payload.email.trim().toLowerCase(),
        status: payload.status,
        roleIds: payload.roleId ? [payload.roleId] : [],
        roleNames: payload.roleId
          ? store.roles.filter((role) => role.id === payload.roleId).map((role) => role.name)
          : [],
        primaryRoleId: payload.roleId,
        primaryRoleName: payload.roleId
          ? store.roles.find((role) => role.id === payload.roleId)?.name
          : undefined,
        createdAt: isoNow(),
        updatedAt: isoNow(),
        deletedAt: null,
      };
      store.users.unshift(created);
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "user",
        entityId: created.id,
        action: "user.created",
        summary: `Created team member ${created.name || created.email}.`,
        metadata: {
          email: created.email,
          status: created.status,
          primaryRoleId: created.primaryRoleId,
        },
      });
      return created;
    },
    async updateUserAccess(
      tenantId: string,
      userId: string,
      payload: UserAccessMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null },
            include: {
              assignedRoles: {
                where: { deletedAt: null },
                include: { role: true },
              },
            },
          });

          if (!existing) {
            return null;
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              status: payload.status as any,
            },
          });

          await prisma.userRole.updateMany({
            where: { tenantId, userId, deletedAt: null },
            data: { deletedAt: new Date() },
          });

          if (payload.roleId) {
            await prisma.userRole.create({
              data: {
                tenantId,
                userId,
                roleId: payload.roleId,
              },
            });
          }

          const refreshed = await prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null },
            include: {
              assignedRoles: {
                where: { deletedAt: null, role: { deletedAt: null } },
                include: { role: true },
              },
            },
          });

          if (!refreshed) {
            return null;
          }

          const record = mapUserRecord(refreshed);
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "user",
            entityId: record.id,
            action: "user.access.updated",
            summary: `Updated access for ${record.name || record.email}.`,
            metadata: {
              status: record.status,
              primaryRoleId: record.primaryRoleId,
            },
          });
          return record;
        }
      }

      const store = getMockStore();
      const existing = store.users.find((user) => user.id === userId && user.tenantId === tenantId && !user.deletedAt);
      if (!existing) {
        return null;
      }
      const role = payload.roleId ? store.roles.find((item) => item.id === payload.roleId) : undefined;
      existing.status = payload.status;
      existing.roleIds = payload.roleId ? [payload.roleId] : [];
      existing.roleNames = role ? [role.name] : [];
      existing.primaryRoleId = payload.roleId;
      existing.primaryRoleName = role?.name;
      existing.updatedAt = isoNow();
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "user",
        entityId: existing.id,
        action: "user.access.updated",
        summary: `Updated access for ${existing.name || existing.email}.`,
        metadata: {
          status: existing.status,
          primaryRoleId: existing.primaryRoleId,
        },
      });
      return existing;
    },
    async updateTenantWorkspaceSettings(
      tenantId: string,
      payload: TenantSettingsMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              name: payload.name,
              timezone: payload.timezone,
              locale: payload.locale,
              currency: payload.currency,
            },
          });

          await prisma.tenantSetting.upsert({
            where: {
              tenantId_key: {
                tenantId,
                key: "branding",
              },
            },
            update: {
              valueJson: {
                logoUrl: normalizeOptional(payload.logoUrl) ?? null,
                introductionHtml: normalizeOptional(payload.introductionHtml) ?? "",
              },
              deletedAt: null,
            },
            create: {
              tenantId,
              key: "branding",
              valueJson: {
                logoUrl: normalizeOptional(payload.logoUrl) ?? null,
                introductionHtml: normalizeOptional(payload.introductionHtml) ?? "",
              },
            },
          });

          const [profile, settings] = await Promise.all([
            this.getTenantProfile(tenantId),
            this.getTenantSettings(tenantId),
          ]);

          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "tenant_settings",
            entityId: tenantId,
            action: "tenant.settings.updated",
            summary: `Updated workspace profile and branding for ${payload.name}.`,
            metadata: {
              timezone: payload.timezone,
              locale: payload.locale,
              currency: payload.currency,
            },
          });

          return {
            profile,
            settings,
          };
        }
      }

      const store = getMockStore();
      const tenant = store.tenants.find((item) => item.id === tenantId);
      if (tenant) {
        tenant.name = payload.name;
        tenant.timezone = payload.timezone;
        tenant.locale = payload.locale;
      }

      const existing = store.settings.find((item) => item.tenantId === tenantId);
      const existingValues = existing?.values ?? {};
      const nextValues = {
        ...existingValues,
        branding: {
          logoUrl: normalizeOptional(payload.logoUrl) ?? "",
          introductionHtml: normalizeOptional(payload.introductionHtml) ?? "",
        },
      };

      if (existing) {
        existing.values = nextValues;
      } else {
        store.settings.push({ tenantId, values: nextValues });
      }

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "tenant_settings",
        entityId: tenantId,
        action: "tenant.settings.updated",
        summary: `Updated workspace profile and branding for ${payload.name}.`,
        metadata: {
          timezone: payload.timezone,
          locale: payload.locale,
          currency: payload.currency,
        },
      });

      return {
        profile: await this.getTenantProfile(tenantId),
        settings: await this.getTenantSettings(tenantId),
      };
    },
    async createPayment(
      tenantId: string,
      payload: PaymentMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.payment.create({
            data: {
              tenantId,
              customerId: payload.customerId,
              bookingId: payload.bookingId || null,
              provider: payload.provider,
              amountCents: payload.amountCents,
              currency: payload.currency,
              status: payload.status,
              paymentMethod: normalizeOptional(payload.paymentMethod) || null,
              externalPaymentId: normalizeOptional(payload.externalPaymentId) || null,
              paidAt:
                payload.paidAt || payload.status === "paid"
                  ? new Date(payload.paidAt || isoNow())
                  : null,
            },
            include: {
              customer: true,
              booking: {
                include: { service: true },
              },
            },
          });

          const record = mapPaymentRecord(created);
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "payment",
            entityId: record.id,
            action: "payment.created",
            summary: `Recorded ${record.status} payment via ${record.provider}.`,
            metadata: {
              amountCents: record.amountCents,
              currency: record.currency,
              customerId: record.customerId,
            },
          });
          return record;
        }
      }

      const store = getMockStore();
      const customer = store.customers.find((item) => item.id === payload.customerId);
      const booking = payload.bookingId ? store.bookings.find((item) => item.id === payload.bookingId) : undefined;
      const created: CustomerPaymentRecord = {
        id: randomUUID(),
        tenantId,
        customerId: payload.customerId,
        customerName: customer?.fullName,
        bookingId: payload.bookingId,
        bookingLabel: booking?.serviceName,
        amountCents: payload.amountCents,
        currency: payload.currency,
        status: payload.status,
        provider: payload.provider,
        paymentMethod: normalizeOptional(payload.paymentMethod),
        externalPaymentId: normalizeOptional(payload.externalPaymentId),
        paidAt: normalizeOptional(payload.paidAt),
        refundedAt: payload.status === "refunded" ? isoNow() : undefined,
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };
      if (created.status === "paid" && !created.paidAt) {
        created.paidAt = isoNow();
      }
      store.payments.unshift(created);
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "payment",
        entityId: created.id,
        action: "payment.created",
        summary: `Recorded ${created.status} payment via ${created.provider}.`,
        metadata: {
          amountCents: created.amountCents,
          currency: created.currency,
          customerId: created.customerId,
        },
      });
      return created;
    },
    async updatePaymentStatus(
      tenantId: string,
      paymentId: string,
      payload: PaymentStatusMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.payment.findFirst({
            where: { id: paymentId, tenantId, deletedAt: null },
          });

          if (!existing) {
            return null;
          }

          const updated = await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: payload.status,
              paidAt:
                payload.status === "paid"
                  ? new Date(payload.paidAt || toIsoString(existing.paidAt) || isoNow())
                  : existing.paidAt,
              refundedAt:
                payload.status === "refunded"
                  ? new Date(payload.refundedAt || toIsoString(existing.refundedAt) || isoNow())
                  : existing.refundedAt,
            },
            include: {
              customer: true,
              booking: {
                include: { service: true },
              },
            },
          });

          const record = mapPaymentRecord(updated);
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "payment",
            entityId: record.id,
            action: "payment.status.updated",
            summary: `Updated payment ${record.id} to ${record.status}.`,
            metadata: {
              status: record.status,
              paidAt: record.paidAt,
              refundedAt: record.refundedAt,
            },
          });
          return record;
        }
      }

      const existing = getMockStore().payments.find(
        (payment) => payment.id === paymentId && payment.tenantId === tenantId,
      );
      if (!existing) {
        return null;
      }
      existing.status = payload.status;
      existing.paidAt =
        payload.status === "paid"
          ? normalizeOptional(payload.paidAt) ?? existing.paidAt ?? isoNow()
          : existing.paidAt;
      existing.refundedAt =
        payload.status === "refunded"
          ? normalizeOptional(payload.refundedAt) ?? existing.refundedAt ?? isoNow()
          : existing.refundedAt;
      existing.updatedAt = isoNow();
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "payment",
        entityId: existing.id,
        action: "payment.status.updated",
        summary: `Updated payment ${existing.id} to ${existing.status}.`,
        metadata: {
          status: existing.status,
          paidAt: existing.paidAt,
          refundedAt: existing.refundedAt,
        },
      });
      return existing;
    },
    async updateRolePermissions(
      tenantId: string,
      roleId: string,
      payload: RolePermissionMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const role = await prisma.role.findFirst({
            where: { id: roleId, tenantId, deletedAt: null },
          });

          if (!role) {
            return null;
          }

          const permissions = await prisma.permission.findMany({
            where: {
              tenantId,
              deletedAt: null,
              slug: { in: payload.permissionSlugs },
            },
          });

          await prisma.rolePermission.updateMany({
            where: { tenantId, roleId, deletedAt: null },
            data: { deletedAt: new Date() },
          });

          if (permissions.length) {
            await prisma.rolePermission.createMany({
              data: permissions.map((permission) => ({
                tenantId,
                roleId,
                permissionId: permission.id,
              })),
            });
          }

          const refreshed = await prisma.role.findFirst({
            where: { id: roleId, tenantId, deletedAt: null },
            include: {
              rolePermissions: {
                where: { deletedAt: null, permission: { deletedAt: null } },
                include: { permission: true },
              },
            },
          });

          if (!refreshed) {
            return null;
          }

          const record = mapRoleRecord(refreshed);
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "role",
            entityId: roleId,
            action: "role.permissions.updated",
            summary: `Updated permissions for ${record.name}.`,
            metadata: {
              permissionSlugs: record.permissionSlugs,
            },
          });
          return record;
        }
      }

      const role = getMockStore().roles.find((item) => item.id === roleId && item.tenantId === tenantId && !item.deletedAt);
      if (!role) {
        return null;
      }
      role.permissionSlugs = [...new Set(payload.permissionSlugs)].sort();
      role.updatedAt = isoNow();
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "role",
        entityId: roleId,
        action: "role.permissions.updated",
        summary: `Updated permissions for ${role.name}.`,
        metadata: {
          permissionSlugs: role.permissionSlugs,
        },
      });
      return role;
    },
    async appendAuditLog(input: {
      tenantId: string;
      actorUserId?: string;
      entityType: string;
      entityId: string;
      action: string;
      summary: string;
      metadata?: Record<string, unknown>;
    }) {
      const now = new Date().toISOString();

      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.auditLog.create({
            data: {
              tenantId: input.tenantId,
              actorUserId: input.actorUserId || null,
              entityType: input.entityType,
              entityId: input.entityId,
              action: input.action,
              metadataJson: {
                summary: input.summary,
                ...(input.metadata ?? {}),
              },
            },
          });

          return {
            id: created.id,
            tenantId: created.tenantId,
            actorUserId: created.actorUserId || undefined,
            entityType: created.entityType,
            entityId: created.entityId,
            action: created.action,
            summary: input.summary,
            createdAt: created.createdAt.toISOString(),
            metadata: input.metadata,
          } satisfies AuditLogRecord;
        }
      }

      const entry: AuditLogRecord = {
        id: randomUUID(),
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        summary: input.summary,
        createdAt: now,
        metadata: input.metadata,
      };

      getMockStore().auditLogs.unshift(entry);
      return entry;
    },
    async getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
      if (isDatabaseConfigured()) {
        const [leadsResult, bookingsResult, customersResult, paymentsResult] = await Promise.all([
          this.listLeads({ tenantId, page: 1, pageSize: 1000 }),
          this.listBookings({ tenantId, page: 1, pageSize: 1000 }),
          this.listCustomers({ tenantId, page: 1, pageSize: 1000 }),
          this.listPayments({ tenantId, page: 1, pageSize: 1000 }),
        ]);
        const paidPayments = paymentsResult.items.filter((payment) => payment.status === "paid");
        const bookingPaymentMetrics = bookingsResult.items.map((booking) =>
          deriveBookingPaymentMetrics(booking, paymentsResult.items),
        );

        return {
          pipelineValueCents: leadsResult.items.reduce((sum, lead) => sum + lead.estimatedValueCents, 0),
          monthRevenueCents: paidPayments.reduce((sum, payment) => sum + payment.amountCents, 0),
          outstandingRevenueCents: bookingPaymentMetrics.reduce(
            (sum, booking) => sum + booking.outstandingValueCents,
            0,
          ),
          paidBookings: bookingPaymentMetrics.filter((booking) => booking.paymentStatus === "paid").length,
          unpaidBookings: bookingPaymentMetrics.filter((booking) => booking.outstandingValueCents > 0).length,
          missedLeads: leadsResult.items.filter((lead) => lead.status === "NEW").length,
          bookingConversionRate: leadsResult.items.length
            ? bookingsResult.items.length / leadsResult.items.length
            : 0,
          activeCustomers: customersResult.items.length,
          upcomingBookings: bookingsResult.items.filter((booking) => booking.status !== "CANCELLED").length,
        };
      }

      const store = getMockStore();
      const tenantLeads = store.leads.filter((lead) => lead.tenantId === tenantId);
      const tenantBookings = store.bookings.filter((booking) => booking.tenantId === tenantId);
      const tenantPayments = store.payments.filter(
        (payment) => payment.tenantId === tenantId && payment.status === "paid",
      );
      const bookingPaymentMetrics = tenantBookings.map((booking) =>
        deriveBookingPaymentMetrics(booking, store.payments.filter((payment) => payment.tenantId === tenantId)),
      );
      const tenantCustomers = store.customers.filter(
        (customer) => customer.tenantId === tenantId && !customer.deletedAt,
      );
      return {
        pipelineValueCents: tenantLeads.reduce((sum, lead) => sum + lead.estimatedValueCents, 0),
        monthRevenueCents: tenantPayments.reduce((sum, payment) => sum + payment.amountCents, 0),
        outstandingRevenueCents: bookingPaymentMetrics.reduce(
          (sum, booking) => sum + booking.outstandingValueCents,
          0,
        ),
        paidBookings: bookingPaymentMetrics.filter((booking) => booking.paymentStatus === "paid").length,
        unpaidBookings: bookingPaymentMetrics.filter((booking) => booking.outstandingValueCents > 0).length,
        missedLeads: tenantLeads.filter((lead) => lead.status === "NEW").length,
        bookingConversionRate: tenantLeads.length ? tenantBookings.length / tenantLeads.length : 0,
        activeCustomers: tenantCustomers.length,
        upcomingBookings: tenantBookings.filter((booking) => booking.status !== "CANCELLED").length,
      };
    },
    async getDashboardSnapshot(tenantId: string): Promise<DashboardSnapshot> {
      if (isDatabaseConfigured()) {
        const [summary, leadsResult, bookingsResult, paymentsResult] = await Promise.all([
          this.getDashboardSummary(tenantId),
          this.listLeads({ tenantId, page: 1, pageSize: 1000 }),
          this.listBookings({ tenantId, page: 1, pageSize: 1000 }),
          this.listPayments({ tenantId, page: 1, pageSize: 1000 }),
        ]);
        const tenantLeads = leadsResult.items;
        const tenantBookings = bookingsResult.items;
        const tenantPayments = paymentsResult.items.filter((payment) => payment.status === "paid");

        const revenueByDay = new Map<string, number>();
        for (const payment of tenantPayments) {
          const paymentDate = payment.paidAt ?? payment.createdAt;
          const day = paymentDate.slice(5, 10);
          revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + payment.amountCents);
        }

        const bookingStatusCounts = new Map<string, number>();
        for (const booking of tenantBookings) {
          bookingStatusCounts.set(booking.status, (bookingStatusCounts.get(booking.status) ?? 0) + 1);
        }

        const leadStageCounts = new Map<string, number>();
        for (const lead of tenantLeads) {
          leadStageCounts.set(lead.pipelineStage, (leadStageCounts.get(lead.pipelineStage) ?? 0) + 1);
        }

        const collectionItems = tenantBookings.map((booking) =>
          deriveCollectionItem(booking, paymentsResult.items),
        );
        const agingSeries = [
          { key: "current", label: "Current" },
          { key: "1_7_days", label: "1-7 days" },
          { key: "8_14_days", label: "8-14 days" },
          { key: "15_plus_days", label: "15+ days" },
        ].map((bucket) => {
          const bucketItems = collectionItems.filter(
            (item) => item.outstandingValueCents > 0 && item.agingBucket === bucket.key,
          );
          return {
            label: bucket.label,
            count: bucketItems.length,
            valueCents: bucketItems.reduce((sum, item) => sum + item.outstandingValueCents, 0),
          };
        });

        const overdueFollowUps = tenantLeads
          .filter((lead) => lead.nextFollowUpAt && lead.nextFollowUpAt < new Date().toISOString())
          .sort((left, right) => compareStrings(left.nextFollowUpAt, right.nextFollowUpAt))
          .slice(0, 5);

        const recentBookings = [...tenantBookings]
          .sort((left, right) => compareStrings(right.startAt, left.startAt))
          .slice(0, 5);

        return {
          summary,
          revenueSeries: [...revenueByDay.entries()]
            .sort((left, right) => left[0].localeCompare(right[0]))
            .slice(-6)
            .map(([label, valueCents]) => ({ label, valueCents })),
          agingSeries,
          bookingStatusSeries: [...bookingStatusCounts.entries()].map(([label, count]) => ({
            label,
            count,
          })),
          leadStageSeries: [...leadStageCounts.entries()].map(([label, count]) => ({
            label,
            count,
          })),
          overdueFollowUps,
          recentBookings: recentBookings.map((booking) => ({
            ...booking,
            ...deriveBookingPaymentMetrics(booking, paymentsResult.items),
          })),
          collectionQueue: collectionItems
            .filter((item) => item.outstandingValueCents > 0)
            .sort((left, right) => {
              if (right.overdueDays !== left.overdueDays) {
                return right.overdueDays - left.overdueDays;
              }
              return right.outstandingValueCents - left.outstandingValueCents;
            })
            .slice(0, 5),
        };
      }

      const store = getMockStore();
      const tenantLeads = store.leads.filter((lead) => lead.tenantId === tenantId && !lead.deletedAt);
      const tenantBookings = store.bookings.filter(
        (booking) => booking.tenantId === tenantId && !booking.deletedAt,
      );
      const tenantPayments = store.payments.filter(
        (payment) => payment.tenantId === tenantId && payment.status === "paid",
      );
      const summary = await this.getDashboardSummary(tenantId);

      const revenueByDay = new Map<string, number>();
      for (const payment of tenantPayments) {
        const paymentDate = payment.paidAt ?? payment.createdAt;
        const day = paymentDate.slice(5, 10);
        revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + payment.amountCents);
      }

      const bookingStatusCounts = new Map<string, number>();
      for (const booking of tenantBookings) {
        bookingStatusCounts.set(booking.status, (bookingStatusCounts.get(booking.status) ?? 0) + 1);
      }

      const leadStageCounts = new Map<string, number>();
      for (const lead of tenantLeads) {
        leadStageCounts.set(lead.pipelineStage, (leadStageCounts.get(lead.pipelineStage) ?? 0) + 1);
      }

      const collectionItems = tenantBookings.map((booking) =>
        deriveCollectionItem(
          booking,
          store.payments.filter((payment) => payment.tenantId === tenantId),
        ),
      );
      const agingSeries = [
        { key: "current", label: "Current" },
        { key: "1_7_days", label: "1-7 days" },
        { key: "8_14_days", label: "8-14 days" },
        { key: "15_plus_days", label: "15+ days" },
      ].map((bucket) => {
        const bucketItems = collectionItems.filter(
          (item) => item.outstandingValueCents > 0 && item.agingBucket === bucket.key,
        );
        return {
          label: bucket.label,
          count: bucketItems.length,
          valueCents: bucketItems.reduce((sum, item) => sum + item.outstandingValueCents, 0),
        };
      });

      const overdueFollowUps = tenantLeads
        .filter((lead) => lead.nextFollowUpAt && lead.nextFollowUpAt < new Date().toISOString())
        .sort((left, right) => compareStrings(left.nextFollowUpAt, right.nextFollowUpAt))
        .slice(0, 5);

      const recentBookings = [...tenantBookings]
        .sort((left, right) => compareStrings(right.startAt, left.startAt))
        .slice(0, 5);

      return {
        summary,
        revenueSeries: [...revenueByDay.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .slice(-6)
          .map(([label, valueCents]) => ({ label, valueCents })),
        agingSeries,
        bookingStatusSeries: [...bookingStatusCounts.entries()].map(([label, count]) => ({
          label,
          count,
        })),
        leadStageSeries: [...leadStageCounts.entries()].map(([label, count]) => ({
          label,
          count,
        })),
        overdueFollowUps,
        recentBookings: recentBookings.map((booking) => ({
          ...booking,
          ...deriveBookingPaymentMetrics(
            booking,
            store.payments.filter((payment) => payment.tenantId === tenantId),
          ),
        })),
        collectionQueue: collectionItems
          .filter((item) => item.outstandingValueCents > 0)
          .sort((left, right) => {
            if (right.overdueDays !== left.overdueDays) {
              return right.overdueDays - left.overdueDays;
            }
            return right.outstandingValueCents - left.outstandingValueCents;
          })
          .slice(0, 5),
      };
    },
    async getReportsSnapshot(
      tenantId: string,
      filters: ReportsFilterOptions = {},
    ): Promise<ReportsSnapshot> {
      const [bookingsResult, paymentsResult, customersResult, leadsResult] = await Promise.all([
        this.listBookings({ tenantId, page: 1, pageSize: 1000 }),
        this.listPayments({ tenantId, page: 1, pageSize: 1000 }),
        this.listCustomers({ tenantId, page: 1, pageSize: 1000 }),
        this.listLeads({ tenantId, page: 1, pageSize: 1000 }),
      ]);
      const allBookings = bookingsResult.items;
      const allPayments = paymentsResult.items;
      const allCustomers = customersResult.items;
      const allLeads = leadsResult.items;
      const filteredLeads = allLeads
        .filter((lead) => (filters.source && filters.source !== "all" ? lead.source === filters.source : true))
        .filter((lead) => (filters.owner && filters.owner !== "all" ? lead.ownerName === filters.owner : true))
        .filter((lead) => matchesDateRange(lead.createdAt, filters.dateFrom, filters.dateTo));
      const allowedCustomerIdsByOwner = new Set(
        filteredLeads
          .map((lead) => lead.customerId)
          .filter((value): value is string => Boolean(value)),
      );
      const customers = allCustomers
        .filter((customer) =>
          filters.source && filters.source !== "all" ? customer.sourceLabel === filters.source : true,
        )
        .filter((customer) =>
          filters.owner && filters.owner !== "all"
            ? allowedCustomerIdsByOwner.has(customer.id)
            : true,
        )
        .filter((customer) => matchesDateRange(customer.createdAt, filters.dateFrom, filters.dateTo));
      const allowedCustomerIds = new Set(customers.map((customer) => customer.id));
      const bookings = allBookings
        .filter((booking) => (allowedCustomerIds.size ? allowedCustomerIds.has(booking.customerId) : true))
        .filter((booking) => matchesDateRange(booking.startAt, filters.dateFrom, filters.dateTo));
      const payments = allPayments
        .filter((payment) => (allowedCustomerIds.size ? allowedCustomerIds.has(payment.customerId) : true))
        .filter((payment) => matchesDateRange(payment.paidAt ?? payment.createdAt, filters.dateFrom, filters.dateTo));
      const leads = filteredLeads;
      const collectionItems = bookings.map((booking) => deriveCollectionItem(booking, payments));
      const paidRevenueCents = payments
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      const outstandingRevenueCents = collectionItems.reduce(
        (sum, item) => sum + item.outstandingValueCents,
        0,
      );
      const recoveredPayments = payments.filter((payment) => {
        if (payment.status !== "paid" || !payment.bookingId) {
          return false;
        }
        const booking = bookings.find((item) => item.id === payment.bookingId);
        if (!booking) {
          return false;
        }
        const paidAt = payment.paidAt ?? payment.createdAt;
        return paidAt > booking.startAt;
      });
      const recoveredRevenueCents = recoveredPayments.reduce(
        (sum, payment) => sum + payment.amountCents,
        0,
      );
      const collectionCoverageRate =
        paidRevenueCents + outstandingRevenueCents > 0
          ? paidRevenueCents / (paidRevenueCents + outstandingRevenueCents)
          : 0;
      const repeatCustomerIds = new Set(
        customers.filter((customer) => customer.totalBookings > 1).map((customer) => customer.id),
      );
      const repeatRevenueCents = payments
        .filter((payment) => payment.status === "paid" && repeatCustomerIds.has(payment.customerId))
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      const repeatCustomerRate = customers.length
        ? repeatCustomerIds.size / customers.length
        : 0;

      const trendByDay = new Map<string, { paidCents: number; unpaidCents: number }>();
      for (const booking of bookings) {
        const label = booking.startAt.slice(5, 10);
        const metrics = deriveBookingPaymentMetrics(booking, payments);
        const current = trendByDay.get(label) ?? { paidCents: 0, unpaidCents: 0 };
        current.paidCents += metrics.paidValueCents;
        current.unpaidCents += metrics.outstandingValueCents;
        trendByDay.set(label, current);
      }

      const recoveredByDay = new Map<string, number>();
      for (const payment of recoveredPayments) {
        const label = (payment.paidAt ?? payment.createdAt).slice(5, 10);
        recoveredByDay.set(label, (recoveredByDay.get(label) ?? 0) + payment.amountCents);
      }

      const repeatRevenueByDay = new Map<string, number>();
      for (const payment of payments) {
        if (payment.status !== "paid" || !repeatCustomerIds.has(payment.customerId)) {
          continue;
        }
        const label = (payment.paidAt ?? payment.createdAt).slice(5, 10);
        repeatRevenueByDay.set(label, (repeatRevenueByDay.get(label) ?? 0) + payment.amountCents);
      }

      const agingSeries = [
        { key: "current", label: "Current" },
        { key: "1_7_days", label: "1-7 days" },
        { key: "8_14_days", label: "8-14 days" },
        { key: "15_plus_days", label: "15+ days" },
      ].map((bucket) => {
        const bucketItems = collectionItems.filter(
          (item) => item.outstandingValueCents > 0 && item.agingBucket === bucket.key,
        );
        return {
          label: bucket.label,
          count: bucketItems.length,
          valueCents: bucketItems.reduce((sum, item) => sum + item.outstandingValueCents, 0),
        };
      });

      const sourceAttributionMap = new Map<string, { customerCount: number; revenueCents: number }>();
      for (const customer of customers) {
        const label = customer.sourceLabel.replace(/_/g, " ");
        const current = sourceAttributionMap.get(label) ?? { customerCount: 0, revenueCents: 0 };
        current.customerCount += 1;
        current.revenueCents += payments
          .filter((payment) => payment.status === "paid" && payment.customerId === customer.id)
          .reduce((sum, payment) => sum + payment.amountCents, 0);
        sourceAttributionMap.set(label, current);
      }

      const retentionSegments = [
        {
          label: "New",
          customers: customers.filter((customer) => customer.totalBookings <= 1),
        },
        {
          label: "Repeat",
          customers: customers.filter((customer) => customer.totalBookings > 1 && customer.lifecycleStage !== "vip"),
        },
        {
          label: "VIP",
          customers: customers.filter((customer) => customer.lifecycleStage === "vip"),
        },
      ].map((segment) => ({
        label: segment.label,
        customerCount: segment.customers.length,
        revenueCents: segment.customers.reduce(
          (sum, customer) =>
            sum +
            payments
              .filter((payment) => payment.status === "paid" && payment.customerId === customer.id)
              .reduce((paymentSum, payment) => paymentSum + payment.amountCents, 0),
          0,
        ),
      }));

      const customerSourceById = new Map(customers.map((customer) => [customer.id, customer.sourceLabel]));
      const sourceFunnelMap = new Map<
        string,
        { leadsCount: number; bookingsCount: number; paidRevenueCents: number }
      >();

      for (const lead of leads) {
        const label = lead.source.replace(/_/g, " ");
        const current = sourceFunnelMap.get(label) ?? {
          leadsCount: 0,
          bookingsCount: 0,
          paidRevenueCents: 0,
        };
        current.leadsCount += 1;
        sourceFunnelMap.set(label, current);
      }

      for (const booking of bookings) {
        const sourceLabel = customerSourceById.get(booking.customerId) || "unknown";
        const label = sourceLabel.replace(/_/g, " ");
        const current = sourceFunnelMap.get(label) ?? {
          leadsCount: 0,
          bookingsCount: 0,
          paidRevenueCents: 0,
        };
        current.bookingsCount += 1;
        sourceFunnelMap.set(label, current);
      }

      for (const payment of payments) {
        if (payment.status !== "paid") {
          continue;
        }
        const sourceLabel = customerSourceById.get(payment.customerId) || "unknown";
        const label = sourceLabel.replace(/_/g, " ");
        const current = sourceFunnelMap.get(label) ?? {
          leadsCount: 0,
          bookingsCount: 0,
          paidRevenueCents: 0,
        };
        current.paidRevenueCents += payment.amountCents;
        sourceFunnelMap.set(label, current);
      }

      return {
        summary: {
          paidRevenueCents,
          outstandingRevenueCents,
          recoveredRevenueCents,
          collectionCoverageRate,
          repeatRevenueCents,
          repeatCustomerRate,
        },
        paidUnpaidTrend: [...trendByDay.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .slice(-6)
          .map(([label, value]) => ({
            label,
            paidCents: value.paidCents,
            unpaidCents: value.unpaidCents,
          })),
        recoveredRevenueSeries: [...recoveredByDay.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .slice(-6)
          .map(([label, valueCents]) => ({ label, valueCents })),
        agingSeries,
        collectionQueue: collectionItems
          .filter((item) => item.outstandingValueCents > 0)
          .sort((left, right) => {
            if (right.overdueDays !== left.overdueDays) {
              return right.overdueDays - left.overdueDays;
            }
            return right.outstandingValueCents - left.outstandingValueCents;
          })
          .slice(0, 8),
        repeatRevenueSeries: [...repeatRevenueByDay.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .slice(-6)
          .map(([label, valueCents]) => ({ label, valueCents })),
        sourceAttribution: [...sourceAttributionMap.entries()]
          .map(([label, value]) => ({
            label,
            customerCount: value.customerCount,
            revenueCents: value.revenueCents,
          }))
          .sort((left, right) => right.revenueCents - left.revenueCents),
        retentionSegments,
        sourceFunnel: [...sourceFunnelMap.entries()]
          .map(([label, value]) => ({
            label,
            leadsCount: value.leadsCount,
            bookingsCount: value.bookingsCount,
            paidRevenueCents: value.paidRevenueCents,
            bookingConversionRate:
              value.leadsCount > 0 ? value.bookingsCount / value.leadsCount : 0,
          }))
          .sort((left, right) => right.paidRevenueCents - left.paidRevenueCents),
      };
    },
    async listCustomers(options: CustomerListOptions): Promise<PaginationResult<CustomerRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const customers = await prisma.customer.findMany({
            where: { tenantId: options.tenantId, deletedAt: null },
            include: {
              bookings: {
                where: { deletedAt: null },
                orderBy: { startAt: "desc" },
              },
            },
          });

          const filtered = customers
            .map(mapCustomerRecord)
            .filter((customer) =>
              matchesQuery(
                `${customer.fullName} ${customer.email ?? ""} ${customer.company ?? ""} ${customer.sourceLabel} ${customer.tags.join(" ")}`,
                options.query,
              ),
            )
            .filter((customer) =>
              options.lifecycleStage && options.lifecycleStage !== "all"
                ? customer.lifecycleStage === options.lifecycleStage
                : true,
            )
            .filter((customer) =>
              options.source && options.source !== "all" ? customer.sourceLabel === options.source : true,
            )
            .filter((customer) =>
              matchesDateRange(customer.createdAt, options.dateFrom, options.dateTo),
            );

          const sorted = sortCustomers(filtered, options.sortBy, options.sortOrder);
          return paginate(sorted, options.page, options.pageSize);
        }
      }

      const store = getMockStore();
      const filtered = store.customers
        .filter((customer) => customer.tenantId === options.tenantId && !customer.deletedAt)
        .filter((customer) =>
          matchesQuery(
            `${customer.fullName} ${customer.email ?? ""} ${customer.company ?? ""} ${customer.sourceLabel} ${customer.tags.join(" ")}`,
            options.query,
          ),
        )
        .filter((customer) =>
          options.lifecycleStage && options.lifecycleStage !== "all"
            ? customer.lifecycleStage === options.lifecycleStage
            : true,
        )
        .filter((customer) =>
          options.source && options.source !== "all" ? customer.sourceLabel === options.source : true,
        )
        .filter((customer) => matchesDateRange(customer.createdAt, options.dateFrom, options.dateTo));

      const sorted = sortCustomers(filtered, options.sortBy, options.sortOrder);
      return paginate(sorted, options.page, options.pageSize);
    },
    async getCustomerById(tenantId: string, customerId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const customer = await prisma.customer.findFirst({
            where: { tenantId, id: customerId, deletedAt: null },
            include: {
              bookings: {
                where: { deletedAt: null },
                orderBy: { startAt: "desc" },
              },
            },
          });
          return customer ? mapCustomerRecord(customer) : null;
        }
      }

      return (
        getMockStore().customers.find(
          (customer) => customer.tenantId === tenantId && customer.id === customerId && !customer.deletedAt,
        ) ?? null
      );
    },
    async listCustomerBookings(tenantId: string, customerId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const bookings = await prisma.booking.findMany({
            where: { tenantId, customerId, deletedAt: null },
            include: { customer: true, service: true },
            orderBy: { startAt: "desc" },
          });
          return bookings.map(mapBookingRecord);
        }
      }

      return getMockStore()
        .bookings.filter((booking) => booking.tenantId === tenantId && booking.customerId === customerId)
        .sort((left, right) => right.startAt.localeCompare(left.startAt));
    },
    async listCustomerPayments(tenantId: string, customerId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const payments = await prisma.payment.findMany({
            where: { tenantId, customerId, deletedAt: null },
            orderBy: { createdAt: "desc" },
          });
          return payments.map(mapPaymentRecord);
        }
      }

      return getMockStore()
        .payments.filter((payment) => payment.tenantId === tenantId && payment.customerId === customerId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async listCustomerAuditLogs(tenantId: string, customerId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const auditLogs = await prisma.auditLog.findMany({
            where: { tenantId, entityType: "customer", entityId: customerId },
            orderBy: { createdAt: "desc" },
          });
          return auditLogs.map((item) => {
            const metadata =
              item.metadataJson && typeof item.metadataJson === "object" && !Array.isArray(item.metadataJson)
                ? (item.metadataJson as Record<string, unknown>)
                : undefined;

            return {
              id: item.id,
              tenantId: item.tenantId,
              actorUserId: item.actorUserId || undefined,
              entityType: item.entityType,
              entityId: item.entityId,
              action: item.action,
              summary: typeof metadata?.summary === "string" ? metadata.summary : item.action,
              createdAt: item.createdAt.toISOString(),
              metadata,
            } satisfies AuditLogRecord;
          });
        }
      }

      return getMockStore()
        .auditLogs.filter(
          (auditLog) =>
            auditLog.tenantId === tenantId &&
            auditLog.entityType === "customer" &&
            auditLog.entityId === customerId,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async listCustomerTimeline(tenantId: string, customerId: string): Promise<ActivityTimelineItem[]> {
      const [customer, bookings, payments, auditLogs] = await Promise.all([
        this.getCustomerById(tenantId, customerId),
        this.listCustomerBookings(tenantId, customerId),
        this.listCustomerPayments(tenantId, customerId),
        this.listCustomerAuditLogs(tenantId, customerId),
      ]);

      if (!customer) {
        return [];
      }

      const items: ActivityTimelineItem[] = [
        {
          id: `customer-created-${customer.id}`,
          occurredAt: customer.createdAt,
          title: "Customer created",
          description: `${customer.fullName} entered the workspace from ${customer.sourceLabel.replace(/_/g, " ")}.`,
          entityType: "customer",
          tone: "info",
        },
      ];

      if (customer.notesSummary) {
        items.push({
          id: `customer-notes-${customer.id}`,
          occurredAt: customer.updatedAt,
          title: "Customer notes updated",
          description: customer.notesSummary,
          entityType: "customer_note",
          tone: "default",
        });
      }

      if (customer.tags.length) {
        items.push({
          id: `customer-tags-${customer.id}`,
          occurredAt: customer.updatedAt,
          title: "Tags applied",
          description: customer.tags.join(", "),
          entityType: "customer_tag",
          tone: "info",
        });
      }

      for (const booking of bookings) {
        items.push({
          id: `booking-${booking.id}`,
          occurredAt: booking.startAt,
          title: `Booking ${booking.status.toLowerCase()}`,
          description: `${booking.serviceName} via ${booking.channel} for ${booking.startAt.slice(0, 16).replace("T", " ")}.`,
          entityType: "booking",
          tone:
            booking.status === "COMPLETED"
              ? "success"
              : booking.status === "CANCELLED"
                ? "warning"
                : "default",
        });
      }

      for (const payment of payments) {
        items.push({
          id: `payment-${payment.id}`,
          occurredAt: payment.paidAt ?? payment.createdAt,
          title: `Payment ${payment.status}`,
          description: `${payment.provider} ${payment.paymentMethod || "payment"} for ${(payment.amountCents / 100).toLocaleString("en-AU", { style: "currency", currency: payment.currency })}.`,
          entityType: "payment",
          tone:
            payment.status === "paid"
              ? "success"
              : payment.status === "pending"
                ? "warning"
                : "default",
        });
      }

      for (const auditLog of auditLogs) {
        items.push({
          id: `audit-${auditLog.id}`,
          occurredAt: auditLog.createdAt,
          title: auditLog.action,
          description: auditLog.summary,
          entityType: "audit",
          tone: "default",
        });
      }

      return sortTimeline(items);
    },
    async createCustomer(tenantId: string, payload: CustomerMutationInput, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.customer.create({
            data: {
              tenantId,
              firstName: payload.firstName,
              lastName: payload.lastName,
              fullName: buildFullName(payload.firstName, payload.lastName),
              email: normalizeOptional(payload.email) ?? null,
              phone: normalizeOptional(payload.phone) ?? null,
              company: normalizeOptional(payload.company) ?? null,
              lifecycleStage: payload.lifecycleStage,
              sourceLabel: normalizeOptional(payload.sourceLabel) ?? "manual_entry",
              tagsJson: normalizeTags(payload.tags),
              marketingConsent: payload.marketingConsent,
              notes: normalizeOptional(payload.notes) ?? null,
              notesSummary: summarizeNotes(payload.notes) ?? null,
            },
            include: { bookings: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "customer",
            entityId: created.id,
            action: "customer.created",
            summary: `Created ${created.fullName} in the customers workspace.`,
            metadata: {
              sourceLabel: created.sourceLabel,
              lifecycleStage: created.lifecycleStage,
              tags: parseTagsJson(created.tagsJson),
            },
          });
          return mapCustomerRecord(created);
        }
      }

      const now = isoNow();
      const customer: CustomerRecord = {
        id: randomUUID(),
        tenantId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: buildFullName(payload.firstName, payload.lastName),
        email: normalizeOptional(payload.email),
        phone: normalizeOptional(payload.phone),
        company: normalizeOptional(payload.company),
        lifecycleStage: payload.lifecycleStage,
        sourceLabel: normalizeOptional(payload.sourceLabel) ?? "manual_entry",
        tags: normalizeTags(payload.tags),
        marketingConsent: payload.marketingConsent,
        notes: normalizeOptional(payload.notes),
        notesSummary: summarizeNotes(payload.notes),
        totalBookings: 0,
        totalRevenueCents: 0,
        lastBookedAt: undefined,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const store = getMockStore();
      store.customers.unshift(customer);
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "customer",
        entityId: customer.id,
        action: "customer.created",
        summary: `Created ${customer.fullName} in the customers workspace.`,
        createdAt: now,
        metadata: {
          sourceLabel: customer.sourceLabel,
          lifecycleStage: customer.lifecycleStage,
          tags: customer.tags,
        },
      });
      return customer;
    },
    async updateCustomer(
      tenantId: string,
      customerId: string,
      payload: CustomerMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.customer.findFirst({
            where: { tenantId, id: customerId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.customer.update({
            where: { id: customerId },
            data: {
              firstName: payload.firstName,
              lastName: payload.lastName,
              fullName: buildFullName(payload.firstName, payload.lastName),
              email: normalizeOptional(payload.email) ?? null,
              phone: normalizeOptional(payload.phone) ?? null,
              company: normalizeOptional(payload.company) ?? null,
              lifecycleStage: payload.lifecycleStage,
              sourceLabel: normalizeOptional(payload.sourceLabel) ?? "manual_entry",
              tagsJson: normalizeTags(payload.tags),
              marketingConsent: payload.marketingConsent,
              notes: normalizeOptional(payload.notes) ?? null,
              notesSummary: summarizeNotes(payload.notes) ?? null,
            },
            include: { bookings: true },
          });

          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "customer",
            entityId: updated.id,
            action: "customer.updated",
            summary: `Updated ${updated.fullName} and saved customer profile changes.`,
            metadata: {
              before: {
                lifecycleStage: existing.lifecycleStage,
                sourceLabel: existing.sourceLabel,
                tags: parseTagsJson(existing.tagsJson),
              },
              after: {
                lifecycleStage: updated.lifecycleStage,
                sourceLabel: updated.sourceLabel,
                tags: parseTagsJson(updated.tagsJson),
              },
            },
          });
          return mapCustomerRecord(updated);
        }
      }

      const store = getMockStore();
      const customer = store.customers.find(
        (item) => item.tenantId === tenantId && item.id === customerId && !item.deletedAt,
      );
      if (!customer) {
        return null;
      }

      const before = {
        lifecycleStage: customer.lifecycleStage,
        sourceLabel: customer.sourceLabel,
        tags: customer.tags,
      };

      customer.firstName = payload.firstName;
      customer.lastName = payload.lastName;
      customer.fullName = buildFullName(payload.firstName, payload.lastName);
      customer.email = normalizeOptional(payload.email);
      customer.phone = normalizeOptional(payload.phone);
      customer.company = normalizeOptional(payload.company);
      customer.lifecycleStage = payload.lifecycleStage;
      customer.sourceLabel = normalizeOptional(payload.sourceLabel) ?? "manual_entry";
      customer.tags = normalizeTags(payload.tags);
      customer.marketingConsent = payload.marketingConsent;
      customer.notes = normalizeOptional(payload.notes);
      customer.notesSummary = summarizeNotes(payload.notes);
      customer.updatedAt = isoNow();

      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "customer",
        entityId: customer.id,
        action: "customer.updated",
        summary: `Updated ${customer.fullName} and saved customer profile changes.`,
        createdAt: isoNow(),
        metadata: {
          before,
          after: {
            lifecycleStage: customer.lifecycleStage,
            sourceLabel: customer.sourceLabel,
            tags: customer.tags,
          },
        },
      });
      return customer;
    },
    async softDeleteCustomer(tenantId: string, customerId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.customer.findFirst({
            where: { tenantId, id: customerId, deletedAt: null },
            include: { bookings: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.customer.update({
            where: { id: customerId },
            data: { deletedAt: new Date() },
            include: { bookings: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "customer",
            entityId: updated.id,
            action: "customer.archived",
            summary: `Archived ${updated.fullName} with soft delete.`,
          });
          return mapCustomerRecord(updated);
        }
      }

      const store = getMockStore();
      const customer = store.customers.find(
        (item) => item.tenantId === tenantId && item.id === customerId && !item.deletedAt,
      );
      if (!customer) {
        return null;
      }

      const now = isoNow();
      customer.deletedAt = now;
      customer.updatedAt = now;
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "customer",
        entityId: customer.id,
        action: "customer.archived",
        summary: `Archived ${customer.fullName} with soft delete.`,
        createdAt: now,
      });
      return customer;
    },
    async listLeads(options: LeadListOptions): Promise<PaginationResult<LeadRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const leads = await prisma.lead.findMany({
            where: { tenantId: options.tenantId, deletedAt: null },
            include: { customer: true },
          });
          const filtered = leads
            .map(mapLeadRecord)
            .filter((lead) =>
              matchesQuery(
                `${lead.title} ${lead.source} ${lead.ownerName ?? ""} ${lead.pipelineStage} ${lead.customerName ?? ""}`,
                options.query,
              ),
            )
            .filter((lead) =>
              options.status && options.status !== "all" ? lead.status === options.status : true,
            )
            .filter((lead) =>
              options.pipelineStage && options.pipelineStage !== "all"
                ? lead.pipelineStage === options.pipelineStage
                : true,
            )
            .filter((lead) =>
              options.owner && options.owner !== "all"
                ? (lead.ownerName ?? "").toLowerCase() === options.owner.toLowerCase()
                : true,
            );
          const sorted = sortLeads(filtered, options.sortBy, options.sortOrder);
          return paginate(sorted, options.page, options.pageSize);
        }
      }

      const store = getMockStore();
      const filtered = store.leads
        .filter((lead) => lead.tenantId === options.tenantId && !lead.deletedAt)
        .filter((lead) =>
          matchesQuery(
            `${lead.title} ${lead.source} ${lead.ownerName ?? ""} ${lead.pipelineStage} ${lead.customerName ?? ""}`,
            options.query,
          ),
        )
        .filter((lead) =>
          options.status && options.status !== "all" ? lead.status === options.status : true,
        )
        .filter((lead) =>
          options.pipelineStage && options.pipelineStage !== "all"
            ? lead.pipelineStage === options.pipelineStage
            : true,
        )
        .filter((lead) =>
          options.owner && options.owner !== "all"
            ? (lead.ownerName ?? "").toLowerCase() === options.owner.toLowerCase()
            : true,
        );
      const sorted = sortLeads(filtered, options.sortBy, options.sortOrder);
      return paginate(sorted, options.page, options.pageSize);
    },
    async getLeadById(tenantId: string, leadId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const lead = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          return lead ? mapLeadRecord(lead) : null;
        }
      }

      return (
        getMockStore().leads.find(
          (lead) => lead.tenantId === tenantId && lead.id === leadId && !lead.deletedAt,
        ) ?? null
      );
    },
    async listLeadTimeline(tenantId: string, leadId: string): Promise<ActivityTimelineItem[]> {
      const lead = await this.getLeadById(tenantId, leadId);
      if (!lead) {
        return [];
      }

      const auditLogs = await this.listRecentAuditLogs(tenantId);
      const relatedAuditLogs = auditLogs.filter(
        (item) =>
          (item.entityType === "lead" && item.entityId === leadId) ||
          item.summary.toLowerCase().includes(lead.title.toLowerCase()),
      );

      const items: ActivityTimelineItem[] = [
        {
          id: `lead-created-${lead.id}`,
          occurredAt: lead.createdAt,
          title: "Lead captured",
          description: `${lead.title} entered the pipeline from ${lead.source.replace(/_/g, " ")}.`,
          entityType: "lead",
          tone: "info",
        },
      ];

      if (lead.lastContactAt) {
        items.push({
          id: `lead-contact-${lead.id}`,
          occurredAt: lead.lastContactAt,
          title: "Last contact logged",
          description: `${lead.ownerName || "Unassigned owner"} handled the most recent touchpoint.`,
          entityType: "lead_contact",
          tone: "default",
        });
      }

      if (lead.nextFollowUpAt) {
        items.push({
          id: `lead-followup-${lead.id}`,
          occurredAt: lead.nextFollowUpAt,
          title: "Follow-up scheduled",
          description: `Next follow-up is set for ${lead.nextFollowUpAt.slice(0, 16).replace("T", " ")}.`,
          entityType: "lead_follow_up",
          tone: lead.nextFollowUpAt < new Date().toISOString() ? "warning" : "info",
        });
      }

      if (lead.notes) {
        items.push({
          id: `lead-notes-${lead.id}`,
          occurredAt: lead.updatedAt,
          title: "Lead notes updated",
          description: lead.notes,
          entityType: "lead_note",
          tone: "default",
        });
      }

      for (const auditLog of relatedAuditLogs) {
        items.push({
          id: `audit-${auditLog.id}`,
          occurredAt: auditLog.createdAt,
          title: auditLog.action,
          description: auditLog.summary,
          entityType: "audit",
          tone: "default",
        });
      }

      return sortTimeline(items);
    },
    async appendLeadNote(
      tenantId: string,
      leadId: string,
      payload: LeadNoteMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          if (!existing) {
            return null;
          }

          const nextNotes = appendTimestampedNote(
            normalizeOptional(existing.notes),
            payload.note,
            payload.contactAt,
          );

          const updated = await prisma.lead.update({
            where: { id: leadId },
            data: {
              notes: nextNotes ?? null,
              lastContactAt: new Date(payload.contactAt || isoNow()),
            },
            include: { customer: true },
          });

          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: updated.id,
            action: "lead.note.added",
            summary: `Added note to lead ${updated.title}.`,
            metadata: {
              note: payload.note,
              contactAt: payload.contactAt || isoNow(),
            },
          });
          return mapLeadRecord(updated);
        }
      }

      const lead = getMockStore().leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }
      lead.notes = appendTimestampedNote(lead.notes, payload.note, payload.contactAt);
      lead.lastContactAt = payload.contactAt || isoNow();
      lead.updatedAt = isoNow();
      getMockStore().auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.note.added",
        summary: `Added note to lead ${lead.title}.`,
        createdAt: isoNow(),
        metadata: {
          note: payload.note,
          contactAt: payload.contactAt || isoNow(),
        },
      });
      return lead;
    },
    async scheduleLeadFollowUp(
      tenantId: string,
      leadId: string,
      payload: LeadFollowUpMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          if (!existing) {
            return null;
          }

          const nextNotes = payload.note
            ? appendTimestampedNote(normalizeOptional(existing.notes), payload.note, payload.nextFollowUpAt)
            : existing.notes;

          const updated = await prisma.lead.update({
            where: { id: leadId },
            data: {
              nextFollowUpAt: new Date(payload.nextFollowUpAt),
              ownerName: normalizeOptional(payload.ownerName) ?? existing.ownerName,
              notes: normalizeOptional(nextNotes) ?? null,
            },
            include: { customer: true },
          });

          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: updated.id,
            action: "lead.follow_up.scheduled",
            summary: `Scheduled follow-up for lead ${updated.title}.`,
            metadata: {
              nextFollowUpAt: payload.nextFollowUpAt,
              ownerName: payload.ownerName,
              note: payload.note,
            },
          });
          return mapLeadRecord(updated);
        }
      }

      const lead = getMockStore().leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }
      lead.nextFollowUpAt = payload.nextFollowUpAt;
      lead.ownerName = normalizeOptional(payload.ownerName) ?? lead.ownerName;
      if (payload.note) {
        lead.notes = appendTimestampedNote(lead.notes, payload.note, payload.nextFollowUpAt);
      }
      lead.updatedAt = isoNow();
      getMockStore().auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.follow_up.scheduled",
        summary: `Scheduled follow-up for lead ${lead.title}.`,
        createdAt: isoNow(),
        metadata: {
          nextFollowUpAt: payload.nextFollowUpAt,
          ownerName: payload.ownerName,
          note: payload.note,
        },
      });
      return lead;
    },
    async createLead(
      tenantId: string,
      payload: LeadMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.lead.create({
            data: {
              tenantId,
              title: payload.title,
              source: payload.source,
              status: payload.status as any,
              pipelineStage: payload.pipelineStage,
              score: payload.score,
              estimatedValueCents: payload.estimatedValueCents,
              ownerName: normalizeOptional(payload.ownerName) ?? null,
              nextFollowUpAt: payload.nextFollowUpAt ? new Date(payload.nextFollowUpAt) : null,
              lastContactAt: payload.lastContactAt ? new Date(payload.lastContactAt) : null,
              notes: normalizeOptional(payload.notes) ?? null,
            },
            include: { customer: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: created.id,
            action: "lead.created",
            summary: `Created lead ${created.title}.`,
          });
          return mapLeadRecord(created);
        }
      }

      const store = getMockStore();
      const now = isoNow();
      const lead: LeadRecord = {
        id: randomUUID(),
        tenantId,
        title: payload.title,
        source: payload.source,
        status: payload.status,
        pipelineStage: payload.pipelineStage,
        score: payload.score,
        estimatedValueCents: payload.estimatedValueCents,
        ownerName: normalizeOptional(payload.ownerName),
        nextFollowUpAt: normalizeOptional(payload.nextFollowUpAt),
        lastContactAt: normalizeOptional(payload.lastContactAt),
        notes: normalizeOptional(payload.notes),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.leads.unshift(lead);
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.created",
        summary: `Created lead ${lead.title}.`,
        createdAt: now,
      });
      return lead;
    },
    async updateLead(
      tenantId: string,
      leadId: string,
      payload: LeadMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.lead.update({
            where: { id: leadId },
            data: {
              title: payload.title,
              source: payload.source,
              status: payload.status as any,
              pipelineStage: payload.pipelineStage,
              score: payload.score,
              estimatedValueCents: payload.estimatedValueCents,
              ownerName: normalizeOptional(payload.ownerName) ?? null,
              nextFollowUpAt: payload.nextFollowUpAt ? new Date(payload.nextFollowUpAt) : null,
              lastContactAt: payload.lastContactAt ? new Date(payload.lastContactAt) : null,
              notes: normalizeOptional(payload.notes) ?? null,
            },
            include: { customer: true },
          });

          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: updated.id,
            action: "lead.updated",
            summary: `Updated lead ${updated.title}.`,
            metadata: {
              before: {
                status: String(existing.status),
                pipelineStage: existing.pipelineStage,
                ownerName: existing.ownerName,
                nextFollowUpAt: toIsoString(existing.nextFollowUpAt),
              },
              after: {
                status: String(updated.status),
                pipelineStage: updated.pipelineStage,
                ownerName: updated.ownerName,
                nextFollowUpAt: toIsoString(updated.nextFollowUpAt),
              },
            },
          });
          return mapLeadRecord(updated);
        }
      }

      const store = getMockStore();
      const lead = store.leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }

      const before = {
        status: lead.status,
        pipelineStage: lead.pipelineStage,
        ownerName: lead.ownerName,
        nextFollowUpAt: lead.nextFollowUpAt,
      };

      lead.title = payload.title;
      lead.source = payload.source;
      lead.status = payload.status;
      lead.pipelineStage = payload.pipelineStage;
      lead.score = payload.score;
      lead.estimatedValueCents = payload.estimatedValueCents;
      lead.ownerName = normalizeOptional(payload.ownerName);
      lead.nextFollowUpAt = normalizeOptional(payload.nextFollowUpAt);
      lead.lastContactAt = normalizeOptional(payload.lastContactAt);
      lead.notes = normalizeOptional(payload.notes);
      lead.updatedAt = isoNow();

      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.updated",
        summary: `Updated lead ${lead.title}.`,
        createdAt: isoNow(),
        metadata: {
          before,
          after: {
            status: lead.status,
            pipelineStage: lead.pipelineStage,
            ownerName: lead.ownerName,
            nextFollowUpAt: lead.nextFollowUpAt,
          },
        },
      });
      return lead;
    },
    async softDeleteLead(tenantId: string, leadId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.lead.update({
            where: { id: leadId },
            data: { deletedAt: new Date() },
            include: { customer: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: updated.id,
            action: "lead.archived",
            summary: `Archived lead ${updated.title}.`,
          });
          return mapLeadRecord(updated);
        }
      }

      const store = getMockStore();
      const lead = store.leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }

      const now = isoNow();
      lead.deletedAt = now;
      lead.updatedAt = now;
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.archived",
        summary: `Archived lead ${lead.title}.`,
        createdAt: now,
      });
      return lead;
    },
    async convertLeadToCustomer(tenantId: string, leadId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const lead = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          if (!lead) {
            return null;
          }

          if (lead.customerId && lead.customer) {
            return mapCustomerRecord({
              ...lead.customer,
              bookings: await prisma.booking.findMany({
                where: { tenantId, customerId: lead.customerId, deletedAt: null },
                orderBy: { startAt: "desc" },
              }),
            });
          }

          const customer = await this.createCustomer(
            tenantId,
            {
              firstName: lead.customer?.fullName?.split(" ")[0] ?? lead.title.split(" ")[0] ?? "New",
              lastName: lead.customer?.fullName?.split(" ").slice(1).join(" ") || "Customer",
              email: undefined,
              phone: undefined,
              company: undefined,
              lifecycleStage: "new",
              sourceLabel: lead.source,
              tags: ["lead_conversion"],
              marketingConsent: false,
              notes: lead.notes ?? undefined,
            },
            actorUserId,
          );

          await prisma.lead.update({
            where: { id: leadId },
            data: { customerId: customer.id },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: leadId,
            action: "lead.converted_to_customer",
            summary: `Converted lead ${lead.title} into customer ${customer.fullName}.`,
          });
          return customer;
        }
      }

      const store = getMockStore();
      const lead = store.leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }

      if (lead.customerId) {
        const existingCustomer = store.customers.find(
          (customer) =>
            customer.tenantId === tenantId && customer.id === lead.customerId && !customer.deletedAt,
        );
        if (existingCustomer) {
          return existingCustomer;
        }
      }

      const customer = await this.createCustomer(
        tenantId,
        {
          firstName: lead.customerName?.split(" ")[0] ?? lead.title.split(" ")[0] ?? "New",
          lastName: lead.customerName?.split(" ").slice(1).join(" ") || "Customer",
          email: undefined,
          phone: undefined,
          company: undefined,
          lifecycleStage: "new",
          sourceLabel: lead.source,
          tags: ["lead_conversion"],
          marketingConsent: false,
          notes: lead.notes,
        },
        actorUserId,
      );

      lead.customerId = customer.id;
      lead.customerName = customer.fullName;
      lead.updatedAt = isoNow();
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.converted_to_customer",
        summary: `Converted lead ${lead.title} into customer ${customer.fullName}.`,
        createdAt: isoNow(),
      });
      return customer;
    },
    async convertLeadToBooking(
      tenantId: string,
      leadId: string,
      serviceId: string,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const lead = await prisma.lead.findFirst({
            where: { tenantId, id: leadId, deletedAt: null },
            include: { customer: true },
          });
          if (!lead) {
            return null;
          }

          const service = await prisma.service.findFirst({
            where: { tenantId, id: serviceId, deletedAt: null },
          });
          if (!service) {
            return null;
          }

          const customer =
            (lead.customerId ? await this.getCustomerById(tenantId, lead.customerId) : null) ??
            (await this.convertLeadToCustomer(tenantId, leadId, actorUserId));

          if (!customer) {
            return null;
          }

          const startAt =
            toIsoString(lead.nextFollowUpAt) ??
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const endAt = new Date(
            new Date(startAt).getTime() + Number(service.durationMinutes || 0) * 60 * 1000,
          ).toISOString();

          const booking = await this.createBooking(
            tenantId,
            {
              customerId: customer.id,
              serviceId: service.id,
              status: "PENDING",
              startAt,
              endAt,
              revenueCents: Number(service.priceCents || 0),
              channel: lead.source,
            },
            actorUserId,
          );

          await prisma.lead.update({
            where: { id: leadId },
            data: {
              customerId: customer.id,
              status: "WON" as any,
              pipelineStage: "booked",
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "lead",
            entityId: leadId,
            action: "lead.converted_to_booking",
            summary: `Converted lead ${lead.title} into booking ${booking.id}.`,
          });
          return booking;
        }
      }

      const store = getMockStore();
      const lead = store.leads.find(
        (item) => item.tenantId === tenantId && item.id === leadId && !item.deletedAt,
      );
      if (!lead) {
        return null;
      }

      const customer =
        (lead.customerId
          ? store.customers.find(
              (item) => item.tenantId === tenantId && item.id === lead.customerId && !item.deletedAt,
            )
          : null) ?? (await this.convertLeadToCustomer(tenantId, leadId, actorUserId));

      if (!customer) {
        return null;
      }

      const service = store.services.find(
        (item) => item.tenantId === tenantId && item.id === serviceId,
      );
      if (!service) {
        return null;
      }

      const startAt = lead.nextFollowUpAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endAt = new Date(new Date(startAt).getTime() + service.durationMinutes * 60 * 1000).toISOString();
      const booking = await this.createBooking(
        tenantId,
        {
          customerId: customer.id,
          serviceId: service.id,
          status: "PENDING",
          startAt,
          endAt,
          revenueCents: service.priceCents,
          channel: lead.source,
        },
        actorUserId,
      );

      lead.customerId = customer.id;
      lead.customerName = customer.fullName;
      lead.status = "WON";
      lead.pipelineStage = "booked";
      lead.updatedAt = isoNow();
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "lead",
        entityId: lead.id,
        action: "lead.converted_to_booking",
        summary: `Converted lead ${lead.title} into booking ${booking.id}.`,
        createdAt: isoNow(),
      });
      return booking;
    },
    async listCampaigns(options: CampaignListOptions): Promise<PaginationResult<CampaignRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const [campaigns, leads, customers, bookings, payments] = await Promise.all([
            prisma.campaign.findMany({
              where: { tenantId: options.tenantId, deletedAt: null },
            }),
            prisma.lead.findMany({
              where: { tenantId: options.tenantId, deletedAt: null },
            }),
            prisma.customer.findMany({
              where: { tenantId: options.tenantId, deletedAt: null },
            }),
            prisma.booking.findMany({
              where: { tenantId: options.tenantId, deletedAt: null },
            }),
            prisma.payment.findMany({
              where: { tenantId: options.tenantId, deletedAt: null },
            }),
          ]);

          const filtered = campaigns
            .map(mapCampaignRecord)
            .map((campaign) =>
              enrichCampaignMetrics(
                campaign,
                leads.map(mapLeadRecord),
                customers.map(mapCustomerRecord),
                bookings.map(mapBookingRecord),
                payments.map(mapPaymentRecord),
              ),
            )
            .filter((campaign) =>
              options.status && options.status !== "all" ? campaign.status === options.status : true,
            )
            .filter((campaign) =>
              options.channel && options.channel !== "all" ? campaign.channel === options.channel : true,
            )
            .filter((campaign) =>
              matchesQuery(
                `${campaign.name} ${campaign.channel} ${campaign.sourcePlatform} ${campaign.sourceKey} ${campaign.utmCampaign ?? ""}`,
                options.query,
              ),
            );

          return paginate(
            sortCampaigns(filtered, options.sortBy, options.sortOrder),
            options.page,
            options.pageSize,
          );
        }
      }

      const store = getMockStore();
      const leads = store.leads.filter((lead) => lead.tenantId === options.tenantId && !lead.deletedAt);
      const customers = store.customers.filter(
        (customer) => customer.tenantId === options.tenantId && !customer.deletedAt,
      );
      const bookings = store.bookings.filter(
        (booking) => booking.tenantId === options.tenantId && !booking.deletedAt,
      );
      const payments = store.payments.filter((payment) => payment.tenantId === options.tenantId);

      const filtered = store.campaigns
        .filter((campaign) => campaign.tenantId === options.tenantId && !campaign.deletedAt)
        .map((campaign) => enrichCampaignMetrics(campaign, leads, customers, bookings, payments))
        .filter((campaign) =>
          options.status && options.status !== "all" ? campaign.status === options.status : true,
        )
        .filter((campaign) =>
          options.channel && options.channel !== "all" ? campaign.channel === options.channel : true,
        )
        .filter((campaign) =>
          matchesQuery(
            `${campaign.name} ${campaign.channel} ${campaign.sourcePlatform} ${campaign.sourceKey} ${campaign.utmCampaign ?? ""}`,
            options.query,
          ),
        );

      return paginate(
        sortCampaigns(filtered, options.sortBy, options.sortOrder),
        options.page,
        options.pageSize,
      );
    },
    async getCampaignById(tenantId: string, campaignId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const [campaign, leads, customers, bookings, payments] = await Promise.all([
            prisma.campaign.findFirst({
              where: { tenantId, id: campaignId, deletedAt: null },
            }),
            prisma.lead.findMany({
              where: { tenantId, deletedAt: null },
            }),
            prisma.customer.findMany({
              where: { tenantId, deletedAt: null },
            }),
            prisma.booking.findMany({
              where: { tenantId, deletedAt: null },
            }),
            prisma.payment.findMany({
              where: { tenantId, deletedAt: null },
            }),
          ]);

          if (!campaign) {
            return null;
          }

          return enrichCampaignMetrics(
            mapCampaignRecord(campaign),
            leads.map(mapLeadRecord),
            customers.map(mapCustomerRecord),
            bookings.map(mapBookingRecord),
            payments.map(mapPaymentRecord),
          );
        }
      }

      const store = getMockStore();
      const campaign = store.campaigns.find(
        (item) => item.tenantId === tenantId && item.id === campaignId && !item.deletedAt,
      );
      if (!campaign) {
        return null;
      }

      return enrichCampaignMetrics(
        campaign,
        store.leads.filter((lead) => lead.tenantId === tenantId && !lead.deletedAt),
        store.customers.filter((customer) => customer.tenantId === tenantId && !customer.deletedAt),
        store.bookings.filter((booking) => booking.tenantId === tenantId && !booking.deletedAt),
        store.payments.filter((payment) => payment.tenantId === tenantId),
      );
    },
    async createCampaign(tenantId: string, payload: CampaignMutationInput, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.campaign.create({
            data: {
              tenantId,
              name: payload.name,
              channel: payload.channel,
              sourcePlatform: payload.sourcePlatform,
              sourceKey: payload.sourceKey,
              status: payload.status as any,
              budgetCents: payload.budgetCents,
              startDate: payload.startDate ? new Date(payload.startDate) : null,
              endDate: payload.endDate ? new Date(payload.endDate) : null,
              utmSource: normalizeOptional(payload.utmSource),
              utmMedium: normalizeOptional(payload.utmMedium),
              utmCampaign: normalizeOptional(payload.utmCampaign),
              notes: normalizeOptional(payload.notes),
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "campaign",
            entityId: created.id,
            action: "campaign.created",
            summary: `Created campaign ${created.name}.`,
            metadata: {
              channel: created.channel,
              sourceKey: created.sourceKey,
              status: created.status,
            },
          });
          return this.getCampaignById(tenantId, created.id);
        }
      }

      const store = getMockStore();
      const now = isoNow();
      const campaign: CampaignRecord = {
        id: randomUUID(),
        tenantId,
        name: payload.name,
        channel: payload.channel,
        sourcePlatform: payload.sourcePlatform,
        sourceKey: payload.sourceKey,
        status: payload.status,
        budgetCents: payload.budgetCents,
        startDate: normalizeOptional(payload.startDate),
        endDate: normalizeOptional(payload.endDate),
        utmSource: normalizeOptional(payload.utmSource),
        utmMedium: normalizeOptional(payload.utmMedium),
        utmCampaign: normalizeOptional(payload.utmCampaign),
        notes: normalizeOptional(payload.notes),
        sourcedLeads: 0,
        sourcedCustomers: 0,
        bookingsCount: 0,
        paidRevenueCents: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.campaigns.unshift(campaign);
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "campaign",
        entityId: campaign.id,
        action: "campaign.created",
        summary: `Created campaign ${campaign.name}.`,
        metadata: {
          channel: campaign.channel,
          sourceKey: campaign.sourceKey,
          status: campaign.status,
        },
      });
      return this.getCampaignById(tenantId, campaign.id);
    },
    async updateCampaign(
      tenantId: string,
      campaignId: string,
      payload: CampaignMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.campaign.findFirst({
            where: { tenantId, id: campaignId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              name: payload.name,
              channel: payload.channel,
              sourcePlatform: payload.sourcePlatform,
              sourceKey: payload.sourceKey,
              status: payload.status as any,
              budgetCents: payload.budgetCents,
              startDate: payload.startDate ? new Date(payload.startDate) : null,
              endDate: payload.endDate ? new Date(payload.endDate) : null,
              utmSource: normalizeOptional(payload.utmSource),
              utmMedium: normalizeOptional(payload.utmMedium),
              utmCampaign: normalizeOptional(payload.utmCampaign),
              notes: normalizeOptional(payload.notes),
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "campaign",
            entityId: updated.id,
            action: "campaign.updated",
            summary: `Updated campaign ${updated.name}.`,
            metadata: {
              before: {
                name: existing.name,
                channel: existing.channel,
                sourceKey: existing.sourceKey,
                status: existing.status,
                budgetCents: existing.budgetCents,
              },
              after: {
                name: updated.name,
                channel: updated.channel,
                sourceKey: updated.sourceKey,
                status: updated.status,
                budgetCents: updated.budgetCents,
              },
            },
          });
          return this.getCampaignById(tenantId, campaignId);
        }
      }

      const store = getMockStore();
      const campaign = store.campaigns.find(
        (item) => item.tenantId === tenantId && item.id === campaignId && !item.deletedAt,
      );
      if (!campaign) {
        return null;
      }

      const before = {
        name: campaign.name,
        channel: campaign.channel,
        sourceKey: campaign.sourceKey,
        status: campaign.status,
        budgetCents: campaign.budgetCents,
      };

      campaign.name = payload.name;
      campaign.channel = payload.channel;
      campaign.sourcePlatform = payload.sourcePlatform;
      campaign.sourceKey = payload.sourceKey;
      campaign.status = payload.status;
      campaign.budgetCents = payload.budgetCents;
      campaign.startDate = normalizeOptional(payload.startDate);
      campaign.endDate = normalizeOptional(payload.endDate);
      campaign.utmSource = normalizeOptional(payload.utmSource);
      campaign.utmMedium = normalizeOptional(payload.utmMedium);
      campaign.utmCampaign = normalizeOptional(payload.utmCampaign);
      campaign.notes = normalizeOptional(payload.notes);
      campaign.updatedAt = isoNow();

      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "campaign",
        entityId: campaign.id,
        action: "campaign.updated",
        summary: `Updated campaign ${campaign.name}.`,
        metadata: {
          before,
          after: {
            name: campaign.name,
            channel: campaign.channel,
            sourceKey: campaign.sourceKey,
            status: campaign.status,
            budgetCents: campaign.budgetCents,
          },
        },
      });
      return this.getCampaignById(tenantId, campaign.id);
    },
    async softDeleteCampaign(tenantId: string, campaignId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.campaign.findFirst({
            where: { tenantId, id: campaignId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.campaign.update({
            where: { id: campaignId },
            data: { deletedAt: new Date(), status: "ARCHIVED" as any },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "campaign",
            entityId: updated.id,
            action: "campaign.archived",
            summary: `Archived campaign ${updated.name}.`,
          });
          return mapCampaignRecord(updated);
        }
      }

      const store = getMockStore();
      const campaign = store.campaigns.find(
        (item) => item.tenantId === tenantId && item.id === campaignId && !item.deletedAt,
      );
      if (!campaign) {
        return null;
      }

      const now = isoNow();
      campaign.deletedAt = now;
      campaign.updatedAt = now;
      campaign.status = "ARCHIVED";
      await this.appendAuditLog({
        tenantId,
        actorUserId,
        entityType: "campaign",
        entityId: campaign.id,
        action: "campaign.archived",
        summary: `Archived campaign ${campaign.name}.`,
      });
      return campaign;
    },
    async listServices(options: ServiceListOptions): Promise<PaginationResult<ServiceRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const services = await prisma.service.findMany({
            where: { tenantId: options.tenantId, deletedAt: null },
          });
          const filtered = services
            .map(mapServiceRecord)
            .filter((service) => matchesQuery(`${service.name}`, options.query));
          const sorted = sortServices(filtered, options.sortBy, options.sortOrder);
          return paginate(sorted, options.page, options.pageSize);
        }
      }

      const store = getMockStore();
      const filtered = store.services
        .filter((service) => service.tenantId === options.tenantId && !service.deletedAt)
        .filter((service) => matchesQuery(`${service.name}`, options.query));
      const sorted = sortServices(filtered, options.sortBy, options.sortOrder);
      return paginate(sorted, options.page, options.pageSize);
    },
    async getServiceById(tenantId: string, serviceId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const service = await prisma.service.findFirst({
            where: { tenantId, id: serviceId, deletedAt: null },
          });
          return service ? mapServiceRecord(service) : null;
        }
      }

      return (
        getMockStore().services.find(
          (service) => service.tenantId === tenantId && service.id === serviceId && !service.deletedAt,
        ) ?? null
      );
    },
    async createService(
      tenantId: string,
      payload: ServiceMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.service.create({
            data: {
              tenantId,
              name: payload.name,
              category: "General",
              durationMinutes: payload.durationMinutes,
              priceCents: payload.priceCents,
              currency: "AUD",
              isActive: true,
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "service",
            entityId: created.id,
            action: "service.created",
            summary: `Created service ${created.name}.`,
          });
          return mapServiceRecord(created);
        }
      }

      const store = getMockStore();
      const now = isoNow();
      const service: ServiceRecord = {
        id: randomUUID(),
        tenantId,
        name: payload.name,
        durationMinutes: payload.durationMinutes,
        priceCents: payload.priceCents,
        currency: "AUD",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.services.unshift(service);
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "service",
        entityId: service.id,
        action: "service.created",
        summary: `Created service ${service.name}.`,
        createdAt: now,
      });
      return service;
    },
    async updateService(
      tenantId: string,
      serviceId: string,
      payload: ServiceMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.service.findFirst({
            where: { tenantId, id: serviceId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.service.update({
            where: { id: serviceId },
            data: {
              name: payload.name,
              durationMinutes: payload.durationMinutes,
              priceCents: payload.priceCents,
            },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "service",
            entityId: updated.id,
            action: "service.updated",
            summary: `Updated service ${updated.name}.`,
            metadata: {
              before: {
                name: existing.name,
                durationMinutes: existing.durationMinutes,
                priceCents: existing.priceCents,
              },
              after: {
                name: updated.name,
                durationMinutes: updated.durationMinutes,
                priceCents: updated.priceCents,
              },
            },
          });
          return mapServiceRecord(updated);
        }
      }

      const store = getMockStore();
      const service = store.services.find(
        (item) => item.tenantId === tenantId && item.id === serviceId && !item.deletedAt,
      );
      if (!service) {
        return null;
      }

      const before = {
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      };

      service.name = payload.name;
      service.durationMinutes = payload.durationMinutes;
      service.priceCents = payload.priceCents;
      service.updatedAt = isoNow();

      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "service",
        entityId: service.id,
        action: "service.updated",
        summary: `Updated service ${service.name}.`,
        createdAt: isoNow(),
        metadata: {
          before,
          after: {
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents,
          },
        },
      });
      return service;
    },
    async softDeleteService(tenantId: string, serviceId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.service.findFirst({
            where: { tenantId, id: serviceId, deletedAt: null },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.service.update({
            where: { id: serviceId },
            data: { deletedAt: new Date(), isActive: false },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "service",
            entityId: updated.id,
            action: "service.archived",
            summary: `Archived service ${updated.name}.`,
          });
          return mapServiceRecord(updated);
        }
      }

      const store = getMockStore();
      const service = store.services.find(
        (item) => item.tenantId === tenantId && item.id === serviceId && !item.deletedAt,
      );
      if (!service) {
        return null;
      }

      const now = isoNow();
      service.deletedAt = now;
      service.updatedAt = now;
      service.isActive = false;
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "service",
        entityId: service.id,
        action: "service.archived",
        summary: `Archived service ${service.name}.`,
        createdAt: now,
      });
      return service;
    },
    async listBookings(options: BookingListOptions): Promise<PaginationResult<BookingRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const bookings = await prisma.booking.findMany({
            where: { tenantId: options.tenantId, deletedAt: null },
            include: { customer: true, service: true },
          });
          const filtered = bookings
            .map(mapBookingRecord)
            .filter((booking) =>
              matchesQuery(
                `${booking.customerName} ${booking.serviceName} ${booking.channel}`,
                options.query,
              ),
            )
            .filter((booking) =>
              options.status && options.status !== "all" ? booking.status === options.status : true,
            );
          const sorted = sortBookings(filtered, options.sortBy, options.sortOrder);
          return paginate(sorted, options.page, options.pageSize);
        }
      }

      const store = getMockStore();
      const filtered = store.bookings
        .filter((booking) => booking.tenantId === options.tenantId && !booking.deletedAt)
        .filter((booking) => matchesQuery(`${booking.customerName} ${booking.serviceName} ${booking.channel}`, options.query))
        .filter((booking) => (options.status && options.status !== "all" ? booking.status === options.status : true))
      const sorted = sortBookings(filtered, options.sortBy, options.sortOrder);
      return paginate(sorted, options.page, options.pageSize);
    },
    async getBookingById(tenantId: string, bookingId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const booking = await prisma.booking.findFirst({
            where: { tenantId, id: bookingId, deletedAt: null },
            include: { customer: true, service: true },
          });
          return booking ? mapBookingRecord(booking) : null;
        }
      }

      return (
        getMockStore().bookings.find(
          (booking) => booking.tenantId === tenantId && booking.id === bookingId && !booking.deletedAt,
        ) ?? null
      );
    },
    async listBookingPayments(tenantId: string, bookingId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const payments = await prisma.payment.findMany({
            where: { tenantId, bookingId, deletedAt: null },
            include: { customer: true, booking: { include: { service: true } } },
            orderBy: { createdAt: "desc" },
          });
          return payments.map(mapPaymentRecord);
        }
      }

      return getMockStore()
        .payments.filter((payment) => payment.tenantId === tenantId && payment.bookingId === bookingId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async listBookingTimeline(tenantId: string, bookingId: string): Promise<ActivityTimelineItem[]> {
      const [booking, payments, auditLogs] = await Promise.all([
        this.getBookingById(tenantId, bookingId),
        this.listBookingPayments(tenantId, bookingId),
        this.listRecentAuditLogs(tenantId),
      ]);

      if (!booking) {
        return [];
      }

      const relatedAuditLogs = auditLogs.filter(
        (item) =>
          (item.entityType === "booking" && item.entityId === bookingId) ||
          item.summary.toLowerCase().includes(booking.customerName.toLowerCase()),
      );

      const items: ActivityTimelineItem[] = [
        {
          id: `booking-created-${booking.id}`,
          occurredAt: booking.createdAt,
          title: "Booking created",
          description: `${booking.customerName} booked ${booking.serviceName} via ${booking.channel}.`,
          entityType: "booking",
          tone: "info",
        },
        {
          id: `booking-schedule-${booking.id}`,
          occurredAt: booking.startAt,
          title: "Service scheduled",
          description: `${booking.startAt.slice(0, 16).replace("T", " ")} to ${booking.endAt.slice(0, 16).replace("T", " ")}.`,
          entityType: "schedule",
          tone: "default",
        },
      ];

      if (booking.notes) {
        items.push({
          id: `booking-notes-${booking.id}`,
          occurredAt: booking.updatedAt,
          title: "Booking notes updated",
          description: booking.notes,
          entityType: "booking_note",
          tone: "default",
        });
      }

      for (const payment of payments) {
        items.push({
          id: `payment-${payment.id}`,
          occurredAt: payment.paidAt ?? payment.createdAt,
          title: `Payment ${payment.status}`,
          description: `${payment.provider} ${payment.paymentMethod || "payment"} for ${(payment.amountCents / 100).toLocaleString("en-AU", { style: "currency", currency: payment.currency })}.`,
          entityType: "payment",
          tone:
            payment.status === "paid"
              ? "success"
              : payment.status === "pending"
                ? "warning"
                : payment.status === "refunded"
                  ? "warning"
                  : "default",
        });
      }

      for (const auditLog of relatedAuditLogs) {
        items.push({
          id: `audit-${auditLog.id}`,
          occurredAt: auditLog.createdAt,
          title: auditLog.action,
          description: auditLog.summary,
          entityType: "audit",
          tone: "default",
        });
      }

      return sortTimeline(items);
    },
    async createBooking(
      tenantId: string,
      payload: BookingMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const created = await prisma.booking.create({
            data: {
              tenantId,
              customerId: payload.customerId,
              serviceId: payload.serviceId,
              status: payload.status as any,
              startAt: new Date(payload.startAt),
              endAt: new Date(payload.endAt),
              revenueCents: payload.revenueCents,
              channel: payload.channel,
              notes: normalizeOptional(payload.notes) ?? null,
            },
            include: { customer: true, service: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "booking",
            entityId: created.id,
            action: "booking.created",
            summary: `Created booking ${created.id} for ${created.customer.fullName}.`,
          });
          return mapBookingRecord(created);
        }
      }

      const store = getMockStore();
      const customer = store.customers.find((item) => item.id === payload.customerId);
      const service = store.services.find((item) => item.id === payload.serviceId);
      const now = isoNow();
      const booking: BookingRecord = {
        id: randomUUID(),
        tenantId,
        customerId: payload.customerId,
        customerName: customer ? customer.fullName : "Unknown customer",
        serviceId: payload.serviceId,
        serviceName: service?.name ?? "Unknown service",
        status: payload.status,
        startAt: payload.startAt,
        endAt: payload.endAt,
        revenueCents: payload.revenueCents,
        channel: payload.channel,
        notes: normalizeOptional(payload.notes),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.bookings.unshift(booking);
      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "booking",
        entityId: booking.id,
        action: "booking.created",
        summary: `Created booking ${booking.id} for ${booking.customerName}.`,
        createdAt: now,
      });
      return booking;
    },
    async updateBooking(
      tenantId: string,
      bookingId: string,
      payload: BookingMutationInput,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.booking.findFirst({
            where: { tenantId, id: bookingId, deletedAt: null },
            include: { customer: true, service: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
              customerId: payload.customerId,
              serviceId: payload.serviceId,
              status: payload.status as any,
              startAt: new Date(payload.startAt),
              endAt: new Date(payload.endAt),
              revenueCents: payload.revenueCents,
              channel: payload.channel,
              notes: normalizeOptional(payload.notes) ?? null,
            },
            include: { customer: true, service: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "booking",
            entityId: updated.id,
            action: "booking.updated",
            summary: `Updated booking ${updated.id}.`,
          });
          return mapBookingRecord(updated);
        }
      }

      const store = getMockStore();
      const booking = store.bookings.find(
        (item) => item.tenantId === tenantId && item.id === bookingId && !item.deletedAt,
      );
      if (!booking) {
        return null;
      }

      const customer = store.customers.find((item) => item.id === payload.customerId);
      const service = store.services.find((item) => item.id === payload.serviceId);

      booking.customerId = payload.customerId;
      booking.customerName = customer ? customer.fullName : booking.customerName;
      booking.serviceId = payload.serviceId;
      booking.serviceName = service?.name ?? booking.serviceName;
      booking.status = payload.status;
      booking.startAt = payload.startAt;
      booking.endAt = payload.endAt;
      booking.revenueCents = payload.revenueCents;
      booking.channel = payload.channel;
      booking.notes = normalizeOptional(payload.notes);
      booking.updatedAt = isoNow();

      store.auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "booking",
        entityId: booking.id,
        action: "booking.updated",
        summary: `Updated booking ${booking.id}.`,
        createdAt: isoNow(),
      });
      return booking;
    },
    async confirmBooking(tenantId: string, bookingId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.booking.findFirst({
            where: { tenantId, id: bookingId, deletedAt: null },
            include: { customer: true, service: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" as any },
            include: { customer: true, service: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "booking",
            entityId: updated.id,
            action: "booking.confirmed",
            summary: `Confirmed booking ${updated.id}.`,
          });
          return mapBookingRecord(updated);
        }
      }

      const booking = await this.getBookingById(tenantId, bookingId);
      if (!booking) {
        return null;
      }
      booking.status = "CONFIRMED";
      booking.updatedAt = isoNow();
      getMockStore().auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "booking",
        entityId: booking.id,
        action: "booking.confirmed",
        summary: `Confirmed booking ${booking.id}.`,
        createdAt: isoNow(),
      });
      return booking;
    },
    async cancelBooking(tenantId: string, bookingId: string, actorUserId: string) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.booking.findFirst({
            where: { tenantId, id: bookingId, deletedAt: null },
            include: { customer: true, service: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" as any },
            include: { customer: true, service: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "booking",
            entityId: updated.id,
            action: "booking.cancelled",
            summary: `Cancelled booking ${updated.id}.`,
          });
          return mapBookingRecord(updated);
        }
      }

      const booking = await this.getBookingById(tenantId, bookingId);
      if (!booking) {
        return null;
      }
      booking.status = "CANCELLED";
      booking.updatedAt = isoNow();
      getMockStore().auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "booking",
        entityId: booking.id,
        action: "booking.cancelled",
        summary: `Cancelled booking ${booking.id}.`,
        createdAt: isoNow(),
      });
      return booking;
    },
    async rescheduleBooking(
      tenantId: string,
      bookingId: string,
      startAt: string,
      endAt: string,
      actorUserId: string,
    ) {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const existing = await prisma.booking.findFirst({
            where: { tenantId, id: bookingId, deletedAt: null },
            include: { customer: true, service: true },
          });
          if (!existing) {
            return null;
          }

          const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
              startAt: new Date(startAt),
              endAt: new Date(endAt),
            },
            include: { customer: true, service: true },
          });
          await this.appendAuditLog({
            tenantId,
            actorUserId,
            entityType: "booking",
            entityId: updated.id,
            action: "booking.rescheduled",
            summary: `Rescheduled booking ${updated.id}.`,
          });
          return mapBookingRecord(updated);
        }
      }

      const booking = await this.getBookingById(tenantId, bookingId);
      if (!booking) {
        return null;
      }
      booking.startAt = startAt;
      booking.endAt = endAt;
      booking.updatedAt = isoNow();
      getMockStore().auditLogs.unshift({
        id: randomUUID(),
        tenantId,
        actorUserId,
        entityType: "booking",
        entityId: booking.id,
        action: "booking.rescheduled",
        summary: `Rescheduled booking ${booking.id}.`,
        createdAt: isoNow(),
      });
      return booking;
    },
    async listRecentAuditLogs(tenantId: string) {
      const result = await this.listAuditLogs({
        tenantId,
        page: 1,
        pageSize: 12,
      });
      return result.items;
    },
    async listAuditLogs(options: AuditLogListOptions): Promise<PaginationResult<AuditLogRecord>> {
      if (isDatabaseConfigured()) {
        const prisma = getPrismaClient();
        if (prisma) {
          const items = await prisma.auditLog.findMany({
            where: {
              tenantId: options.tenantId,
              ...(options.entityType && options.entityType !== "all"
                ? { entityType: options.entityType }
                : {}),
            },
            orderBy: { createdAt: "desc" },
            take: Math.max(options.pageSize ?? 12, 1),
            skip: Math.max((options.page ?? 1) - 1, 0) * Math.max(options.pageSize ?? 12, 1),
          });

          const mapped = items.map((item) => {
            const metadata =
              item.metadataJson && typeof item.metadataJson === "object" && !Array.isArray(item.metadataJson)
                ? (item.metadataJson as Record<string, unknown>)
                : undefined;

            return {
              id: item.id,
              tenantId: item.tenantId,
              actorUserId: item.actorUserId || undefined,
              entityType: item.entityType,
              entityId: item.entityId,
              action: item.action,
              summary: typeof metadata?.summary === "string" ? metadata.summary : item.action,
              createdAt: item.createdAt.toISOString(),
              metadata,
            } satisfies AuditLogRecord;
          }).filter((item) =>
            matchesQuery(
              `${item.entityType} ${item.entityId} ${item.action} ${item.summary}`,
              options.query,
            ),
          );

          return paginate(mapped, options.page, options.pageSize);
        }
      }

      const filtered = getMockStore()
        .auditLogs.filter((item) => item.tenantId === options.tenantId)
        .filter((item) =>
          options.entityType && options.entityType !== "all" ? item.entityType === options.entityType : true,
        )
        .filter((item) =>
          matchesQuery(`${item.entityType} ${item.entityId} ${item.action} ${item.summary}`, options.query),
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      return paginate(filtered, options.page, options.pageSize);
    },
  };
}
