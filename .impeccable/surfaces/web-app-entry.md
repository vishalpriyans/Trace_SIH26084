---
version: 1
slug: "web-app-entry"
primary_target: "web/app/(entry)"
related_targets: []
---

# Surface brief: entry

**Scope:** `web/app/(entry)`, sign in and sign up for all three roles.

**Mode:** operate. The visitor gets in and gets to work.

**Job:** two different people arrive here. A supervisor being onboarded on a borrowed phone at a
site office, and a planner or Engineer in Charge at a desk. The surface has to serve both
without asking either of them to understand the other.

**Proof sequence:** identify the role, collect only what that role's flow needs, land on that
role's home. Four steps for the supervisor, per S-1.

**Constraints:** no credential is verified and no session is real. The flow must look and behave
honestly enough to demonstrate, and must be swappable for Supabase Auth without redesign. The
supervisor is never asked for an email, a password, a language, or an employee number. Missed
call callback is offered as the no app route after two failed OTP attempts.

**Unresolved:** whether real Supabase Auth replaces this before the demo.

## Direction contract

THESIS: entry is a role desk, not a login box. It refuses the split screen marketing hero and
the single credential form alike: the three seats are shown as three cards that state what each
person is asked for, and the chosen card grows its own fields in place.

OWN-WORLD: the console's card world at entry scale. Near black ground, one 520px column of
14px radius cards on soft shadow, petrol accent, tinted pill tags marking what each role is
asked for. Plex Sans, Plex Mono on the phone number and the code.

STORY: the arriver recognises their own seat by what it asks of them, gives only that, and
lands on their own home with the role visible in the chrome.

FIRST VIEWPORT: TRACE wordmark and one line of what it does at top left; a segmented sign in
and create toggle above a 520px centre column; three role cards stacked, each with its letter
mark, title, who it is for, and its ask; the open card expanding its fields beneath its own
heading.

FORM: user pinned to the supplied dashboard reference. Standing exit taken, category canon
executed straight. No roll, no seed key.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
