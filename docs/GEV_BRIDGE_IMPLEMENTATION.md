# ARIA ↔ God's Eye View bridge — implementation note

Status: isolated implementation spike on `feat/aria-gev-bridge`. It is not wired into the live ARIA interface and no deployment or iPhone validation is claimed.

## Files

- `geo/gev-bridge.js`: small adapter that waits for `gev:ready`, sends `gev:view`, correlates `gev:view-applied` by request ID, returns the reported status/steps, times out, and disposes listeners.
- `tests/gev-bridge.test.mjs`: Node built-in tests for exact origin/source checks, success/failure responses, input validation, and disposal.

## Security properties

- Requires an exact trusted GEV origin.
- Requires HTTPS for remote origins; HTTP is allowed only for localhost development.
- Accepts messages only when both `event.source === iframe.contentWindow` and `event.origin === trustedOrigin`.
- Sends `postMessage` using the exact `targetOrigin`, never a wildcard.
- Validates camera latitude/longitude and bounds list sizes before sending.
- Does not execute model-generated JavaScript or expose ARIA backend secrets to the frame.
- Treats a GEV response with `ok: false` as a reported failure, not a success.

## Run the focused tests

With a supported Node runtime and repository checked out:

```sh
node --test tests/gev-bridge.test.mjs
```

This test file is standalone and uses Node's built-in test runner. It does not require GEV's dependencies because the bridge protocol is tested with a mocked iframe.

## Example integration (after deployment is approved)

```js
import { createGevBridge } from "./geo/gev-bridge.js";

const frame = document.querySelector("#aria-geo-frame");
const bridge = createGevBridge({
  iframe: frame,
  origin: "https://<approved-gev-host>",
  onStatus: (status) => console.info("GEV:", status),
});

const result = await bridge.applyView({
  camera: { lat: 48.8566, lon: 2.3522, altitude_m: 1200000, pitch_deg: -50 },
  layers: [],
  annotations: [],
});

if (!result.ok) {
  // Display the failure in the ARIA UI; do not claim the map changed successfully.
}
```

The example is illustrative only; replace the placeholder with the real deployed origin and use a CSP/referrer policy appropriate to that deployment. It is not currently part of `index.html` or `app.js`.

## Deployment blockers to resolve first

1. Choose the canonical host for the GEV build and required same-origin provider routes.
2. Configure GEV's `GEV_EMBED_FRAME_ANCESTORS` with the exact ARIA origin. GEV documents frame embedding as disabled by default.
3. Build and host the app/panel assets and verify all required server-side provider endpoints. Static hosting alone may not support every GEV data provider.
4. Use separately restricted browser-visible map keys for the deployed origin; keep long-lived provider secrets server-side.
5. Test the full path on iPhone Safari: iframe load, touch controls, camera command, failure state, navigation away/back, memory use and heat.
6. Run `node --test tests/gev-bridge.test.mjs` and inspect the diff before considering merge.

## Scope decision

This spike implements only a transport adapter. It does not provide the globe, deploy GEV, change ARIA's production page, configure DNS/CSP, or prove that any data layer is live. The first product milestone remains one real, safe camera command against a deployed GEV instance.
