---
name: agent-observability-and-tracing
description: Instrument an agent so its decisions and failures are diagnosable after the fact — structured traces per LLM call and tool call, not just console output. Use when building or operating an agent that runs unattended, in production, or long enough that a human can't watch every step live.
---

# Agent observability and tracing

An agent that only prints to a console is only debuggable while someone is watching it live. The moment it runs unattended — a scheduled job, a background task, a production deployment — the only way to understand what it did, and why it went wrong, is what got recorded along the way. Observability is building that record in deliberately, before it's needed, not reconstructing it after a failure from whatever scraps happen to remain.

## A trace, not just a log line

A useful record of an agent's run isn't a flat stream of print statements — it's a structured trace: each LLM call and each tool call as a distinct, identifiable span, with what went in, what came out, how long it took, and what step it belonged to. A flat log can tell you something happened; a structured trace can tell you which decision it was, what led to it, and what followed from it.

## Capture the decision, not just the outcome

Recording that a tool was called and what it returned is necessary but not sufficient — the far more useful information is *why* that tool was chosen over the alternatives, what the model saw right before deciding, and what it was trying to accomplish. When a trace only shows outcomes, diagnosing a bad decision means guessing backward from the result; when it also shows the reasoning context, diagnosing it means just reading what's there.

## Version what shaped the behavior

A system prompt, a tool description, or a model version that changes silently between runs makes it impossible to know whether a behavior change came from the input or from something upstream shifting. Recording which version of the prompt, tools, and model produced a given trace turns "it used to work" into a comparison that can actually be made, instead of a hunch.

## Make failures findable, not just present

A trace that exists but has to be manually scanned end-to-end to find the failure is only marginally better than no trace. Tag or structure traces so a failed run, an unusually slow step, or an unexpected tool-call pattern can be found and filtered for directly — across many runs, not just read linearly within one. The value of observability compounds when failures across a fleet of runs can be compared, not just inspected one at a time.

## Instrument before the failure, not after

The temptation is to add tracing reactively, once something has already gone wrong and needs explaining. By then the failure that prompted it is already opaque — the instrumentation needed to explain it doesn't exist retroactively. Build the trace structure in from the start of any agent meant to run unattended, so the next failure, whenever it comes, already has the record needed to diagnose it.

## Observability costs something — spend it where unattended risk is highest

Full tracing of every call has real overhead (storage, latency, complexity), so it isn't free everywhere. Prioritize the agents and code paths that run without a human watching, that touch production data, or that are hardest to reproduce on demand — a quick interactive session someone is actively supervising needs far less instrumentation than a scheduled job running at 3am.
