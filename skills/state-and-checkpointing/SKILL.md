---
name: state-and-checkpointing
description: Persist a long-running agent's progress outside the session so an interrupted run resumes from where it left off instead of restarting from zero. Use for any agent task that runs longer than one turn, hits a turn limit, or can be interrupted mid-way (a crash, a timeout, a deliberate pause).
---

# State and checkpointing

A session is ephemeral — the conversation and its context disappear when the process ends, is killed, or hits a limit. For a short task that's irrelevant; for anything that runs many steps, takes real wall-clock time, or does expensive or hard-to-repeat work along the way, losing all of that on an interruption means starting over from scratch. Checkpointing is deliberately writing progress somewhere durable, outside the session, so an interruption costs the time since the last checkpoint, not the whole run.

## Sessions remember the conversation; checkpoints remember the work

These are different things. A session holds the back-and-forth that got an agent to its current state. A checkpoint holds the actual work product and progress markers — which steps are done, what's been written, what decisions were made — in a form that survives the session ending entirely. An agent can lose its session and still resume correctly if the checkpoint is good; it cannot resume correctly from a checkpoint that only exists in the conversation transcript.

## Checkpoint at natural completion boundaries

The right granularity is after a unit of work is genuinely done and verified, not at arbitrary intervals or only at the very end. Checkpointing too rarely means a long stretch of real progress is lost on interruption; checkpointing on every trivial sub-step adds overhead without adding meaningful safety. A completed file write, a verified test pass, a finished item in a batch — these are natural points where "resume from here" is unambiguous.

## A checkpoint needs to be resumable, not just present

Writing progress somewhere durable isn't enough if what's written doesn't actually let a fresh run pick up correctly — it needs enough information to reconstruct where things stand: what's done, what's in progress, what's still pending, and any state a later step depends on. A checkpoint that just says "made progress" without saying what was actually completed is close to useless for resuming correctly.

## Design for resume, not just for save

Saving progress is only half of checkpointing — the other half is a resume path that actually reads the checkpoint and picks up from it correctly, rather than a fresh run naively starting from step one regardless of what's already been saved. Building the save path without a working resume path is a common gap: it looks like checkpointing exists, but an interruption still causes a full restart in practice.

## Idempotency matters more than it looks like it should

A resumed run may re-attempt a step that actually did complete before the interruption, if the checkpoint was written slightly before or after the true completion point. Steps that are safe to run twice (writing the same file with the same content, an operation that checks current state before acting) tolerate this cleanly; steps with real side effects that aren't safe to repeat (sending a message, spending money, an API call with side effects) need an explicit check against the checkpoint before re-running, not just blind re-execution.

## Match the effort to how expensive an interruption actually is

A task that takes thirty seconds and can just be restarted doesn't need checkpointing infrastructure — the cost of building it exceeds the cost of occasionally losing thirty seconds. A task that takes an hour, calls a paid API many times, or does something that can't be cleanly repeated (an external side effect already sent) is exactly where checkpointing earns its cost. Build it where an interruption would actually hurt, not reflexively everywhere.
