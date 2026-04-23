import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE_NAME, type AdminSession } from "@/lib/auth/session";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}

export function withAdminSessionCookie(
  response: NextResponse,
  token: string,
  session: AdminSession,
) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(session.expiresAt),
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}

export async function setAdminSessionCookieForAction(token: string, session: AdminSession) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(session.expiresAt),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookieForAction() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}
