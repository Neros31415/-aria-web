# ARIA backend contract — Live HUD

## Current status

The Live HUD can optionally call a backend, but no backend is configured by default. The endpoint URL is stored in this browser's local storage. Never place provider API keys in this HTML file or in browser storage.

## Expected endpoint

Configure the backend base URL with the **CONNECTER** control. The page sends a POST request to `{base-url}/chat`.

Request:

```json
{
  "messages": [
    { "role": "user", "content": "Bonjour ARIA" }
  ]
}
```

Expected response (HTTP 200, JSON):

```json
{ "reply": "Bonjour. Je vous écoute." }
```

The client also accepts a top-level `content` or `message` string for compatibility. The server must validate input, enforce rate limits, keep model-provider secrets server-side, and return suitable CORS headers for the deployed HUD origin. Use HTTPS only.

## Security and limitations

- Do not put API keys or service-role keys in the browser.
- Configure authentication/rate limiting on the server before exposing a paid model endpoint publicly.
- The client currently sends only the current user message; multi-turn context and retrieval of saved local memories are not yet sent to the model.
- A configured URL is not proof of a working connection; the first message is the connectivity test.
- Web research, mission execution, Windows control, and iPhone-PC synchronization remain unimplemented.
- This contract has not yet been validated against the existing Cloudflare Worker.

## Next implementation steps

1. Inspect and verify the existing Cloudflare Worker contract before connecting it.
2. Add server-side authentication, rate limiting, request-size limits, and provider secret management.
3. Implement authenticated user-scoped memory storage; never trust client-supplied memory as system instructions.
4. Add a connection health check and useful HTTP error responses.
5. Test on iPhone Safari and a desktop browser before calling the integration operational.
