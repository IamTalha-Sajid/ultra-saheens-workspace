import { NextResponse } from "next/server";
import { auth } from "@/auth";

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "email" && typeof v === "string" ? "" : redact(v);
    }
    return out;
  }
  return value;
}

/**
 * Wraps a route handler so JSON responses sent to directors have every `email`
 * field blanked. Directors have no company email and shouldn't see members'.
 * Uses the session role (JWT), which is fine here: it only narrows output.
 */
export function redactForDirectors<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    const res = await handler(...args);
    if (!res.headers.get("content-type")?.includes("application/json")) return res;
    const session = await auth();
    if (session?.user?.role !== "director") return res;
    return NextResponse.json(redact(await res.json()), { status: res.status });
  };
}
