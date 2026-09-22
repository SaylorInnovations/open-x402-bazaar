---
name: testing-and-evals-basics
description: How to know whether an agent actually works before shipping it — concrete test cases, regression checks, and evals instead of "it seemed fine when I tried it." Use before shipping a new agent or a behavior change to an existing one.
---

# Testing and evals basics

An agent that worked on the one example tried during development is not the same as an agent that works reliably. Because a model's behavior is probabilistic and context-sensitive, a handful of manual tries during development gives a weak signal — real confidence comes from a defined set of test cases run consistently, the same way software testing works for any other kind of code.

## Write down concrete test cases before trusting a behavior

For each capability an agent needs — a task it should complete, a boundary it should respect, an edge case it should handle — write an actual input and the expected outcome, not just a vague sense of "it should probably do X." A test case that can be run again and checked is worth far more than a memory of it working once during development.

## Cover the boundaries, not just the golden path

The easy case usually works; what breaks an agent in practice is the edge case — ambiguous input, a tool that returns an error, a request that's slightly outside what was expected, a malicious or adversarial input. A test set that only covers the clean, expected path will miss exactly the failures that matter most once real, messier input arrives.

## Re-run existing tests after every meaningful change

A change made to fix one behavior can silently break another — a system prompt edit that fixes one case can change behavior on cases that were working fine before. Treat a prior test case as a regression check: if it passed before a change, confirm it still passes after, rather than assuming an unrelated-looking change couldn't have affected it.

## Evaluate the outcome, not just whether it ran without error

An agent can complete a task without throwing an error and still produce the wrong result — it called a tool successfully but chose the wrong one, or it answered fluently but incorrectly. A meaningful eval checks whether the actual outcome was correct, not just whether execution completed without crashing.

## Automate what can be automated, and be honest about what can't

Some outcomes are easy to check automatically (did it call the right tool, does the output match an expected format); others genuinely require human judgment (is this response actually helpful, is this tone right). Automate the checkable cases so they can run cheaply and often, and be explicit about which cases still need a human to actually look — don't let "hard to automate" quietly turn into "never checked."

## A test suite that never fails is not being trusted enough

If test cases are never updated and never fail, that's often a sign they're not actually being exercised against real changes, not a sign the agent is flawless. A useful test set grows over time — every real failure found in practice becomes a new test case, so the same mistake can't silently reappear later unnoticed.
