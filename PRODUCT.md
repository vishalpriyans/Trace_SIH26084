# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Both surfaces in this build are web. The supervisor field surface is responsive mobile web
standing in for an Expo Android app that is specified but not yet started. Its logic and data
access are kept portable so that port stays mechanical. When the Expo app begins, this value
becomes `adaptive` and this file needs a revision, because audit and adapt swap to TalkBack,
Dynamic Type and touch target checks on native.

## Stack

Next.js 16 (App Router) with TypeScript strict and Tailwind v4, chosen by the user.

Server Components let a Supabase service key stay server side, which a pure SPA cannot do
safely. `.claude/launch.json` already expects `npm run dev` in `web/` on port 3000. Strict
TypeScript lets the six status vocabulary be a union type, so a seventh status fails to
compile rather than failing in review.

The Python FastAPI service in `app/` is the existing voice capture pipe and is not replaced by
this build.

## Users

**Discipline supervisor / foreman.** Civil, piping, static and rotating, electrical,
instrumentation or HSE. At the workface: noise, gloves, sun glare, patchy signal, often
mid task. Two quite different people share this role, an OIL Junior Engineer who is usually
English comfortable and a contractor's site supervisor who is often neither English
comfortable nor smartphone equipped. Every supervisor surface is written for the harder
profile. Motivation is **low**, because reporting is a chore they gain nothing from. Session
length is under 30 seconds. The design goal for them is **cost them nothing**.

**Planning engineer / project controls.** OIL project controls or a PMC side planner at EIL,
Technip or thyssenkrupp. At a desk, two monitors, all day. Motivation is high because manual
reconciliation *is* their job. Session length is hours. The design goal for them is **empty
the queue**.

**Senior manager / Engineer in Charge.** The statutory recipient of the twice daily 07:00 and
15:00 contractor report. Target is under 60 seconds to a decision. A senior manager who has to
learn a tool will not use it, so their view is deliberately thin.

Not users: labourers, skilled technicians, work contract labour.

## Product Purpose

Field progress arrives as unstructured speech in code mixed Assamese, Bengali, Hindi,
romanised and English. Primavera P6 needs structured L5/L6 activity IDs with actual dates.
Bridging that gap is a **semantic matching problem under uncertainty**, and that matcher is
the product, not the voice capture.

Manual reconciliation currently lags the schedule update cycle by days or weeks. Success is a
planner clearing a night's intake in under 15 minutes and a supervisor never being phoned to
ask where something stands.

## Positioning

Not a reporting app and not a dashboard. An **operator console for clearing a queue**, backed
by a matching cascade whose uncertainty is surfaced rather than hidden, plus a field surface
whose entire job is to cost the supervisor nothing and give them a receipt.

The claim is deliberately narrow: an event at the work front is visible in the planner's queue
within the same shift and reflected in the schedule within the same update cycle. **Real time
is not claimed** and a live streaming transcript is never promised, because neither is verified
and both are attackable.

The mechanism a neighbouring product could not truthfully copy is `s_logic`: predecessor
satisfaction in the schedule used as a matching signal. You cannot weld a joint on a spool
that is not erected, so schedule topology pulls a textually plausible match down and routes it
to a human.

## Operating Context

Assam. Mobile internet has been suspended across all 35 districts, repeatedly, so offline
first on the field surface is a citable hard requirement rather than defensive engineering.
Throughput is a few hundred reports a day across all disciplines, which is not a big data
problem and should not be presented as one.

Project scale: a 34,000 crore rupee refinery expansion carrying 20,000 to 50,000 L5/L6
activities. Retrieval difficulty scales with look ahead window size, roughly constant
regardless of project size, not with the activity count.

Voice is the primary capture path. A call starts exactly three ways and only these three: the
supervisor requests one, a manager triggers one, or an automated end of shift call fires only
for a supervisor who logged nothing at all that day.

Reporting cadence is set by OIL's own works tenders: the contractor's representative reports
to the Engineer in Charge twice daily, at 07:00 and 15:00.

## Capabilities and Constraints

Built and verified before this work: voice call capture through Sarvam into Supabase, running
from the terminal, documented in the engineering log. One real 106 second call captured end to
end on 2026-08-31.

**Not built: the matching engine.** Every confidence score, tier, margin and alternative in
this build is hand authored. The interface must say so, visibly, on every screen that shows
one. This is the single most important constraint on any design decision here, because a
screen that looks like it is reporting measured results when it is not is a misrepresentation.

**Not wired: the database.** The schema is authored in this repo and documented in
`database.md`, including how to connect it, but this build runs on typed fixtures. The data
access layer is written so swapping the source is a single change rather than a rewrite.

**Not real: authentication.** Sign in and sign up are designed and fully navigable, with the
supervisor on phone plus OTP plus discipline plus work front and the planner and manager on
email plus password. No credential is verified and no session is real. Spec de-scopes real
auth to a role picker; this build keeps the flow honest looking for demonstration while
staying swappable for Supabase Auth.

**Outstanding blocker:** the Sarvam mid call tool has never fired on a live call, because the
trigger paragraph is missing from the agent's system prompt. The manager live call panel
depends entirely on it. Any live call surface must state that dependency on screen rather than
render an empty panel that looks broken.

De-scoped deliberately: live P6 write back, which is a staging table only and a safety
property rather than a shortcut; web offline support; multi project support; production OCR
and ASR, which the problem statement itself de-scopes; and any separate analytics stack.

**Terminology.** Exactly six statuses, used verbatim on both surfaces and never extended:
`captured`, `auto_applied`, `needs_review`, `clarification`, `confirmed`, `rejected`.

**Open decision:** the problem statement number conflicts. The repository folder and git remote
say SIH26084; every specification document says SIH26122. Until the user resolves it, no
problem statement number appears anywhere in the interface.

## Brand Commitments

**Standing preference, recorded 2026-09-01.** The user supplied a dark card dashboard as the
reference and pinned it as the material world, overriding the earlier square instrument
direction. The category standard is the commitment here, executed straight and at full
fidelity: near black ground, cards a tonal step above it at 14px radius, elevation by soft
shadow on cards and hairline on nested panels but never both on the same element, tinted pill
tags, avatar stacks, gauge and ramp charts. The reference screenshot itself is the craft bar.

**Desaturated petrol blue survives as the single accent.** The reference's indigo was
deliberately declined: petrol is the one thread kept from the instrument world, and it carries
the ordinal ramp for tier and coverage as well as every primary action.

IBM Plex Sans throughout, IBM Plex Mono reserved for what is genuinely compared or read back
aloud: activity ids, confidence scores, times and quantities. Never mono as a costume for
technical.

The direction contracts live in `.impeccable/surfaces/web-app-console.md`,
`web-app-entry.md` and `web-app-field.md`.

Honesty about provenance is a brand commitment, not a nicety: fixture data is labelled,
unmeasured metrics read "not measured" rather than showing a plausible zero, and no figure
appears without a path to its evidence.

No em dash or en dash in visible copy. House rule.

## Evidence on Hand

- `~/Downloads/Trace docs/TRACE-product-spec-v2.md` and `USER_FLOWS.md`, both outside the
  repo, are the authoritative scope documents.
- One real 106 second voice call captured end to end on 2026-08-31, transcript and extracted
  variables in `call_events`.
- `sql/002_spec_v2_schema.sql`, the spec v2 schema, authored but not yet applied.
- `app/main.py`, the working FastAPI voice capture service.
- CAG Report 42/2015 on this organisation, which found the board received target versus
  achievement statistics but not the reasons for chronic shortfall. That is the documented
  audit finding the blocker taxonomy answers.

**No live project data.** The problem statement states it will not be shared and instructs
teams to work with synthetic data of similar structure. Data in this build is hand authored
per discipline against a synthetic WBS. It must never be described as generated by an LLM, and
no benchmark, accuracy figure, customer or testimonial may be invented.

## Product Principles

1. **The degraded path is always "ask a human"**, never lose data and never write something
   wrong quietly.
2. **Silence is a signal.** Missing data is the failure mode most teams never design for, so a
   supervisor who reported nothing must be as visible as one who reported something wrong.
3. **Nothing auto applies on score alone.** Threshold and margin both, because two candidates
   at 0.91 and 0.89 mean the model has no idea which.
4. **Nothing writes a date directly.** Actual dates are derived by a rollup rule from an event
   log, or an activity finishes three times.
5. **Show the uncertainty.** A confidence score with no margin, tier and alternatives beside
   it is a number pretending to be an answer.
6. **The supervisor's surface owes them something back.** A receipt, fewer interruptions, and
   blockers that visibly move. Without those three it is unpaid data entry and gets abandoned.

## Accessibility & Inclusion

Keyboard first on the console is a requirement, not an enhancement: a planner clearing 40
items with a mouse will abandon the tool. Every queue action has a key and every key is shown
on screen.

The field surface is used in direct sun, in gloves, one handed, mid task. Large tap targets,
high contrast, and no interaction that requires precision are hard requirements there. It must
work on a low end Android phone on 3G.

Status is never conveyed by colour alone; every chip carries its word. Charts carry a legend
for two or more series and offer a table view. Focus rings are visible and use the accent.
`prefers-reduced-motion` is honoured globally.

Language is detected and adapted to, never configured. A supervisor is never asked to set a
language, and never asked to read, type or recognise an activity ID.
