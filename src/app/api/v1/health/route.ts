// web/app/api/v1/health/route.ts
// New file. Create the directory if it does not exist.

import { DATA_SOURCE, MATCHER_BUILT } from "@/server/data";
import { WRITES_PERSIST } from "@/lib/inbox";
import { json, preflight, MOBILE_API_VERSION } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * Cheap, and deliberately does not touch the database.
 *
 * This is what the app calls to decide whether to drain its outbox, so it has
 * to answer on a link too poor for anything else. A health check that runs a
 * query is a health check that times out exactly when the answer matters.
 *
 * The version number is the compatibility contract. An installed app on a
 * supervisor's phone does not update because the server did, so a breaking
 * change bumps this and the app says to update rather than rendering a screen
 * built from a payload it does not understand.
 */
export async function GET(req: Request) {
  return json(req, {
    ok: true,
    apiVersion: MOBILE_API_VERSION,
    serverTime: new Date().toISOString(),
    provenance: {
      dataSource: DATA_SOURCE,
      matcherBuilt: MATCHER_BUILT,
      writesPersist: WRITES_PERSIST,
    },
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req);
}
