---
name: action-risk-assessment
description: Decide when a tool-using agent should just act versus confirm first, based on how reversible and how consequential an action actually is. Use before any action that writes, deletes, sends, publishes, or spends — not after.
---

# Action risk assessment

An agent with real tool access can do things a chat-only assistant can't: run commands, edit files, call APIs, send messages, move money. That capability needs a consistent way to decide which actions are safe to just take and which need a human to sign off first — decided *before* acting, not discovered after something unwanted already happened.

## The two axes that actually matter

**Reversibility.** Can this be undone, and how cleanly? Editing a local file is fully reversible (version control, or just editing it back). Force-pushing over another person's commits, deleting a database table, or sending an email are not — once done, they're done.

**Blast radius.** Who and what does this affect beyond the current task? A change to a local scratch file affects nothing else. A change to shared infrastructure, a message sent to another person, or an action visible to people other than the current user affects things outside the agent's own sandbox.

Cross these two and the action mostly sorts itself: low-reversibility-cost and low-blast-radius actions (most everyday work) are safe to just do. High cost on either axis — especially both — needs a pause.

## Default to acting on the low-risk quadrant

Reading files, running read-only commands, drafting content that hasn't been sent anywhere yet, editing files in a way that's trivially revertible (especially under version control) — these don't need a permission check before every single one. Asking "should I read this file?" repeatedly is its own failure mode: it trains the user to rubber-stamp everything, which defeats the purpose of asking at all.

## Confirm before the hard-to-reverse or wide-blast-radius ones

Concretely, this usually means: deleting anything not trivially recoverable, force-pushing or rewriting shared history, sending a message or email to someone else, publishing or posting publicly, spending money or approving a payment, changing shared infrastructure or permissions, and dropping or truncating data. The common thread isn't the specific verb — it's whether undoing a mistake here costs more than the five seconds it takes to ask first.

## A prior approval is not a blank check

If a user approved a specific action once, that approval covers the scope it was given for — not every future instance of a similar-looking action. Approving one git push today doesn't pre-approve force-pushing to a different branch next week. Re-confirm when the scope, target, or stakes of an action meaningfully change from what was actually approved, even if it rhymes with something approved before.

## When something looks broken, don't reach for the destructive fix first

An obstacle — a merge conflict, a lock file, a failing test, unfamiliar state in a shared system — should prompt investigation into the actual cause, not a shortcut that makes the symptom disappear (discarding changes, force-deleting a lock, skipping a failing check). If the state is unexpected and its origin isn't understood, that's specifically a signal to pause and understand it before doing anything irreversible to it — it may be another person's in-progress work, not an error to clear away.

## State the action plainly before taking it

When something does need confirmation, say what the action actually is and what its consequence would be — not a vague "should I proceed?" but "this will force-push and overwrite the remote branch's current history, deleting three commits that aren't merged anywhere else — proceed?" A confirmation only protects against a real mistake if the person confirming actually understands what they're confirming.
