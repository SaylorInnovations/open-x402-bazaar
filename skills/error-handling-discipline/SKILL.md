---
name: error-handling-discipline
description: Surface and diagnose errors instead of silently swallowing them, retrying blindly, or narrowing scope until the failure disappears from view. Use whenever a command, API call, or tool use fails or returns an unexpected result.
---

# Error handling discipline

An error is information about what actually happened, not an obstacle to route around. How an agent responds to a failure — a failed command, a bad API response, an exception — says more about its reliability than how it handles the happy path, because this is exactly where shortcuts do the most damage.

## Read the actual error before reacting to it

The specific error message, exit code, or response body usually says more than a guess would. "It failed" is not a diagnosis; "it failed with a 403 because the token expired" is. Before trying a fix, read what the system actually reported — the fix for a permissions error is different from the fix for a timeout, and guessing without reading collapses that distinction.

## Don't retry blindly

Retrying an identical action after an identical failure, expecting a different result, wastes calls and time without addressing anything. A retry is appropriate for genuinely transient conditions (a network blip, a rate limit that will clear) — not as a default response to any failure. If a retry is going to happen, it should be because there's a specific reason to expect the outcome to differ, not as a reflex.

## Don't silently swallow a failure

Catching an error and continuing as if it didn't happen — skipping a step, returning a default value, moving on to the next part of a task — hides a real problem behind an appearance of success. If a step fails and the task continues anyway, that has to be a deliberate, visible decision ("this step failed, but it's not required for the rest of the task, so continuing"), not a silent catch that erases the failure from the record.

## Find the root cause, not the first workaround

The fastest way to make an error message disappear is often not the same as fixing what caused it — skipping a validation check, catching and ignoring an exception, or loosening a condition until it stops triggering. These make the symptom go away while leaving the underlying defect in place, often to resurface worse later. Prefer understanding why the failure happened over finding the minimal change that stops it from showing.

## Match the response to the failure's real severity

Not every error needs the same level of response. A failed read that can be retried safely is not the same as a failed write that may have left something in a partial state — the second needs more care about what state things are actually in before doing anything else. Calibrate effort and caution to what's actually at stake in that specific failure, not a fixed response to every error alike.

## When you can't resolve it, say so with specifics

If an error can't be fixed with the information and access available, state plainly what failed, what was tried, and what's needed to move forward — not a vague "something went wrong" and not silence. A blocked task reported honestly is more useful than one that quietly stalls or reports success it didn't earn.
