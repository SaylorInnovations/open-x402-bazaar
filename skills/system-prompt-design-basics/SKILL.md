---
name: system-prompt-design-basics
description: How to write a system prompt that reliably shapes agent behavior — clear role, concrete constraints, and priority when instructions conflict. Use when writing a new agent's system prompt, or when an agent's behavior doesn't match what its instructions intended.
---

# System prompt design basics

The system prompt is the single highest-leverage piece of an agent's design — it sets the role, the boundaries, and the priorities that shape every response after it. A vague or contradictory system prompt produces an agent that behaves inconsistently no matter how good the underlying model is; a clear one produces predictable behavior even on cases it was never explicitly told about.

## State the role and purpose concretely

"You are a helpful assistant" tells a model almost nothing useful. "You are a support agent for a billing system; you can look up invoices and process refunds under $100, and you escalate anything larger to a human" gives the model an actual frame to reason within. Specificity about what the agent is for and what it's not for does more work than any amount of generic politeness instructions.

## Write constraints as concrete rules, not vibes

"Be careful with destructive actions" is weaker than "never delete a record without explicit confirmation in the same turn." Vague guidance leaves the model to interpret where the line is, and it will interpret inconsistently across similar-looking situations. A concrete, checkable rule produces the same behavior every time it applies.

## Resolve conflicts before the model has to

If a system prompt contains instructions that can conflict — "always answer concisely" and "always explain your full reasoning" — the model will resolve that conflict inconsistently, differently across similar requests. Whenever two instructions could plausibly point different directions in some situation, either state which one wins, or scope both narrowly enough that they don't actually collide.

## Show, don't just tell, for behavior that's hard to describe abstractly

Some behaviors are much easier to convey with a concrete example than with an abstract rule — the exact tone wanted, the format of a specific kind of output, how to handle one particular edge case. A short example embedded in the prompt often locks in a behavior more reliably than another paragraph of description trying to specify it in the abstract.

## Order matters — put what's most important where it's most likely to stick

Instructions near the start and end of a long system prompt tend to have more influence than instructions buried in the middle of a long list. Don't rely on positioning as the only signal for what matters most, but do put the truly non-negotiable constraints somewhere they won't get lost in a wall of secondary detail.

## Iterate against real failures, not imagined ones

The most useful edits to a system prompt come from watching the agent actually fail at something and asking what specific instruction would have prevented it — not from speculatively adding rules for scenarios that haven't come up. A system prompt that's accumulated dozens of defensive rules for hypothetical edge cases is often harder to follow reliably than a shorter one grounded in real observed behavior.
