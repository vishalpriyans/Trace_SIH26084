---
version: 1
slug: "web-app-console"
primary_target: "web/app/console"
related_targets: []
---

# Surface brief: planner console

**Scope:** `web/app/console`, the planning engineer's surface. W1 to W10.

**Mode:** operate. The visitor completes a task, and the task is emptying a queue.

**Job:** a planning engineer clears a night's intake of field reports, deciding for each
whether the matcher's guess is right, wrong, or unanswerable without asking the supervisor.

**Proof sequence:** the queue empties. Every other screen exists to make a queue decision
defensible. W3 shows why a match scored what it did, W2 shows who has not reported, W10 shows
whether the system is earning its place.

**Constraints:** keyboard first, every key shown on screen. Activity ID always visible here and
never on the field surface. Six statuses, never a seventh.

**Standing constraint:** the matching engine is not built. Every confidence score on screen is
hand authored and the console says so. No design decision here may make fixture data look like
a measured result.

**Unresolved:** the problem statement number conflict, so no PS number appears in the interface.
The mid call tool has never fired, so no live call surface may claim live rows without saying
what it depends on.

## Direction contract

THESIS: a work board whose unit is a decision, not a task. It takes the reference dashboard's
card world wholesale and refuses only its neutrality: every queue card states what the matcher
believed and how close the runner up stood, so the card carries its own doubt.

OWN-WORLD: near black ground, cards a clear tonal step above it at 14px radius, elevation by
soft shadow on cards and hairline on nested panels, never both. Petrol accent on a
neutral field. Tinted pill tags for status and cause, avatar stacks for people, a petrol
ordinal ramp for tier and coverage. Plex Sans throughout, Plex Mono on ids, scores and times.

STORY: the planner opens the board worst first, reads why each score is what it is, and clears
it with four keys.

FIRST VIEWPORT: 248px icon rail; a top bar with breadcrumb, search, theme switch and identity;
a queue depth figure card and three state cards across the top; below them the review register
as full width cards, each with spoken phrase, matched activity, a confidence track showing
threshold and margin, and Approve at the right.

FORM: user pinned to the supplied dashboard reference. Standing exit taken, category canon
executed straight. No roll, no seed key.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
