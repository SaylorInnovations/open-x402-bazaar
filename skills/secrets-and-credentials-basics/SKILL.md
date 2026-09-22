---
name: secrets-and-credentials-basics
description: How to handle API keys, tokens, and passwords in an agent's code and behavior so they never leak into logs, code, prompts, or third-party requests. Use when an agent's code touches any credential, or when wiring up a new API integration.
---

# Secrets and credentials basics

A credential leak is one of the few mistakes in agent development that can't be undone by fixing the code afterward — once a key is exposed, it has to be treated as compromised and rotated, whether or not it was actually misused. Building the habit of handling secrets correctly from the first line of code is much cheaper than cleaning up after a leak.

## Never hardcode a credential into source code

A key typed directly into a file will eventually end up somewhere it shouldn't — committed to version control, pasted into a shared chat, included in a bug report. Credentials belong in environment variables, a secrets manager, or an equivalent mechanism designed to keep them out of the code itself, from the very first version of a project, not added "later" once things are more serious.

## Treat anything that touched a secret as sensitive

A log line, an error message, or a debug print that includes a credential's value spreads the secret to wherever that log lives — which is often less protected than the original source. Redact or omit secret values from logs, error output, and any debug information by default, rather than assuming they won't end up somewhere they shouldn't.

## Secrets used by one integration should not reach another

When an agent has credentials for multiple services, a request to Service A should never include a token meant for Service B, and a credential should never be forwarded to a URL or service it wasn't explicitly issued for. This matters especially for agents that fetch or process external content — a credential should never be echoed into a request that content itself suggested making.

## Scope credentials to what's actually needed

A credential with broad access used for a narrow task is a bigger loss if it leaks than a narrowly scoped one. Where the option exists, prefer the least-privileged credential that still does the job — a read-only key over a read-write one, a scoped token over an account-wide one — so that the blast radius of a mistake or leak is bounded.

## `.gitignore` a secrets file before it exists, not after

If credentials live in a local file (a `.env` file, a config file with embedded keys), that file's pattern belongs in `.gitignore` from the moment the project is created — not added reactively after noticing it almost got committed. Checking `git status` before staging broadly, and looking twice at any file that might hold a credential even if its name looks innocuous, catches what a missing `.gitignore` entry doesn't.

## If a secret leaks, rotate it — don't just delete the trace

Removing a committed secret from the latest version of a file doesn't remove it from history, from whoever already saw it, or from any system that cached it. The only reliable response to an exposed credential is rotating it — issuing a new one and invalidating the old — treating the old value as permanently compromised regardless of whether misuse is confirmed.
