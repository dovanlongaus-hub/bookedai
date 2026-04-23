"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { userAccessMutationSchema, userMutationSchema } from "@/lib/validation/admin";

function parseUserPayload(formData: FormData) {
  const payload = userMutationSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    status: formData.get("status"),
    roleId: formData.get("roleId"),
  });

  return {
    ...payload,
    roleId: payload.roleId || undefined,
  };
}

function parseUserAccessPayload(formData: FormData) {
  const payload = userAccessMutationSchema.parse({
    status: formData.get("status"),
    roleId: formData.get("roleId"),
  });

  return {
    ...payload,
    roleId: payload.roleId || undefined,
  };
}

export async function createTeamMemberAction(formData: FormData) {
  const session = await requirePermission("users:create");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.createUser(tenant.tenantId, parseUserPayload(formData), session.userId);
  revalidatePath("/admin/team");
  redirect("/admin/team");
}

export async function updateTeamMemberAccessAction(userId: string, formData: FormData) {
  const session = await requirePermission("users:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateUserAccess(
    tenant.tenantId,
    userId,
    parseUserAccessPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/team");
  redirect("/admin/team");
}
