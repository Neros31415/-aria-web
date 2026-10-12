# ARIA Desktop V1 — engineering plan

## Purpose

Prepare a Windows desktop assistant that can later support natural conversation, persistent memory, voice, web research, and permissioned computer interaction. The existing PWA remains a companion/prototype; this work does not replace it.

## Repository assessment (2026-10-13)

The existing repository contains a static PWA:
- `index.html`, `styles.css`: responsive UI.
- `app.js`: local canned replies and browser localStorage.
- `manifest.webmanifest`, `sw.js`: installable/offline shell.

The repository README explicitly states that there is no real model connection, web search, account/backend implementation, PC-phone sync, or Windows control. The deployed interface should therefore be described as a local prototype, not as an operational AI assistant.

## Desktop scaffold added

- `desktop/aria_desktop.py`: PySide6 desktop UI, SQLite conversation history and notes, mock mode, optional HTTP client.
- `desktop/requirements.txt`: desktop UI dependency.
- `.github/workflows/build-aria-windows.yml`: Windows CI build artifact.
- `desktop/README.md`: setup, build and security notes.

The backend HTTP contract in the desktop README is proposed. It has not been verified against the existing Cloudflare Worker. Do not configure a production URL until its actual request/response format and authentication are verified.

## Architecture direction

1. **Desktop shell:** native Windows UI; keep interface independent from model provider.
2. **Backend gateway:** server-side model credentials, authentication, rate limits, request validation, logging minimization, and usage limits.
3. **Conversation service:** bounded context, explicit timeout/error handling, model-independent request/response schema.
4. **Memory service:** user-visible local memory first; later support retrieval and explicit save/forget controls.
5. **Tools registry:** typed tools with narrow permissions and input validation.
6. **Approval broker:** ask before file writes/deletes, shell commands, sending messages, purchases, or other consequential actions. Keep an audit trail and allow cancellation.
7. **Voice:** add push-to-talk first; add wake-word only after privacy and OS behavior are assessed.
8. **Phone link:** authenticated, encrypted communication; never expose a desktop agent directly to the public internet without a secure pairing model.

## Non-goals for the first executable

- No arbitrary shell execution.
- No silent control of mouse/keyboard.
- No unrestricted file access.
- No unattended actions with external consequences.
- No secrets bundled in the executable.
- No claim of successful Windows validation until a workflow artifact is built and manually tested.

## Acceptance checklist

- [ ] Windows CI completes successfully.
- [ ] Executable launches on a clean Windows account.
- [ ] Conversation history persists across restarts.
- [ ] Local notes persist across restarts and can be deleted.
- [ ] Demo mode clearly indicates no real AI is connected.
- [ ] Backend timeout, malformed response, HTTP error, and offline cases are handled.
- [ ] Backend secrets remain server-side.
- [ ] Before tool capabilities are added, approval and cancellation behavior is tested.
