import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function adminJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "validation_error",
          message: "Request validation failed.",
          issues: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    if (
      error.message.includes("Authentication required") ||
      error.message.includes("admin session") ||
      error.message.includes("Missing admin session signing secret")
    ) {
      return NextResponse.json(
        { ok: false, error: { code: "unauthorized", message: error.message } },
        { status: 401 },
      );
    }

    if (error.message.includes("Missing permission")) {
      return NextResponse.json(
        { ok: false, error: { code: "forbidden", message: error.message } },
        { status: 403 },
      );
    }

    if (error.message.includes("No tenant is available")) {
      return NextResponse.json(
        { ok: false, error: { code: "tenant_unavailable", message: error.message } },
        { status: 404 },
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "internal_error",
        message: "Unexpected admin API error.",
      },
    },
    { status: 500 },
  );
}
