---
name: workflow-orchestration-patterns
description: The reusable control-flow patterns for composing an agent out of more than one step — prompt chaining, routing, parallelization, orchestrator-worker, and evaluator-optimizer — instead of cramming everything into one undifferentiated loop. Use when a task is too complex or too varied for a single model-tools-context-loop to handle well.
---

# Workflow orchestration patterns

A single model-tools-context-loop (see the companion skill on agent architecture fundamentals) is the right shape for a simple, uniform task. Once a task has multiple genuinely different phases, branches on its input, or benefits from breaking into independent pieces, forcing it all through one undifferentiated loop produces a prompt that's trying to do too many different jobs at once. A small set of reusable composition patterns covers most of what's actually needed instead.

## Prompt chaining

Break a task into an ordered sequence of steps, where each step's output feeds the next, often with a validation check between them. This fits tasks that naturally decompose into stages — draft, then critique, then revise — where each stage benefits from focusing on one job rather than trying to do all of them in a single pass. The cost is added latency from the extra steps; the benefit is each step is simpler and more reliable than the combined version would be.

## Routing

Classify the input first, then send it down one of several specialized paths built for that category, rather than handling every kind of input with one generic path. This fits tasks where inputs cluster into genuinely different types that need different handling — different tools, different prompts, different levels of care. Routing badly (a classifier that misjudges the category) fails at the very first step, so the classification itself deserves real attention, not just the paths downstream of it.

## Parallelization

Run independent subtasks at the same time instead of one after another, either by splitting one task into independent pieces (sectioning) or by running the same task multiple times to compare or vote on results (voting). This fits work that doesn't depend on itself sequentially — several independent lookups, several independent analyses of different aspects of the same input. The prerequisite is genuine independence; forcing parallelization onto steps that actually depend on each other's output produces races and inconsistent results, not speed.

## Orchestrator-worker

A central orchestrating step breaks a task into subtasks dynamically, based on what the actual input requires, then dispatches each to a worker and combines the results — different from prompt chaining because the decomposition isn't fixed in advance, and different from parallelization because the subtasks aren't predetermined. This fits open-ended tasks where the right decomposition depends on the specific input and can't be hard-coded ahead of time, at the cost of more complexity in the orchestrating logic itself.

## Evaluator-optimizer

One step generates a candidate result, a separate step evaluates it against explicit criteria, and the loop repeats with feedback until the result passes or a limit is reached. This fits tasks where there's a clear way to judge quality and iterative refinement measurably helps — but it costs real time and calls, so it's worth it specifically when generation is unreliable on the first pass and evaluation is reliable, not as a default safety net for every step.

## Start simple, add structure only where it earns its cost

Every pattern beyond a single loop adds real complexity — more steps to build, more places for something to go wrong, more latency. The right default is the simplest structure that handles the task correctly, adding one of these patterns only when a concrete problem (inputs that need different handling, a task too broad for one pass, unreliable first-pass quality) actually calls for it — not preemptively, on the assumption that more structure is inherently more robust.
