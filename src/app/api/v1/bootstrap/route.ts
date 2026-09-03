// web/app/api/v1/bootstrap/route.ts
// New file. Create the directory if it does not exist.

import {
  DATA_SOURCE,
  MATCHER_BUILT,
  getCounts,
  getDisputes,
  getExpectedToday,
  getFieldUser,
  getMyQuestions,
  getMyUpdates,
} from "@/server/data";
import { WRITES_PERSIST, getCapturedReports } from "@/lib/inbox";
import { guard, identify, json, preflight, MOBILE_API_VERSION } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * Everything the phone needs to draw every screen, in one request.
 *
 * This is not a convenience. The supervisor is on 3G at a work front and the
 * session budget is thirty seconds; five parallel requests on a bad link means
 * five chances to hang, and a screen that renders in pieces is a screen that
 * looks broken. One payload also means one cache write, so the app opens
 * offline showing the last known truth rather than a spinner.
 *
 * The payload is small by construction. Expected today is roughly fifteen
 * rows, questions should almost always be empty, and updates are capped. If
 * this ever grows past a couple of hundred KB, the fix is a `since` cursor
 * rather than splitting the route back up.
 */
export async function GET(req: Request) {
  return guard(req, async () => {
    const who = identify(req);

    const [user, expected, updates, questions, disputes, counts, captured] = await Promise.all([
      getFieldUser(),
      getExpectedToday(),
      getMyUpdates(),
      getMyQuestions(),
      getDisputes(),
      getCounts(),
      getFieldUser().then((u) => getCapturedReports(u.id)),
    ]);

    return json(req, {
      apiVersion: MOBILE_API_VERSION,
      serverTime: new Date().toISOString(),
      device: who.deviceId,

      me: {
        id: user.id,
        name: user.name,
        discipline: user.discipline,
        workFront: user.workFront,
        shift: user.shift,
        siteEmergencyNumber: user.siteEmergencyNumber,
      },

      /* The retrieval envelope. Roughly fifteen rows rather than fifty
         thousand activities, which is the single largest engineering lever in
         the product and the reason the phone can match anything at all while
         it is offline. */
      expected,

      /* Two sources, one list on the phone. `updates` are entries a matcher
         has an opinion about; `captured` are entries this app filed that
         nothing has linked yet. The second list exists because the receipt is
         the only thing the supervisor is given back, and dropping a row from
         it because no matcher has run would be taking that away. */
      updates,
      captured,

      questions,
      disputes: disputes.filter((d) => d.raisedById === user.id),
      counts,

      /* Carried on every response. A client that renders a confidence, a tier
         or a margin without reading this is rendering a number a person typed
         as though a system measured it. The field surface shows none of the
         three, and this flag is what keeps that a decision. */
      provenance: {
        dataSource: DATA_SOURCE,
        matcherBuilt: MATCHER_BUILT,
        writesPersist: WRITES_PERSIST,
        authenticated: who.authenticated,
      },
    });
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req);
}
