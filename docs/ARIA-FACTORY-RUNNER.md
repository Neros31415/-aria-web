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

After the runner workflow is available on the default branch, open **Actions → ARIA Factory — bounded task runner → Run workflow**.

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

This is the first bounded execution slice, not the complete autonomous factory. It supports one configured OpenAI-compatible model endpoint per run. Multi-provider routing, task decomposition, parallel agents, Nexus dispatch, persistent run accounting, automated repair loops and policy-based auto-integration are subsequent milestones.

Until secrets and variables are configured and the workflow is merged into the default branch, no model execution occurs.
