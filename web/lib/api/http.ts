import { NextResponse } from "next/server";

/**
 * Shared plumbing for `app/api/v1`, the surface the Expo app talks to.
 *
 * Three things live here and nothing else.
 *
 * CORS, because Expo Go runs on a different origin than the dev server and a
 * phone on the site WiFi is not `localhost`. The allowlist is open in
 * development and reads `TRACE_MOBILE_ORIGINS` in production, so shipping does
 * not require finding this file.
 *
 * The device header, which is the honest stand in for a session. Spec de-scopes
 * real auth to a role picker and this build has no verified credential, so the
 * server records which handset sent a thing rather than pretending to know who
 * did. When Supabase phone auth lands, `identify` reads the bearer token and
 * every call site here stays as it is.
 *
 * The envelope. Every response carries `provenance`, so a client can never
 * render a confidence, a tier or a margin without also knowing that no matcher
 * produced it. The field surface never shows those numbers anyway; the flag
 * exists so that stays a decision rather than an accident.
 */

export const MOBILE_API_VERSION = 1;

function origins(): string[] {
  const raw = process.env.TRACE_MOBILE_ORIGINS;
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = origins();
  /* An Expo native build sends no Origin at all. Only a browser does, so the
     absence of the header is not a thing to defend against here. */
  const allow =
    !origin || process.env.NODE_ENV !== "production" || allowed.includes(origin)
      ? (origin ?? "*")
      : allowed[0] ?? "null";

  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-trace-device,authorization",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export interface Identity {
  /** The handset. Durable across reinstalls only if the client keeps it. */
  deviceId: string;
  /** Whether anything about this request was actually authenticated. Never
   *  true in this build, and it says so out loud rather than defaulting to a
   *  hopeful shape that reads as a session. */
  authenticated: false;
}

export function identify(req: Request): Identity {
  return {
    deviceId: req.headers.get("x-trace-device") ?? "unknown-device",
    authenticated: false,
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: cors(req) });
}

export function fail(req: Request, message: string, status = 400) {
  /* The message is for a supervisor's phone, not for a log, so it never
     carries a stack, a table name or a credential shaped string. */
  return NextResponse.json({ error: message }, { status, headers: cors(req) });
}

export function preflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

/** Wraps a handler so a thrown error becomes a 502 with a readable sentence
 *  rather than an HTML error page a fetch client cannot parse. */
export async function guard(req: Request, run: () => Promise<Response>) {
  try {
    return await run();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown server error";
    return fail(req, message, 502);
  }
}

export function parseBody<T>(raw: unknown): T {
  if (raw === null || typeof raw !== "object") throw new Error("Body must be a JSON object");
  return raw as T;
}
