import "server-only";

import { getBackendApiBaseUrl } from "@/server/admin/backend-api";

type DeliveryResult = {
  status: "sent" | "debug";
  operatorNote: string;
  debugCode?: string;
};

export async function deliverAdminLoginCode(input: {
  email: string;
  code: string;
  tenantName?: string;
  tenantSlug?: string;
}): Promise<DeliveryResult> {
  const workspaceUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://admin.bookedai.au/admin-login";
  const subject = "Your BookedAI admin sign-in code";
  const tenantLabel = input.tenantName || input.tenantSlug || "BookedAI admin";
  const text = [
    "Hello,",
    "",
    "Use this BookedAI admin verification code to sign in:",
    "",
    input.code,
    "",
    "This code expires in 10 minutes.",
    `Workspace: ${tenantLabel}`,
    `Open admin login: ${workspaceUrl}`,
  ].join("\n");
  const html = [
    '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">',
    "<p>Hello,</p>",
    "<p>Use this BookedAI admin verification code to sign in.</p>",
    `<p style="font-size:32px;font-weight:700;letter-spacing:0.18em;margin:20px 0">${input.code}</p>`,
    "<p>This code expires in 10 minutes.</p>",
    `<p style="font-size:13px;color:#475569">Workspace: ${tenantLabel}<br>Open admin login: <a href="${workspaceUrl}">${workspaceUrl}</a></p>`,
    "</div>",
  ].join("");

  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim();
  if (!adminApiToken) {
    if (process.env.NODE_ENV !== "production") {
      return {
        status: "debug",
        operatorNote: "ADMIN_API_TOKEN is not configured, so the admin login code is exposed in development only.",
        debugCode: input.code,
      };
    }

    throw new Error("ADMIN_API_TOKEN is required to deliver admin login codes.");
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/email/send`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${adminApiToken}`,
    },
    body: JSON.stringify({
      to: [input.email],
      subject,
      text,
      html,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      return {
        status: "debug",
        operatorNote:
          payload?.detail || "SMTP delivery failed, so the admin login code is exposed in development only.",
        debugCode: input.code,
      };
    }

    throw new Error(payload?.detail || "Admin sign-in email delivery failed.");
  }

  return {
    status: "sent",
    operatorNote: "Admin login code sent by email.",
  };
}
