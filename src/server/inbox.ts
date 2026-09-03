/**
 * THE WRITE SEAM.
 *
 * `lib/data.ts` is the read seam and says so at the top of the file: every
 * screen reads through it and nothing else. This is its opposite number. Every
 * inbound thing from a supervisor's phone is written through here and nowhere
 * else, for the same reason: a column rename breaks one mapper rather than
 * leaking into every route handler.
 *
 * Four properties carried over deliberately.
 *
 * 1. `./supabase` is imported lazily, inside the functions that need it, so
 *    fixture mode needs no environment and no network.
 * 2. `DATA_SOURCE` decides where a write lands, exactly as it decides where a
 *    read comes from. Both paths stay live.
 * 3. Nothing invented is written. A report arriving from the app is inserted as
 *    `raw_reports` plus one `extracted_events` row at status `captured`, and NO
 *    `matches` row, because a match row demands a confidence, a margin and a
 *    tier and the matching engine does not exist. Writing zeroes into those
 *    columns would put three fabricated numbers into the one table the console
 *    reads its metrics from.
 * 4. Every write is idempotent on `client_id`. A phone on 3G in Assam retries,
 *    and a retry that files the same shift report twice is worse than a retry
 *    that fails.
 *
 * The honest consequence of point 3 is that an app logged report reads as
 * `captured`, which is "Sent" in the field vocabulary, until a matcher links
 * it. That is the correct state for it to be in. It is not a gap to paper over.
 */

import type { Status } from "@/domain/status";
import type { Discipline } from "@/domain/status";
import { DATA_SOURCE } from "./data";

const isDb = DATA_SOURCE === "supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

async function client() {
  const { db } = await import("./db/client");
  return db;
}

/* -------------------------------------------------------------------------
   What a phone sends.
   ------------------------------------------------------------------------- */

/**
 * One thing a supervisor did, as their handset describes it.
 *
 * `clientId` is generated on the device before anything is sent, which is what
 * makes the outbox drain safe to repeat. `capturedAt` is when they did it and
 * `receivedAt` is when the server heard about it: those two are far apart for
 * an entry that sat in a dead zone for six hours, and keeping both is the
 * whole reason the schema has two columns rather than one.
 */
export interface InboundReport {
  clientId: string;
  /** Verbatim, as typed or spoken. The audit anchor. Never rewritten. */
  text: string;
  eventType: "start" | "finish" | "progress" | "blocker" | "safety";
  /** Present when the supervisor tapped a row on the expected list rather than
   *  typing free text. It is a hint for the matcher, not a decision. */
  activityHint?: string | null;
  quantity?: { value: number; unit: string } | null;
  eventTime?: string | null;
  language?: string;
  /** `offline` says this sat on the handset before it could be sent. It is a
   *  real channel value in the vocabulary rather than a flag, because how a
   *  report arrived is part of what the planner reads. */
  channel: "app" | "offline";
  capturedAt: string;
  workFront?: string;
  discipline?: Discipline;
}

export interface InboundAnswer {
  clientId: string;
  clarificationId: string;
  answer: string;
  answeredAt: string;
}

export interface InboundDispute {
  clientId: string;
  matchId: string;
  route: "callback" | "voice_note";
  rejectReason: "duplicate" | "out of scope" | "not a progress update" | "test or noise";
  raisedAt: string;
}

export interface InboundCallRequest {
  clientId: string;
  activityIds?: string[];
  requestedAt: string;
}

export interface InboundSos {
  clientId: string;
  category: "fire" | "gas" | "injury" | "fall" | "structural" | "evacuation" | "other";
  message?: string;
  lat?: number;
  lng?: number;
  accuracyM?: number;
  isDrill: boolean;
  /** `offline_queued` when the handset had no signal at the moment of the
   *  press. It still counts as raised at that moment, not at sync time. */
  channelUsed: "app" | "sms" | "offline_queued";
  createdAt: string;
}

export type Receipt = {
  clientId: string;
  /** The server's id for the thing, once it has one. */
  id: string;
  status: Status;
  /** Where it actually landed. A demo running on fixtures says `memory` rather
   *  than letting a green tick imply a database that is not there. */
  persisted: "database" | "memory";
  receivedAt: string;
};

/* -------------------------------------------------------------------------
   Fixture mode. In process, not durable, and it says so.
   ------------------------------------------------------------------------- */

interface MemoryReport extends InboundReport {
  id: string;
  reporterId: string;
  receivedAt: string;
}

const memory = {
  reports: [] as MemoryReport[],
  answers: new Map<string, InboundAnswer>(),
  disputes: [] as (InboundDispute & { id: string })[],
  calls: [] as (InboundCallRequest & { id: string })[],
  sos: [] as (InboundSos & { id: string })[],
  seen: new Set<string>(),
};

function rid() {
  return globalThis.crypto.randomUUID();
}

/* -------------------------------------------------------------------------
   Reports.
   ------------------------------------------------------------------------- */

/**
 * Files one report and returns the receipt.
 *
 * The receipt is the only thing this product gives the supervisor back, so it
 * is returned synchronously from the write rather than fetched afterwards. A
 * phone that has to make a second round trip to find out whether the first one
 * worked has no receipt on 3G.
 */
export async function fileReport(
  report: InboundReport,
  reporterId: string,
): Promise<Receipt> {
  const receivedAt = new Date().toISOString();

  if (!isDb) {
    const existing = memory.reports.find((r) => r.clientId === report.clientId);
    if (existing) {
      return {
        clientId: report.clientId,
        id: existing.id,
        status: "captured",
        persisted: "memory",
        receivedAt: existing.receivedAt,
      };
    }
    const id = rid();
    memory.reports.push({ ...report, id, reporterId, receivedAt });
    return { clientId: report.clientId, id, status: "captured", persisted: "memory", receivedAt };
  }

  const db = await client();

  /* Idempotency first, and by select rather than by upsert. `raw_reports` has
     no unique constraint on client_id in 002, and adding one is a migration
     this route is not entitled to make on its own. The race window is two
     retries of the same request arriving within milliseconds of each other,
     which a mobile outbox draining serially does not produce. */
  const prior = await db
    .from("raw_reports")
    .select("id, received_at")
    .eq("client_id", report.clientId)
    .maybeSingle();
  if (prior.error && prior.error.code !== "PGRST116") {
    throw new Error(`inbox.fileReport lookup: ${prior.error.message}`);
  }
  if (prior.data) {
    const r = prior.data as Row;
    return {
      clientId: report.clientId,
      id: r.id,
      status: "captured",
      persisted: "database",
      receivedAt: r.received_at,
    };
  }

  const raw = await db
    .from("raw_reports")
    .insert({
      client_id: report.clientId,
      reporter_id: reporterId,
      channel: report.channel,
      discipline: report.discipline ?? null,
      work_front: report.workFront ?? null,
      language: report.language ?? "English",
      original_text: report.text,
      captured_at: report.capturedAt,
      received_at: receivedAt,
    })
    .select("id, received_at")
    .single();
  if (raw.error) throw new Error(`inbox.fileReport: ${raw.error.message}`);

  const rawRow = raw.data as Row;

  const event = await db.from("extracted_events").insert({
    raw_report_id: rawRow.id,
    event_type: report.eventType,
    object_phrase: report.activityHint ?? null,
    location_phrase: report.workFront ?? null,
    quantity: report.quantity?.value ?? null,
    quantity_unit: report.quantity?.unit ?? null,
    event_time: report.eventTime ?? null,
    evidence_span: report.text,
    status: "captured",
  });
  if (event.error) throw new Error(`inbox.fileReport event: ${event.error.message}`);

  /* No `matches` row. See the header. */

  return {
    clientId: report.clientId,
    id: rawRow.id,
    status: "captured",
    persisted: "database",
    receivedAt: rawRow.received_at,
  };
}

/**
 * What this supervisor has sent that has not been matched yet.
 *
 * `getMyUpdates` in the read seam walks `matches`, which is right for the
 * console but means an app logged report is invisible there until a matcher
 * links it. On this surface that would delete the receipt, which is the one
 * thing the supervisor gets in exchange for reporting at all.
 */
export async function getCapturedReports(reporterId: string) {
  if (!isDb) {
    return memory.reports
      .filter((r) => r.reporterId === reporterId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .map((r) => ({
        id: r.id,
        clientId: r.clientId,
        what: r.text,
        eventType: r.eventType,
        channel: r.channel,
        at: r.capturedAt,
        receivedAt: r.receivedAt,
        quantity: r.quantity ? `${r.quantity.value} ${r.quantity.unit}` : undefined,
        activityDescription: r.activityHint ?? "Not linked yet",
        status: "captured" as Status,
        persisted: "memory" as const,
      }));
  }

  const db = await client();
  const { data, error } = await db
    .from("raw_reports")
    .select(
      `id, client_id, original_text, channel, captured_at, received_at,
       extracted_events ( id, event_type, quantity, quantity_unit, object_phrase,
                          matches ( id, status ) )`,
    )
    .eq("reporter_id", reporterId)
    .order("captured_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`inbox.getCapturedReports: ${error.message}`);

  return (data as Row[])
    .map((r) => {
      const e = (r.extracted_events ?? [])[0] as Row | undefined;
      const match = (e?.matches ?? [])[0] as Row | undefined;
      return {
        id: r.id as string,
        clientId: (r.client_id ?? null) as string | null,
        what: r.original_text as string,
        eventType: (e?.event_type ?? "progress") as InboundReport["eventType"],
        channel: r.channel as InboundReport["channel"],
        at: r.captured_at as string,
        receivedAt: r.received_at as string,
        quantity: e?.quantity ? `${e.quantity} ${e.quantity_unit ?? ""}`.trim() : undefined,
        activityDescription: (e?.object_phrase ?? "Not linked yet") as string,
        /* A match row, when one exists, is the authority on status. Until then
           it is captured, which the field surface reads as "Sent". */
        status: ((match?.status ?? "captured") as Status),
        persisted: "database" as const,
        /* Filtered below rather than in the query: a report that HAS been
           matched is already on the receipt screen through the read seam, and
           showing it from both sources would duplicate the row. */
        matched: Boolean(match),
      };
    })
    .filter((r) => !r.matched);
}

/* -------------------------------------------------------------------------
   Answers, disputes, calls, emergencies.
   ------------------------------------------------------------------------- */

export async function fileAnswer(a: InboundAnswer): Promise<Receipt> {
  if (!isDb) {
    memory.answers.set(a.clarificationId, a);
    return {
      clientId: a.clientId,
      id: a.clarificationId,
      status: "clarification",
      persisted: "memory",
      receivedAt: new Date().toISOString(),
    };
  }

  const db = await client();
  /* Never overwrites an answer that is already there. The first answer is the
     one the supervisor gave; a duplicate arriving from a retry is not a
     correction. */
  const { data, error } = await db
    .from("clarifications")
    .update({ answer: a.answer, answered_at: a.answeredAt })
    .eq("id", a.clarificationId)
    .is("answer", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`inbox.fileAnswer: ${error.message}`);

  return {
    clientId: a.clientId,
    id: (data as Row | null)?.id ?? a.clarificationId,
    status: "clarification",
    persisted: "database",
    receivedAt: new Date().toISOString(),
  };
}

export async function fileDispute(d: InboundDispute, raisedBy: string): Promise<Receipt> {
  if (!isDb) {
    const id = rid();
    memory.disputes.push({ ...d, id });
    return {
      clientId: d.clientId,
      id,
      status: "rejected",
      persisted: "memory",
      receivedAt: new Date().toISOString(),
    };
  }

  const db = await client();
  const { data, error } = await db
    .from("rejection_disputes")
    .insert({
      client_id: d.clientId,
      match_id: d.matchId,
      raised_by: raisedBy,
      route: d.route,
      reject_reason: d.rejectReason,
      /* `queued` for a callback, because nothing has been captured yet. A
         voice note becomes `captured` only once the clip is transcribed server
         side, and this build does not transcribe, so it stays queued too. */
      state: "queued",
      raised_at: d.raisedAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`inbox.fileDispute: ${error.message}`);

  if (d.route === "callback") await fileCallRequest({ clientId: d.clientId + ":call", requestedAt: d.raisedAt }, raisedBy);

  return {
    clientId: d.clientId,
    id: (data as Row).id,
    status: "rejected",
    persisted: "database",
    receivedAt: new Date().toISOString(),
  };
}

/**
 * S-5. The supervisor asks to be rung.
 *
 * It stays outbound in all three triggers, which is what lets the candidate
 * activity set be loaded before anyone speaks. `activityIds` is that envelope.
 * Nothing here places a call: the voice pipe is the FastAPI service in `app/`
 * and it reads this table.
 */
export async function fileCallRequest(
  c: InboundCallRequest,
  supervisorId: string,
): Promise<Receipt> {
  if (!isDb) {
    const id = rid();
    memory.calls.push({ ...c, id });
    return {
      clientId: c.clientId,
      id,
      status: "captured",
      persisted: "memory",
      receivedAt: new Date().toISOString(),
    };
  }

  const db = await client();
  const { data, error } = await db
    .from("call_requests")
    .insert({
      client_id: c.clientId,
      supervisor_id: supervisorId,
      trigger_source: "supervisor",
      activity_ids: c.activityIds ?? null,
      state: "queued",
      created_at: c.requestedAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`inbox.fileCallRequest: ${error.message}`);

  return {
    clientId: c.clientId,
    id: (data as Row).id,
    status: "captured",
    persisted: "database",
    receivedAt: new Date().toISOString(),
  };
}

/**
 * S-10. It sends first and asks for detail afterwards.
 *
 * There is no rate limit and there never is one. A second emergency during the
 * first one is exactly when this has to still work.
 */
export async function fileSos(s: InboundSos, raisedBy: string): Promise<Receipt> {
  if (!isDb) {
    const id = rid();
    memory.sos.push({ ...s, id });
    return {
      clientId: s.clientId,
      id,
      status: "captured",
      persisted: "memory",
      receivedAt: new Date().toISOString(),
    };
  }

  const db = await client();
  const { data, error } = await db
    .from("sos_events")
    .insert({
      client_id: s.clientId,
      kind: "incident",
      raised_by: raisedBy,
      raised_by_role: "supervisor",
      category: s.category,
      severity: "critical",
      message: s.message ?? null,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      accuracy_m: s.accuracyM ?? null,
      is_drill: s.isDrill,
      channel_used: s.channelUsed,
      created_at: s.createdAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`inbox.fileSos: ${error.message}`);

  return {
    clientId: s.clientId,
    id: (data as Row).id,
    status: "captured",
    persisted: "database",
    receivedAt: new Date().toISOString(),
  };
}

/** Whether writes from the phone survive a server restart. The app puts this
 *  on screen rather than showing a green tick that means nothing. */
export const WRITES_PERSIST = isDb;
