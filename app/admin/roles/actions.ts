"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { rolePermissionMutationSchema } from "@/lib/validation/admin";

function parsePayload(formData: FormData) {
  return rolePermissionMutationSchema.parse({
    permissionSlugs: formData.getAll("permissionSlugs").map((value) => String(value)),
  });
}

export async function updateRolePermissionsAction(roleId: string, formData: FormData) {
  const session = await requirePermission("roles:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateRolePermissions(
    tenant.tenantId,
    roleId,
    parsePayload(formData),
    session.userId,
  );
  revalidatePath("/admin/roles");
  revalidatePath("/admin/team");
  redirect("/admin/roles");
}
