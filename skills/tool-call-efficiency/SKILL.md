---
name: tool-call-efficiency
description: Use the minimum tool calls that actually resolve a task — read only what's needed, avoid redundant re-reads, and batch independent calls instead of serializing them. Use whenever a task involves searching, reading, or calling multiple tools.
---

# Tool call efficiency

Every tool call has a cost — latency, tokens, and (for paid APIs or metered resources) real money. An agent that reads whole files when it needs ten lines, re-fetches data it already has, or runs calls one at a time that could run together isn't more careful — it's just slower and more expensive for the same result. This skill is the discipline of matching tool use to what a task actually requires.

## Read what you need, not everything available

A file, API response, or search result often contains far more than the task requires. Prefer targeted reads (a line range, a specific field, a scoped query) over pulling the whole thing when the whole thing isn't needed. When the scope is genuinely unclear, a broader first read is reasonable — but treat it as an exception to justify, not a default.

## Don't re-fetch what you already have

Information already returned by a prior tool call is still valid unless something in the task specifically invalidates it (time has passed and it's time-sensitive, another action may have changed it, or the task explicitly requires a fresh read). Re-reading a file that hasn't changed, or re-querying an API for data already in hand, wastes a call for zero new information.

## Batch independent calls, serialize dependent ones

If two tool calls don't depend on each other's output, issue them together rather than one after another waiting on each round-trip. If a call's input depends on a previous call's output, that dependency is real and must be respected — the fix isn't to serialize everything defensively, it's to correctly identify which calls are actually independent.

## Prefer the cheaper tool that answers the same question

Different tools can answer the same question at very different costs — a targeted search versus reading every file in a directory, a lightweight status check versus a full data pull, a text extraction versus rendering a document as an image. When multiple tools could resolve a step, default to the cheapest one that reliably gets a correct answer, and reach for the expensive one only when the cheap one is insufficient or has already failed.

## Metered and rate-limited resources need extra restraint

When a tool call draws against a real limit — a paid API, a daily quota, a rate-limited endpoint — treat each call as a resource to spend deliberately, not a free action. Before a bulk or repeated operation against a metered resource, consider whether it can be batched, cached, or scoped down, since exhausting a shared quota can degrade or break the resource for everyone else relying on it, not just the current task.

## Efficiency is not a reason to skip a needed call

This skill argues for cutting waste, not for cutting corners. A call that's actually needed to verify a result, check a precondition, or get accurate information is not "inefficient" — skipping it to save a call and guessing instead trades a small, real cost now for a much larger risk of being wrong. The target is zero wasted calls, not zero calls.
