"use server";

import { revalidatePath } from "next/cache";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { syncAdminCallScheduledToZoho } from "@/lib/integrations/zoho-call-scheduled-sync";
import { syncAdminLeadQualificationToZoho } from "@/lib/integrations/zoho-lead-qualification-sync";
import { retryZohoCrmSyncRecord } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import {
  leadFollowUpMutationSchema,
  leadFormSchema,
  leadNoteMutationSchema,
} from "@/lib/validation/admin";

function toPayload(formData: FormData) {
  return leadFormSchema.parse({
    title: formData.get("title"),
    source: formData.get("source"),
    status: formData.get("status"),
    pipelineStage: formData.get("pipelineStage"),
    score: formData.get("score"),
    estimatedValueCents: formData.get("estimatedValueCents"),
    ownerName: formData.get("ownerName"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    lastContactAt: formData.get("lastContactAt"),
    notes: formData.get("notes"),
  });
}

export async function createLeadAction(formData: FormData) {
  const session = await requirePermission("leads:create");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  await getAdminRepository().createLead(tenant.tenantId, payload, session.userId);
  revalidatePath("/admin/leads");
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const session = await requirePermission("leads:update");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  const repository = getAdminRepository();
  const updatedLead = await repository.updateLead(tenant.tenantId, leadId, payload, session.userId);
  const shouldSyncQualifiedLead =
    payload.status.trim().toLowerCase() === "qualified" ||
    payload.pipelineStage.trim().toLowerCase() === "qualified";

  if (updatedLead && shouldSyncQualifiedLead) {
    const customer = updatedLead.customerId
      ? await repository.getCustomerById(tenant.tenantId, updatedLead.customerId)
      : null;
    await syncAdminLeadQualificationToZoho({
      tenantId: tenant.tenantId,
      leadId: updatedLead.id,
      fullName: customer?.fullName ?? updatedLead.customerName ?? updatedLead.title,
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
      source: updatedLead.source,
      companyName: updatedLead.title,
      dealName: updatedLead.title,
      notes: updatedLead.notes ?? null,
      estimatedValueAud:
        Number.isFinite(updatedLead.estimatedValueCents) && updatedLead.estimatedValueCents > 0
          ? updatedLead.estimatedValueCents / 100
          : null,
      actorUserId: session.userId,
    });
  }
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function archiveLeadAction(leadId: string) {
  const session = await requirePermission("leads:delete");
  const tenant = await getTenantContext();
  await getAdminRepository().softDeleteLead(tenant.tenantId, leadId, session.userId);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function convertLeadToCustomerAction(leadId: string) {
  await requirePermission("leads:update");
  const session = await requirePermission("customers:create");
  const tenant = await getTenantContext();
  await getAdminRepository().convertLeadToCustomer(tenant.tenantId, leadId, session.userId);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/customers");
}

export async function convertLeadToBookingAction(leadId: string, formData: FormData) {
  await requirePermission("leads:update");
  const session = await requirePermission("bookings:create");
  const tenant = await getTenantContext();
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  if (!serviceId) {
    throw new Error("Service is required for lead-to-booking conversion.");
  }
  await getAdminRepository().convertLeadToBooking(tenant.tenantId, leadId, serviceId, session.userId);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/customers");
}

export async function addLeadNoteAction(leadId: string, formData: FormData) {
  const session = await requirePermission("leads:update");
  const tenant = await getTenantContext();
  const payload = leadNoteMutationSchema.parse({
    note: formData.get("note"),
    contactAt: formData.get("contactAt"),
  });
  await getAdminRepository().appendLeadNote(
    tenant.tenantId,
    leadId,
    {
      note: payload.note,
      contactAt: payload.contactAt || undefined,
    },
    session.userId,
  );
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function scheduleLeadFollowUpAction(leadId: string, formData: FormData) {
  const session = await requirePermission("leads:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const payload = leadFollowUpMutationSchema.parse({
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    ownerName: formData.get("ownerName"),
    note: formData.get("note"),
  });
  const updatedLead = await repository.scheduleLeadFollowUp(
    tenant.tenantId,
    leadId,
    {
      nextFollowUpAt: payload.nextFollowUpAt,
      ownerName: payload.ownerName || undefined,
      note: payload.note || undefined,
    },
    session.userId,
  );

  if (updatedLead) {
    const customer = updatedLead.customerId
      ? await repository.getCustomerById(tenant.tenantId, updatedLead.customerId)
      : null;
    await syncAdminCallScheduledToZoho({
      tenantId: tenant.tenantId,
      leadId: updatedLead.id,
      fullName: customer?.fullName ?? updatedLead.customerName ?? updatedLead.title,
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
      source: updatedLead.source,
      serviceName: updatedLead.title,
      scheduledFor: payload.nextFollowUpAt,
      ownerName: payload.ownerName || updatedLead.ownerName || null,
      note: payload.note || updatedLead.notes || null,
      actorUserId: session.userId,
    });
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function retryLeadCrmSyncAction(leadId: string, crmSyncRecordId: number) {
  const session = await requirePermission("leads:update");
  const tenant = await getTenantContext();

  await retryZohoCrmSyncRecord({
    tenantId: tenant.tenantId,
    crmSyncRecordId,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}
