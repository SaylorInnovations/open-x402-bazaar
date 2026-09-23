---
name: cost-governance-and-circuit-breakers
description: Cap what an agent can actually spend — per-session, per-day, per-account — with deterministic limits enforced before each costly call, not application logic an agent's own judgment could bypass. Use when building any agent that calls metered APIs, runs autonomously, or operates without a human confirming every call.
---

# Cost governance and circuit breakers

An agent's own judgment about when to stop spending is not a spend limit — it's a preference that a bug, a bad prompt, a runaway loop, or an unusual input can override. Cost governance is the deterministic backstop underneath that judgment: hard caps enforced by infrastructure the agent's own reasoning can't talk its way around, checked before a costly action happens, not noticed afterward in a bill.

## Judgment is not a substitute for a hard limit

The tool-call-efficiency skill covers using calls wisely, which is a behavioral practice — the agent choosing to be economical. That's valuable but it is not a limit: an agent that's reasoning badly, stuck in a loop, or fed an adversarial input can spend without limit regardless of how well-designed its judgment normally is. A real cap exists outside the agent's reasoning entirely, so it holds even when that reasoning fails.

## Layer the caps, don't rely on one

A single global limit is either too loose to catch a local problem (one session runs away, but total spend is still under the yearly budget) or too tight to be usable (a legitimate heavy day trips a limit sized for typical usage). Layering — a per-session ceiling, a per-agent daily cap, an account-level circuit breaker — catches problems at the smallest scope where they actually occur, without a normal session ever touching the account-wide limit at all.

## Check before spending, not after

A limit enforced after a costly call has already happened only prevents the *next* one — the call that blew past the limit already cost money. Checking projected or cumulative cost before a call is made, and refusing the call if it would breach the cap, is what actually stops the overspend rather than just noticing it. This usually means tracking running cost as state that's checked synchronously at the point of the call, not reconciled later from a bill.

## Put the enforcement point somewhere it can't be bypassed

A cap implemented only in application-level logic — a conditional the agent's own code path might skip under some circumstance, or a check that only some call paths route through — is a suggestion, not a limit. The more reliable place for a hard cap is a layer the costly action has to pass through regardless of which code path triggered it: a gateway, a wrapper around the metered client, a rate-limiting proxy — somewhere that isn't just one more thing the calling code has to remember to check.

## A tripped breaker should fail safe, not fail silent

When a limit is hit, the agent should stop and say so clearly — not silently degrade, not quietly retry until something else fails, and not proceed anyway with a logged warning nobody reads in time. A circuit breaker that trips without anyone noticing until the next bill defeats the purpose; the point is to stop spend *and* surface that it stopped, so a human can decide whether to raise the limit or investigate why it was hit.

## Set limits from real usage, not guesses

A cap set without reference to actual normal usage is either so loose it never catches a real problem or so tight it constantly blocks legitimate work. Baseline what typical usage actually costs first, then set limits with real headroom above that — and revisit them as usage patterns change, rather than picking a number once and never checking whether it still fits.
