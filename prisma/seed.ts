import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  BookingStatus,
  CampaignStatus,
  LeadStatus,
  TenantStatus,
  UserStatus,
} from "@prisma/client";
import { Pool } from "pg";

function getPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.replace(
    /^postgresql\+asyncpg:\/\//,
    "postgresql://",
  );
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run prisma seed.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = getPrismaClient();

  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const alphaTenant = await prisma.tenant.create({
    data: {
      slug: "harbor-dental",
      name: "Harbor Dental Group",
      status: TenantStatus.ACTIVE,
      timezone: "Australia/Sydney",
      locale: "en-AU",
      currency: "AUD",
    },
  });

  const betaTenant = await prisma.tenant.create({
    data: {
      slug: "lotus-spa",
      name: "Lotus Spa Collective",
      status: TenantStatus.TRIAL,
      timezone: "Asia/Ho_Chi_Minh",
      locale: "vi-VN",
      currency: "VND",
    },
  });

  const [alphaAdminRole, alphaSalesRole, betaAdminRole, betaOpsRole] = await Promise.all([
    prisma.role.create({
      data: {
        tenantId: alphaTenant.id,
        name: "Tenant Admin",
        slug: "tenant-admin",
        description: "Full access to tenant revenue operations.",
      },
    }),
    prisma.role.create({
      data: {
        tenantId: alphaTenant.id,
        name: "Sales Manager",
        slug: "sales-manager",
        description: "Owns lead follow-up and booking conversion.",
      },
    }),
    prisma.role.create({
      data: {
        tenantId: betaTenant.id,
        name: "Tenant Admin",
        slug: "tenant-admin",
        description: "Full access to spa workspace settings.",
      },
    }),
    prisma.role.create({
      data: {
        tenantId: betaTenant.id,
        name: "Operations Manager",
        slug: "operations-manager",
        description: "Handles schedule, service delivery, and bookings.",
      },
    }),
  ]);

  const [alphaAdmin, alphaSales, betaAdmin, betaOps] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: alphaTenant.id,
        email: "amy@harbordental.example",
        name: "Amy Tran",
        passwordHash: "seeded-password-hash",
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: alphaTenant.id,
        email: "leo@harbordental.example",
        name: "Leo Nguyen",
        passwordHash: "seeded-password-hash",
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: betaTenant.id,
        email: "mina@lotusspa.example",
        name: "Mina Pham",
        passwordHash: "seeded-password-hash",
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: betaTenant.id,
        email: "ops@lotusspa.example",
        name: "Khoa Bui",
        passwordHash: "seeded-password-hash",
        status: UserStatus.INVITED,
      },
    }),
  ]);

  await prisma.userRole.createMany({
    data: [
      { tenantId: alphaTenant.id, userId: alphaAdmin.id, roleId: alphaAdminRole.id },
      { tenantId: alphaTenant.id, userId: alphaSales.id, roleId: alphaSalesRole.id },
      { tenantId: betaTenant.id, userId: betaAdmin.id, roleId: betaAdminRole.id },
      { tenantId: betaTenant.id, userId: betaOps.id, roleId: betaOpsRole.id },
    ],
  });

  const alphaPermissions = await prisma.permission.createManyAndReturn({
    data: [
      {
        tenantId: alphaTenant.id,
        name: "View dashboard",
        slug: "dashboard.view",
        description: "Read tenant revenue dashboard.",
        category: "dashboard",
      },
      {
        tenantId: alphaTenant.id,
        name: "Manage customers",
        slug: "customers.manage",
        description: "Create and update customer records.",
        category: "customers",
      },
      {
        tenantId: alphaTenant.id,
        name: "Manage bookings",
        slug: "bookings.manage",
        description: "Create, update, and reschedule bookings.",
        category: "bookings",
      },
    ],
  });

  await prisma.rolePermission.createMany({
    data: [
      ...alphaPermissions.map((permission) => ({
        tenantId: alphaTenant.id,
        roleId: alphaAdminRole.id,
        permissionId: permission.id,
      })),
      {
        tenantId: alphaTenant.id,
        roleId: alphaSalesRole.id,
        permissionId: alphaPermissions.find((item) => item.slug === "dashboard.view")!.id,
      },
      {
        tenantId: alphaTenant.id,
        roleId: alphaSalesRole.id,
        permissionId: alphaPermissions.find((item) => item.slug === "customers.manage")!.id,
      },
    ],
  });

  await prisma.branch.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        name: "Harbor Dental Sydney",
        slug: "sydney-clinic",
        timezone: "Australia/Sydney",
      },
      {
        tenantId: betaTenant.id,
        name: "Lotus Spa District 1",
        slug: "district-1",
        timezone: "Asia/Ho_Chi_Minh",
      },
    ],
  });

  await prisma.tenantSetting.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        key: "branding",
        valueJson: {
          logoUrl: "https://upload.bookedai.au/branding/harbor-dental/logo.svg",
          introductionHtml: "<p>Harbor Dental Group helps families and executives book care faster.</p>",
        },
      },
      {
        tenantId: betaTenant.id,
        key: "branding",
        valueJson: {
          logoUrl: "https://upload.bookedai.au/branding/lotus-spa/logo.svg",
          introductionHtml: "<p>Lotus Spa Collective focuses on premium wellness recovery experiences.</p>",
        },
      },
    ],
  });

  const [alphaSubscription, betaSubscription] = await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId: alphaTenant.id,
        provider: "stripe",
        externalId: "sub_alpha_seeded",
        planCode: "pro",
        status: "active",
        renewsAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: betaTenant.id,
        provider: "stripe",
        externalId: "sub_beta_seeded",
        planCode: "freemium",
        status: "trialing",
        renewsAt: new Date("2026-05-05T00:00:00.000Z"),
      },
    }),
  ]);

  await prisma.invoice.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        subscriptionId: alphaSubscription.id,
        provider: "stripe",
        externalId: "inv_alpha_seeded",
        amountCents: 12900,
        currency: "AUD",
        status: "paid",
        dueAt: new Date("2026-04-15T00:00:00.000Z"),
        paidAt: new Date("2026-04-14T10:00:00.000Z"),
      },
      {
        tenantId: betaTenant.id,
        subscriptionId: betaSubscription.id,
        provider: "stripe",
        externalId: "inv_beta_seeded",
        amountCents: 0,
        currency: "VND",
        status: "draft",
        dueAt: new Date("2026-05-05T00:00:00.000Z"),
      },
    ],
  });

  const [alphaCustomerA, alphaCustomerB, betaCustomerA] = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: alphaTenant.id,
        firstName: "Sarah",
        lastName: "Lim",
        fullName: "Sarah Lim",
        email: "sarah.lim@example.com",
        phone: "+61400000001",
        company: "Northshore Families",
        lifecycleStage: "active",
        sourceLabel: "website_chat",
        tagsJson: ["vip", "family"],
        marketingConsent: true,
        notes: "Prefers morning appointments.",
        notesSummary: "Prefers morning appointments.",
        totalBookings: 3,
        totalRevenueCents: 145000,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: alphaTenant.id,
        firstName: "Oliver",
        lastName: "Chen",
        fullName: "Oliver Chen",
        email: "oliver.chen@example.com",
        phone: "+61400000002",
        company: "Harbor Tech",
        lifecycleStage: "prospect",
        sourceLabel: "missed_call_recovery",
        tagsJson: ["follow_up"],
        marketingConsent: false,
        notes: "Requested pricing details for whitening.",
        notesSummary: "Requested pricing details for whitening.",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: betaTenant.id,
        firstName: "Linh",
        lastName: "Vo",
        fullName: "Linh Vo",
        email: "linh.vo@example.com",
        phone: "+84900000001",
        company: "Lotus Wellness Club",
        lifecycleStage: "vip",
        sourceLabel: "instagram_campaign",
        tagsJson: ["vip", "wellness"],
        marketingConsent: true,
        notes: "Interested in monthly recovery package.",
        notesSummary: "Interested in monthly recovery package.",
        totalBookings: 5,
        totalRevenueCents: 8200000,
      },
    }),
  ]);

  await prisma.campaign.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        name: "Missed Call Recovery Sprint",
        channel: "ops_reactivation",
        sourcePlatform: "telephony",
        sourceKey: "missed_call_recovery",
        status: CampaignStatus.ACTIVE,
        budgetCents: 120000,
        startDate: new Date("2026-04-10T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        utmSource: "ops",
        utmMedium: "callback",
        utmCampaign: "missed-call-sprint",
        notes: "Operational callback sprint for missed lead recovery.",
      },
      {
        tenantId: betaTenant.id,
        name: "Instagram Glow Launch",
        channel: "paid_social",
        sourcePlatform: "instagram",
        sourceKey: "instagram_campaign",
        status: CampaignStatus.ACTIVE,
        budgetCents: 750000,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T23:59:59.000Z"),
        utmSource: "instagram",
        utmMedium: "paid_social",
        utmCampaign: "glow-launch-apr",
        notes: "Drive premium wellness package interest from social acquisition.",
      },
    ],
  });

  const [alphaServiceA, alphaServiceB, betaServiceA] = await Promise.all([
    prisma.service.create({
      data: {
        tenantId: alphaTenant.id,
        name: "New Patient Consultation",
        category: "Dental",
        description: "Initial assessment and treatment planning.",
        durationMinutes: 45,
        priceCents: 12500,
        currency: "AUD",
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        tenantId: alphaTenant.id,
        name: "Teeth Whitening",
        category: "Cosmetic",
        description: "In-chair whitening session.",
        durationMinutes: 60,
        priceCents: 38000,
        currency: "AUD",
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        tenantId: betaTenant.id,
        name: "Hot Stone Massage",
        category: "Massage",
        description: "60-minute restorative treatment.",
        durationMinutes: 60,
        priceCents: 950000,
        currency: "VND",
        isActive: true,
      },
    }),
  ]);

  await prisma.lead.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        customerId: alphaCustomerB.id,
        title: "Whitening package enquiry",
        source: "website",
        status: LeadStatus.QUALIFIED,
        pipelineStage: "qualified",
        score: 84,
        estimatedValueCents: 38000,
        ownerName: alphaSales.name,
        nextFollowUpAt: new Date("2026-04-24T02:30:00.000Z"),
        lastContactAt: new Date("2026-04-21T06:30:00.000Z"),
        notes: "Asked for weekend availability.",
      },
      {
        tenantId: alphaTenant.id,
        customerId: alphaCustomerA.id,
        title: "Family check-up renewal",
        source: "phone",
        status: LeadStatus.WON,
        pipelineStage: "booked",
        score: 90,
        estimatedValueCents: 54000,
        ownerName: alphaAdmin.name,
        nextFollowUpAt: new Date("2026-04-22T14:00:00.000Z"),
        lastContactAt: new Date("2026-04-21T12:30:00.000Z"),
        notes: "Converted to family package.",
      },
      {
        tenantId: betaTenant.id,
        customerId: betaCustomerA.id,
        title: "Corporate wellness trial",
        source: "instagram",
        status: LeadStatus.CONTACTED,
        pipelineStage: "follow_up",
        score: 76,
        estimatedValueCents: 2200000,
        ownerName: betaAdmin.name,
        nextFollowUpAt: new Date("2026-04-23T10:00:00.000Z"),
        lastContactAt: new Date("2026-04-21T08:00:00.000Z"),
        notes: "Needs 10-person team package proposal.",
      },
    ],
  });

  await prisma.booking.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        customerId: alphaCustomerA.id,
        serviceId: alphaServiceA.id,
        status: BookingStatus.CONFIRMED,
        startAt: new Date("2026-04-25T09:00:00.000Z"),
        endAt: new Date("2026-04-25T09:45:00.000Z"),
        revenueCents: 12500,
        channel: "website",
        notes: "Booked from online form.",
      },
      {
        tenantId: alphaTenant.id,
        customerId: alphaCustomerB.id,
        serviceId: alphaServiceB.id,
        status: BookingStatus.PENDING,
        startAt: new Date("2026-04-27T02:00:00.000Z"),
        endAt: new Date("2026-04-27T03:00:00.000Z"),
        revenueCents: 38000,
        channel: "phone",
        notes: "Waiting on deposit confirmation.",
      },
      {
        tenantId: betaTenant.id,
        customerId: betaCustomerA.id,
        serviceId: betaServiceA.id,
        status: BookingStatus.COMPLETED,
        startAt: new Date("2026-04-20T10:00:00.000Z"),
        endAt: new Date("2026-04-20T11:00:00.000Z"),
        revenueCents: 950000,
        channel: "instagram",
        notes: "Upsold aromatherapy add-on offline.",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: alphaTenant.id,
        actorUserId: alphaAdmin.id,
        entityType: "customer",
        entityId: alphaCustomerA.id,
        action: "seed.created_customer",
      },
      {
        tenantId: alphaTenant.id,
        actorUserId: alphaSales.id,
        entityType: "lead",
        entityId: alphaCustomerB.id,
        action: "seed.created_lead",
      },
      {
        tenantId: betaTenant.id,
        actorUserId: betaAdmin.id,
        entityType: "booking",
        entityId: betaServiceA.id,
        action: "seed.created_booking",
      },
    ],
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
