---
name: agent-architecture-fundamentals
description: The core mental model for how an AI agent actually works — model, tools, context, and loop — for someone building their first agent from scratch. Use when designing a new agent's structure, or explaining why an agent is behaving the way it is.
---

# Agent architecture fundamentals

An "AI agent" sounds complicated, but the core loop underneath almost every one is simple: a language model, a set of tools it can call, a context window holding the conversation so far, and a loop that keeps running until the task is done. Everything else — memory systems, planning frameworks, multi-agent setups — is built on top of this basic shape. Understanding the shape first makes every layer on top of it easier to reason about.

## The four pieces

**The model** is the reasoning engine. It reads everything currently in context and decides what to do next — respond in text, or call a tool. It has no memory of anything outside its current context window; it only knows what's actually been given to it in this conversation.

**Tools** are the actions the model is allowed to take — reading a file, calling an API, running a search, sending a message. Each tool has a name, a description, and a schema for its inputs. The model doesn't "know" how a tool works internally; it only knows the tool's description and decides to call it based on that description matching what it's trying to do. A tool the model doesn't understand from its description alone is a tool it will misuse or ignore.

**Context** is everything the model currently sees: the system prompt, the conversation history, and the results of any tool calls made so far. Context is not infinite — it has a size limit, and everything in it costs money and attention. What's in context directly shapes what the model can do next; information not in context effectively doesn't exist to the model, no matter how "true" it is elsewhere.

**The loop** is the process that ties it together: give the model the current context, let it decide to respond or call a tool, execute the tool if called, add the result back into context, and repeat until the model produces a final response instead of another tool call. An agent is, mechanically, just this loop running until it stops.

## Why this model explains agent behavior

Most confusing agent behavior traces back to one of these four pieces. An agent that "forgets" something earlier in a long task ran out of context space, or the information was never actually placed in context. An agent that misuses a tool likely had an unclear tool description, not a reasoning failure. An agent that loops without making progress is stuck in the loop stage without a clear stopping condition. Diagnosing agent behavior starts with asking which of the four pieces is actually responsible, not by assuming the model reasoned badly in the abstract.

## Statelessness is the default, not memory

Without a deliberate mechanism to persist it, everything in an agent's context disappears when the session ends — nothing is automatically remembered between conversations. If an agent needs to recall something across sessions, that requires an explicit, separate persistence mechanism (a file, a database, an external memory store) that gets deliberately read back into context at the start of the next session. Assuming an agent "just remembers" without that mechanism in place is one of the most common design mistakes when building a first agent.

## Start with the loop before adding complexity

It's tempting to reach for elaborate frameworks, multi-agent orchestration, or complex planning systems before the basic loop is even working reliably. Get a single model-tools-context-loop working correctly and predictably first — understand what a minimal agent does with a minimal toolset — before layering on complexity that will be much harder to debug if the fundamentals aren't solid underneath it.
