import "server-only";

import { redirect } from "next/navigation";

import { getAdminSession, type AdminSession } from "@/lib/auth/session";

export async function requireAdminSession(): Promise<AdminSession> {
  try {
    return await getAdminSession();
  } catch {
    redirect("/admin-login?reason=required");
  }
}
