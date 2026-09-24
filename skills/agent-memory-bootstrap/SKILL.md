---
name: agent-memory-bootstrap
description: Give an agent persistent memory across sessions — a simple file-based system for recalling prior decisions, user preferences, and project context instead of starting from zero every time. Use when setting up a new agent, or when an agent has no way to remember anything between conversations.
---

# Agent memory bootstrap

Most agent setups have no memory: every session starts cold, and everything the user explained last time has to be re-explained. This skill is the smallest system that fixes that — a plain directory of Markdown files an agent reads before answering and writes to after real progress. No database, no special tooling, works with any agent that can read and write files.

## Why file-based, not a database

A database needs a schema decided in advance and a query layer to maintain. A directory of dated Markdown files needs neither: it's greppable, diffable, human-readable without tooling, and works whether the agent's job is customer support, coding, or research. Structure emerges from use instead of being designed upfront. If a project later needs real search or structured queries, this becomes the seed data for that — not wasted effort.

## Directory layout

Create this structure in the agent's working directory (or a fixed path the agent always has access to, if sessions run in different working directories):

```
memory/
  MEMORY.md          — index: one line per topic, links to the files below
  Decisions/          — durable choices that shouldn't be re-litigated each session
  Projects/           — live status per ongoing project or initiative
  Reference/          — pointers to external systems (where bugs are tracked, where docs live)
  YYYY-MM-DD.md        — dated handoff notes, one per day with meaningful activity
```

Start minimal. `MEMORY.md` and one dated file are enough on day one — the other folders exist for when there's enough content to need them, not because every new setup needs all four categories immediately.

## The four types of memory, and when to write each

**Decisions** — a choice that should stay stable once made, not be re-decided every session. Write one when the user corrects an approach ("don't do X, we tried that and it broke Y") or explicitly confirms a non-obvious choice ("yes, keep it that way"). Include *why*, not just *what* — the reason is what lets a future session judge edge cases the original decision didn't cover.

**Projects** — the current state of something ongoing: who's doing what, why, blocked on what. This decays fast. Convert relative dates ("next Tuesday") to absolute ones when writing, since the note will be read again after time has passed and "next Tuesday" won't mean anything by then.

**Reference** — not a fact, a *pointer*: "bugs are tracked in Linear project X," "the deploy runbook lives at Y." Saves re-discovering where things live.

**Dated handoffs** — a short, dense summary appended after any session with real progress: what changed, what's next. This is the raw log; `MEMORY.md` and the topic files above are the distilled version other sessions actually read.

## What NOT to store

- Anything derivable from the code or environment itself (file structure, current git state) — that's always available fresh; a memory of it just goes stale and misleads.
- Secrets, tokens, credentials — never, under any circumstance.
- Ephemeral task state that belongs to the current conversation only.
- Debugging solutions — the fix belongs in the commit message or the code itself, not a separate memory file that can drift out of sync with what the code actually does.

## The read/write discipline

**Read before answering** anything that depends on prior context: check `MEMORY.md` first, follow links to the specific `Decisions/` or `Projects/` file if the topic matches, and only fall back to asking the user if nothing relevant exists.

**Verify before trusting.** A memory file is a snapshot from when it was written — code gets renamed, features ship, plans change. Before acting on a specific claim (a function name, a file path, a "this is still true" fact), check that it still holds. A memory saying "the export function is in `utils.py`" is a *claim*, not a *fact* — confirm the file still exists before recommending it.

**Write after meaningful work**, not after every message. A session that just answered a question doesn't need a memory update. A session that made a decision, finished a task, or learned something that will matter next time does. Keep entries factual and dated; skip narrating the process of getting there.

## Getting started

1. Create `memory/MEMORY.md` with one line: the date and "bootstrapped memory system."
2. At the start of every session, read it.
3. After the first session with real progress, append a dated handoff and update any relevant topic file.
4. That's the whole system. Everything else — categorization, the Decisions/Projects/Reference split — is just organizing this same habit as it accumulates content.
