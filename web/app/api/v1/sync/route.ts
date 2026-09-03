// web/app/api/v1/sync/route.ts
// New file. Create the directory if it does not exist.

import { getFieldUser } from "@/lib/data";
import {
  fileAnswer,
  fileCallRequest,
  fileDispute,
  fileReport,
  fileSos,
  type InboundAnswer,
  type InboundCallRequest,
  type InboundDispute,
  type InboundReport,
  type InboundSos,
  type Receipt,
} from "@/lib/inbox";
import { fail, guard, json, parseBody, preflight } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * The outbox drain. One request, everything the handset has been holding.
 *
 * Assam is the operating context and mobile internet has been suspended across
 * all 35 districts more than once, so a phone may come back with a whole
 * shift's worth of entries at once. Sending them one at a time over a link
 * that just came up is how half of them get lost.
 *
 * Two rules make this safe to call as often as the app likes.
 *
 * PARTIAL SUCCESS IS SUCCESS. Each item is filed independently and gets its
 * own receipt. One malformed row does not roll back the other eleven, and the
 * response says exactly which ones landed so the phone can clear precisely
 * those from its queue and keep the rest.
 *
 * ORDER IS PRESERVED WITHIN A KIND. Reports are filed in the order the
 * supervisor made them, because two entries about the same activity read as a
 * correction sequence and reversing them inverts the meaning. Different kinds
 * do not interact, so they run in parallel.
 */

interface SyncBody {
  reports?: InboundReport[];
  answers?: InboundAnswer[];
  disputes?: InboundDispute[];
  callRequests?: InboundCallRequest[];
  sos?: InboundSos[];
}

const MAX_ITEMS = 100;

type Outcome =
  | ({ ok: true } & Receipt)
  | { ok: false; clientId: string; error: string; retryable: boolean };

/** A failure the phone should stop retrying looks different from one it should
 *  try again later. Retrying a malformed row forever is how an outbox jams and
 *  never delivers the good entries behind it. */
function toOutcome(clientId: string, e: unknown): Outcome {
  const message = e instanceof Error ? e.message : "Unknown error";
  const retryable = !/invalid|violates|malformed|not a JSON object/i.test(message);
  return { ok: false, clientId, error: message, retryable };
}

export async function POST(req: Request) {
  return guard(req, async () => {
    let body: SyncBody;
    try {
      body = parseBody<SyncBody>(await req.json());
    } catch {
      return fail(req, "Body must be a JSON object", 400);
    }

    const total =
      (body.reports?.length ?? 0) +
      (body.answers?.length ?? 0) +
      (body.disputes?.length ?? 0) +
      (body.callRequests?.length ?? 0) +
      (body.sos?.length ?? 0);

    if (total === 0) return json(req, { results: [], serverTime: new Date().toISOString() });
    if (total > MAX_ITEMS) {
      return fail(req, `Too many items in one drain. Send at most ${MAX_ITEMS}.`, 413);
    }

    const me = await getFieldUser();
    const results: Outcome[] = [];

    /* Emergencies first, always. If the link is about to drop again, the SOS is
       the one item that must have gone. */
    for (const s of body.sos ?? []) {
      try {
        results.push({ ok: true, ...(await fileSos(s, me.id)) });
      } catch (e) {
        results.push(toOutcome(s.clientId, e));
      }
    }

    /* Serial, and in the order the supervisor made them. */
    for (const r of body.reports ?? []) {
      try {
        results.push({ ok: true, ...(await fileReport(r, me.id)) });
      } catch (e) {
        results.push(toOutcome(r.clientId, e));
      }
    }

    const rest = await Promise.all([
      ...(body.answers ?? []).map(async (a): Promise<Outcome> => {
        try {
          return { ok: true, ...(await fileAnswer(a)) };
        } catch (e) {
          return toOutcome(a.clientId, e);
        }
      }),
      ...(body.disputes ?? []).map(async (d): Promise<Outcome> => {
        try {
          return { ok: true, ...(await fileDispute(d, me.id)) };
        } catch (e) {
          return toOutcome(d.clientId, e);
        }
      }),
      ...(body.callRequests ?? []).map(async (c): Promise<Outcome> => {
        try {
          return { ok: true, ...(await fileCallRequest(c, me.id)) };
        } catch (e) {
          return toOutcome(c.clientId, e);
        }
      }),
    ]);

    results.push(...rest);

    return json(req, {
      results,
      accepted: results.filter((r) => r.ok).length,
      serverTime: new Date().toISOString(),
    });
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req);
}
