---
name: context-engineering
description: Curate what stays in a long-running agent's context window as it grows — progressive disclosure, compaction, and clearing stale tool results — instead of letting it fill up with everything ever seen. Use for any agent session that runs many steps or accumulates large tool outputs.
---

# Context engineering

A context window is a fixed, expensive resource, not an append-only log. An agent that keeps everything it has ever seen — every full file read, every verbose tool result, every intermediate exploration — degrades long before it hits the hard token limit: relevant information gets buried, cost climbs, and the model's attention gets diluted across material that no longer matters. Context engineering is the discipline of actively curating what stays, not just reacting once the window is full.

## Context is curated, not accumulated

The default instinct is to treat context as a transcript: everything that happened goes in, in order, forever. The better model is a working set — what does the agent actually need *right now* to make the next good decision. Information that was necessary to complete a finished sub-step (the full contents of a file already edited, a search result already acted on) is usually safe to compress or drop once that step is done, even though it was essential a moment ago.

## Progressive disclosure over upfront loading

Load the minimum needed to decide the next action, and fetch more only when a specific need for it appears — rather than front-loading everything that might conceivably be relevant. A file's full contents aren't needed to decide whether to read it; a broad search result's every field isn't needed to decide which result to follow up on. Progressive disclosure keeps the window's early space cheap and defers cost to the point where it's actually justified.

## Compact instead of just deleting

When something is done with but might still hold relevant signal, summarizing it into a compact form preserves the useful part without paying to keep the verbose original around. A long tool output that confirmed "no matches found" can become one line saying so; a multi-file exploration that converged on one relevant file can become a note naming that file and why. Losing the raw form is fine once its conclusion has been captured.

## Clear stale tool results deliberately

A tool result that was central to one decision can become dead weight once that decision is made — especially large ones (full file contents, big API responses, verbose logs). Treat "is this still load-bearing" as a question worth asking periodically, not just at the end, and clear or compact results that have stopped being load-bearing rather than letting them ride passively for the rest of the session.

## Match the technique to the growth pattern

A short, bounded task doesn't need active curation — the natural context size never gets large enough to matter. A long-running agent loop, a multi-step research task, or anything that accumulates large tool outputs over many turns is where this discipline pays off, and where skipping it causes the most damage. Apply the effort where the growth actually happens, not uniformly everywhere.

## Signs context engineering is needed

Watch for these as they emerge, not just at a hard limit: the agent re-reading something it already saw because the original is now buried, responses getting slower or less focused as a session goes on, or a growing gap between how much is in context and how much of it is still relevant to the current step. Each is a cue to compact or clear, not just to keep going and hope the window holds.
