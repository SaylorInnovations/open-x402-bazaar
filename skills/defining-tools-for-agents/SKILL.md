---
name: defining-tools-for-agents
description: How to write tool names, descriptions, and schemas that a model will actually use correctly. Use when adding a new tool to an agent, or when an agent is misusing, ignoring, or confusing an existing tool.
---

# Defining tools for agents

A tool is only as good as its description. The model deciding whether and how to call a tool has no access to the tool's implementation — it only sees the name, the description, and the parameter schema. If those don't clearly communicate what the tool does, when to use it, and what it needs, the model will guess, and guesses produce misuse: wrong tool chosen, wrong arguments, or a tool ignored entirely when it was actually the right one.

## The description is the interface, not the implementation

Write a tool's description for the model deciding whether to call it, not for a developer reading the source code later. State what the tool does, what it's for, and — critically — when to use it versus not use it. "Fetches a URL" is weaker than "Fetches the contents of a web page; use this to read external documentation or articles, not for URLs the agent doesn't have reason to trust." The second version helps the model make a better decision, not just a technically correct one.

## Name tools for what they do, not how they're implemented

A tool name is the first and strongest signal the model uses to pick between options. `search_web` communicates intent clearly; `endpoint_3` or `handler_search` doesn't. When two tools could plausibly overlap (a broad search vs. a targeted lookup), the names and descriptions need to make the distinction obvious, or the model will pick inconsistently between them.

## Narrow, well-defined tools beat broad, ambiguous ones

A tool that does one clear thing is easier for a model to use correctly than one that does many things depending on flags or modes the model has to infer correctly. When a tool's behavior branches significantly based on its parameters, consider whether it's really several tools wearing one name — splitting it often produces more reliable use than documenting the branches more exhaustively.

## Parameter schemas need the same clarity as the description

Required versus optional parameters, valid value ranges, and expected formats should be explicit in the schema, not left to be inferred from the description text. A parameter named `id` with no further detail invites the model to guess its format; documenting that it's "the resource's slug, not its numeric ID" prevents an entire class of avoidable errors.

## Tell the model what a tool doesn't do

Boundaries matter as much as capabilities. If a tool looks like it might do something it doesn't — a `delete` tool that only soft-deletes, a `search` tool that only covers one data source — say so explicitly. The gap between what a tool's name suggests and what it actually does is exactly where an agent will make confident, wrong assumptions.

## Test a tool's description by imagining only the description exists

Before shipping a new tool, read only its name, description, and schema — not the implementation — and ask whether it's actually clear when to use it and how to call it correctly. If that's not obvious from the interface alone, the model calling it blind will have the same problem, just without a chance to ask for clarification first.
