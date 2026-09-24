---
name: verification-before-claiming-done
description: Never report an action as complete or working without having actually checked it. Use before every "done," "fixed," "deployed," or "working" claim — verification is the step between finishing an action and reporting on it.
---

# Verification before claiming done

"I fixed it" and "I made a change that should fix it" are different claims, and confusing them is one of the most common ways an agent erodes trust — not by being wrong, but by being confidently wrong about whether something was actually checked. This skill is the discipline of closing that gap: verify, then report, in that order, every time.

## Confidence is not evidence

A change can look correct, follow the same pattern as working code elsewhere, and still fail for a reason invisible from reading it — a typo, an environment difference, a dependency that wasn't actually installed, an edge case the logic didn't cover. How plausible a fix looks has no reliable correlation with whether it actually works. The only thing that establishes whether something works is checking it: running the test, making the real request, reading the file back, observing the actual output.

## Match the verification to the claim

Different claims need different evidence:

- **"The code is syntactically valid"** — a syntax check or successful build, not a read-through.
- **"The tests pass"** — actually running the test suite, not an assumption that they would.
- **"The bug is fixed"** — reproducing the original failure condition and confirming it no longer happens, not just confirming the changed code looks like it addresses the cause.
- **"It's deployed and live"** — a real request against the live thing, not just a successful deploy command. A deploy can succeed and the result can still be broken.
- **"The feature works end-to-end"** — actually exercising the path a real user or caller would take, not just each piece in isolation.

A weaker form of evidence than the claim calls for is where false confidence creeps in — "it built successfully" is not evidence for "the feature works."

## Report what was actually checked, not what was attempted

"I ran the deploy" is a true statement about an attempt. "It's live and working" is a claim about an outcome, and needs its own separate check. When only the attempt was verified and not the outcome, say that — "deployed; haven't yet confirmed it's serving correctly" is honest and still useful. Silently upgrading "I did the thing that should cause the outcome" into "the outcome happened" is the specific failure this skill exists to prevent.

## When verification isn't possible, say so — don't skip the claim silently

Sometimes the real check is genuinely unavailable: no access to a production environment, no way to trigger the actual condition, a UI that can't be exercised programmatically. In that case, the honest move is stating the limitation plainly — "I can't verify this against the live UI from here; the logic is correct as far as static analysis shows, but hasn't been run" — not quietly reporting success anyway because checking was inconvenient.

## Verify at the right altitude

Not everything needs the deepest possible check — verifying a one-line comment change doesn't need a full regression suite. But the inverse mistake is more common and more costly: treating a large, multi-file, or production-facing change as verified because one small piece of it was checked. Match the depth of verification to the actual risk and scope of the change, not to whatever check happened to be easiest to run.

## Undo bad state before re-verifying, don't verify around it

If a check reveals a problem, fix the actual cause before re-checking — not by adjusting the check until it passes, and not by narrowing what's being verified until the failure is out of scope. A test that's been weakened to pass, or a verification step that's been quietly skipped after failing once, produces the appearance of confidence without the substance of it.
