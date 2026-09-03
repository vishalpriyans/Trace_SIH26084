// web/app/api/v1/sos/route.ts
// New file. Create the directory if it does not exist.

import { getFieldUser } from "@/lib/data";
import { fileSos, type InboundSos } from "@/lib/inbox";
import { fail, guard, json, parseBody, preflight } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * S-10, and the only mutation with its own route.
 *
 * Everything else the phone sends goes through the outbox and drains on
 * `/sync`, which is right for a progress report and wrong for this. An
 * emergency is sent immediately, on its own connection, before the app has
 * asked the supervisor a single question about it. The outbox is still the
 * fallback: if this call fails the press is queued with `channel_used` of
 * `offline_queued` and the phone keeps trying, because the alternative is an
 * emergency that was raised and then quietly dropped.
 *
 * Under three seconds to sent, and no rate limit. A second emergency during
 * the first one is exactly when this has to still work.
 *
 * This is a notifier. It is never a replacement for the site's own emergency
 * protocol, and the app shows the site emergency number beside every
 * confirmation for that reason.
 */
export async function POST(req: Request) {
  return guard(req, async () => {
    let body: InboundSos;
    try {
      body = parseBody<InboundSos>(await req.json());
    } catch {
      return fail(req, "Body must be a JSON object", 400);
    }

    if (!body.clientId) return fail(req, "clientId is required", 400);

    const me = await getFieldUser();
    const receipt = await fileSos(
      {
        ...body,
        isDrill: Boolean(body.isDrill),
        channelUsed: body.channelUsed ?? "app",
        createdAt: body.createdAt ?? new Date().toISOString(),
      },
      me.id,
    );

    return json(req, {
      ...receipt,
      /* Repeated in the payload rather than assumed to be cached, because this
         is the one response the app may show having never loaded anything
         else. */
      siteEmergencyNumber: me.siteEmergencyNumber,
    });
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req);
}
