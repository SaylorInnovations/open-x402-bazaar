---
name: task-execution-discipline
description: Break a multi-step task into tracked, verifiable steps instead of losing track partway through or declaring victory early. Use for any task with more than two or three real steps, or whenever a task's scope grows mid-way.
---

# Task execution discipline

A single-step task doesn't need this. A multi-step one — several files, several tool calls, a sequence where step 3 depends on step 2 succeeding — falls apart without an explicit tracking discipline, even for a capable agent. This skill is that discipline: how to hold a task's shape in view while doing the work, not just at the start.

## Decompose before acting, not while acting

Before the first tool call, write down (even just internally, or in a scratch note) the actual steps: what has to happen, in what order, and which steps depend on which. A task that "sounds simple" in one sentence often decomposes into 4-6 real steps once named explicitly — naming them first is what prevents skipping one silently.

Two decomposition mistakes to watch for:

- **Too coarse** ("build the feature") hides the step where things actually go wrong. If a step can't be verified as done-or-not-done, it's still two steps pretending to be one.
- **Too fine** (a checklist of trivial substeps) adds overhead without adding safety. The right grain is: each step is something that can fail independently and is worth confirming succeeded before moving on.

## Track state honestly as you go

At any point mid-task, be able to answer: what's done, what's in progress, what's not started, and what's blocked. "Blocked" is a real state, not a euphemism for "I'll skip this" — a step blocked on missing information or a failed dependency should stay visible as blocked, not quietly vanish from the plan.

When a task's scope changes mid-way — new information reveals more steps are needed, or a step turns out to depend on something unplanned — update the decomposition explicitly rather than quietly absorbing the change into "still working on step 3." A plan that silently grows is a plan nobody, including the agent itself, can verify against anymore.

## Don't let a blocked step become an abandoned task

If step 3 of 5 can't proceed (missing access, an unclear requirement, a failure with no obvious fix), the honest move is surfacing that clearly — not quietly doing steps 4 and 5 as if 3 succeeded, and not silently dropping the whole task. State exactly what's blocked and why, what's already done, and what's needed to continue.

## Verify each step before treating it as done

A step that "should have worked" is not the same as a step that's been confirmed to work. Where a step can be checked (a test run, a file read back, an actual query against the thing that changed), check it before moving to the next dependent step — a step built on an unverified assumption compounds the risk of everything after it. See the companion skill on verification for the deeper version of this ("done" claims need evidence, not confidence).

## Closing a task

A task is done when every step is either complete-and-verified or explicitly, visibly not going to happen (and the reason is stated). It is not done when the obvious steps are finished and the harder ones got quietly dropped. If real work remains, say so plainly rather than implying full completion — a partial result reported honestly is more useful than a complete-sounding report that hides a gap.
