---
version: 1
slug: "web-app-field"
primary_target: "web/app/field"
related_targets: []
---

# Surface brief: field app

**Scope:** `web/app/field`, the discipline supervisor's surface. S2 to S15, responsive mobile web
standing in for an Expo Android app.

**Mode:** operate. The visitor completes a task in under 30 seconds and leaves.

**Job:** a supervisor who has just finished a task reports it and gets a receipt proving they
did, without opening anything that costs them time.

**Proof sequence:** report, confirm back, receipt. The receipt is the retention loop: it is why
they cannot be blamed later, and it is the only thing the app gives them.

**Constraints:** gloves, direct sun, one hand, mid task, 3G, low end Android. Voice is the
primary path and the app is the supporting surface. Never an activity ID, never a language
setting, never a seventh status. At most four notification types. Offline is the default
assumption, not an error state. 56px minimum targets and an 18px floor on anything functional.

**Unresolved:** the WiFi calling assumption behind the rarity of offline capture is unverified.
If it fails, offline stops being an edge case and becomes the main path.

## Direction contract

THESIS: the same product the planner uses, held at arm's length. It refuses the feed its
category ships: today's work is a short fixed list of physical jobs with a state each, and the
screen ends when the list ends.

OWN-WORLD: the console's card world with every measurement enlarged. Same near black ground,
same 14px radius cards and soft shadow, same petrol accent and tinted pill tags, at 56px
targets and an 18px floor. A sun switch flips the whole world to the light ground, because a
phone in direct sun is legible at maximum luminance and a dark screen there is not.

STORY: the supervisor sees the handful of jobs expected of them today, reports one by voice or
one tap, reads back what was understood, and leaves holding a receipt.

FIRST VIEWPORT: a day ledger card, then Report by call as a full width petrol block, Log by
text as a secondary card beneath it, then Expected today as description cards with three state
actions each. SOS pinned bottom right on every screen.

FORM: user pinned to the supplied dashboard reference. Standing exit taken, category canon
executed straight. No roll, no seed key.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
