import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * The one database client, server side only.
 *
 * `import "server-only"` is the guard that matters. Every table in 002 and 003
 * has row level security enabled with no anonymous policies, so this connects
 * with the service role key, which bypasses RLS completely. If a client
 * component ever imports this file, directly or through a chain of imports,
 * the BUILD FAILS rather than shipping a full access credential in the browser
 * bundle. That is a compile time guarantee, not a convention someone has to
 * remember during review.
 *
 * Neither environment variable is prefixed `NEXT_PUBLIC_`, for the same
 * reason. That prefix is what would inline the value into client JavaScript.
 *
 * Only `lib/data.ts` should import this. Every screen reads through that file,
 * so the query surface stays in one place and a column rename breaks one
 * mapping function rather than thirty components.
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* Fail loudly at import time rather than returning empty arrays from every
   screen. A misconfigured environment that renders an empty review queue is
   indistinguishable from a night with no reports, and on this product those
   two things must never look the same. */
if (!url || !key) {
  throw new Error(
    "Supabase is not configured. Create web/.env.local with SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY, then restart the dev server. See database.md section 4.",
  );
}

/* The two values are easy to transpose, and the failure that follows names
   neither variable. Checking the shape rather than the value means the error
   says which line is wrong without ever printing a credential. */
if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url.trim())) {
  throw new Error(
    "SUPABASE_URL does not look like a project URL. Expected " +
      "https://<project-ref>.supabase.co, found something else. If it starts " +
      "sb_secret_ you have pasted the secret key into the URL line: the URL is " +
      "in Project Settings, Data API, Project URL.",
  );
}

if (!key.startsWith("sb_secret_") && !key.startsWith("eyJ")) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY does not look like a secret key. Expected a " +
      "value beginning sb_secret_, from Project Settings, API Keys, the one " +
      "behind the reveal icon. The sb_publishable_ key respects row level " +
      "security and cannot read these tables.",
  );
}

export const db = createClient(url, key, {
  auth: {
    /* There is no browser session to keep. Every call is a trusted server
       request made with the service key. */
    persistSession: false,
    autoRefreshToken: false,
  },
});
