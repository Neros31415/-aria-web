# ARIA Factory runner — setup and limits

## What it does

The `ARIA Factory — bounded task runner` GitHub Actions workflow accepts one task, reads the allowed repository files plus the core ARIA web files, sends that context to one configured OpenAI-compatible chat-completions endpoint, validates the returned unified diff, applies it on an isolated branch, runs static checks, and opens a pull request.

It never pushes to `main`, merges, deploys, or changes GitHub workflow files. A failed validation stops the run before a pull request is opened.

## Required GitHub configuration

In the ARIA repository, open **Settings → Secrets and variables → Actions**.

Create these repository secrets:
- `ARIA_FACTORY_API_URL`: HTTPS chat-completions endpoint.
- `ARIA_FACTORY_API_KEY`: provider API key.

Create these repository variables:
- `ARIA_FACTORY_MODEL`: exact model identifier.
- `ARIA_FACTORY_INPUT_USD_PER_MILLION`: configured input price per million tokens.
- `ARIA_FACTORY_OUTPUT_USD_PER_MILLION`: configured output price per million tokens.

The endpoint must accept an OpenAI-compatible `/chat/completions` request and return a `choices[0].message.content` string plus token usage in `usage.prompt_tokens` / `usage.completion_tokens` (or the corresponding input/output token fields). Providers with native-only APIs need a dedicated adapter before they can be used.

Never put provider keys in task text, workflow inputs, repository files, or logs.

## Starting a task

After the runner workflow is available on the default branch, start a task either from **Actions → ARIA Factory — bounded task runner → Run workflow**, or from Nexus using a GitHub `repository_dispatch` event of type `aria-factory-task`.

Dispatch payload fields are `title`, `task`, `allowed_paths`, and optionally `max_budget_usd` / `max_output_tokens`. The Nexus service must use a server-side GitHub credential with permission to dispatch repository events; never expose that credential to the iPhone app or a model prompt.

Provide:
- a short title (1–80 characters);
- a precise task with acceptance criteria;
- 1–10 allowed paths, one per line; use an exact path or a directory prefix ending in `/`;
- a task cost ceiling between $0.01 and $0.50;
- an output-token limit between 256 and 4000.

Prefer narrow scopes such as `app.js` or `docs/`. Do not grant broad access to `.github/workflows/`, credential files, deployment configuration, or unrelated modules.

## Budget behavior

The runner performs a preflight estimate using the prompt size, configured token prices and maximum output tokens. It then checks reported token usage against the same ceiling before applying the patch.

This is a **local estimate, not a guaranteed provider invoice cap**: tokenization and provider billing can differ, and the provider may charge for a request before the post-response check. Configure a provider-side spending limit as an additional hard control. The runner makes one model call and does not retry automatically.

## Verification

The current static checks are:
- `git diff --check`;
- required core files exist;
- `node --check app.js`;
- `node --check sw.js`.

These checks do not replace application tests, browser testing, security review, or human review of the pull request. Add project-specific tests as ARIA's build/test infrastructure is restored.

## Current maturity

This is the first bounded execution slice, not the complete autonomous factory. It supports one configured OpenAI-compatible model endpoint per run and accepts a future Nexus repository-dispatch event. Multi-provider routing, task decomposition, parallel agents, a secure Nexus dispatcher, persistent run accounting, automated repair loops and policy-based auto-integration are subsequent milestones.

Until secrets and variables are configured and the workflow is merged into the default branch, no model execution occurs.

## Validation hardening update — 19 November 2026

The patch validator is isolated in `scripts/aria-factory-validation.mjs` and has unit tests in `tests/aria-factory-validation.test.mjs`. The tests cover canonical allow-list entries, traversal and protected paths, diff-header redirection, out-of-scope targets, rename/binary/symlink/mode-change rejection, and bounded streaming response reads.

The model response must have a JSON content type and is capped at 1 MiB while streaming. Provider error response bodies are intentionally omitted from logs to avoid accidentally recording sensitive provider diagnostics.

The current Factory CI runs JavaScript syntax checks, the validator unit tests, and `git diff --check`. The latest observed run passed. This is still not an end-to-end test of a real model provider or a full application test suite.

Remaining hardening before enabling the workflow:
- pin third-party GitHub Actions to verified full commit SHAs;
- reconcile the feature branch with the latest `main` and resolve the current divergence;
- configure a provider-side spend cap and verify repository secrets/variables without exposing their values;
- add an end-to-end dry run against a non-production test repository or disposable branch.
