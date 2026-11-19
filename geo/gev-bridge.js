/**
 * Minimal, origin-locked bridge between ARIA and an embedded God's Eye View.
 *
 * This adapter is intentionally not wired into the production UI yet. The
 * caller must provide a trusted iframe URL and exact origin after deployment
 * and CSP have been configured.
 */

const READY = "gev:ready";
const VIEW = "gev:view";
const APPLIED = "gev:view-applied";

function normalizeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("GEV origin must be a valid URL.");
  }
  const localHttp = url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.origin === "null" || (url.protocol !== "https:" && !localHttp)) {
    throw new TypeError("GEV must use HTTPS (HTTP is allowed only on localhost).");
  }
  return url.origin;
}

function validateView(view) {
  if (!view || typeof view !== "object" || Array.isArray(view)) {
    throw new TypeError("GEV view must be an object.");
  }
  const camera = view.camera;
  if (!camera || typeof camera !== "object" ||
      !Number.isFinite(camera.lat) || camera.lat < -90 || camera.lat > 90 ||
      !Number.isFinite(camera.lon) || camera.lon < -180 || camera.lon > 180) {
    throw new TypeError("GEV view requires valid camera latitude and longitude.");
  }
  if (view.layers !== undefined &&
      (!Array.isArray(view.layers) || view.layers.length > 80 ||
       !view.layers.every((layer) => typeof layer === "string" && layer.length <= 100))) {
    throw new TypeError("GEV view layers are invalid.");
  }
  if (view.annotations !== undefined &&
      (!Array.isArray(view.annotations) || view.annotations.length > 100)) {
    throw new TypeError("GEV view annotations are invalid.");
  }
  if (view.follow !== undefined && view.follow !== null) {
    const allowedKinds = new Set(["aircraft", "military_aircraft", "satellite"]);
    if (!allowedKinds.has(view.follow.kind) ||
        typeof view.follow.id !== "string" ||
        view.follow.id.length < 1 || view.follow.id.length > 160) {
      throw new TypeError("GEV follow target is invalid.");
    }
  }
  // Ensure the payload is serializable before crossing the frame boundary.
  try {
    JSON.stringify(view);
  } catch {
    throw new TypeError("GEV view must be serializable.");
  }
}

/**
 * @param {object} options
 * @param {{contentWindow: {postMessage: Function}}} options.iframe
 * @param {string} options.origin Exact trusted GEV URL/origin.
 * @param {Window} [options.windowRef]
 * @param {number} [options.timeoutMs]
 * @param {(status: string) => void} [options.onStatus]
 */
export function createGevBridge({
  iframe,
  origin,
  windowRef = globalThis.window,
  timeoutMs = 8000,
  onStatus = () => {},
}) {
  if (!iframe?.contentWindow || typeof iframe.contentWindow.postMessage !== "function") {
    throw new TypeError("A loaded GEV iframe element is required.");
  }
  if (!windowRef?.addEventListener || !windowRef?.removeEventListener) {
    throw new TypeError("A window-like message target is required.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new TypeError("timeoutMs must be a positive number.");
  }

  const trustedOrigin = normalizeOrigin(origin);
  let ready = false;
  let disposed = false;
  const pending = new Map();
  const readyWaiters = new Set();

  function clearWaiter(waiter) {
    clearTimeout(waiter.timer);
    readyWaiters.delete(waiter);
  }

  function onMessage(event) {
    if (disposed || event.source !== iframe.contentWindow || event.origin !== trustedOrigin) {
      return;
    }
    const message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.type === READY) {
      ready = true;
      for (const waiter of [...readyWaiters]) {
        clearWaiter(waiter);
        waiter.resolve();
      }
      onStatus("ready");
      return;
    }

    if (message.type !== APPLIED || (typeof message.id !== "string" && typeof message.id !== "number")) {
      return;
    }
    const request = pending.get(String(message.id));
    if (!request) return;

    clearTimeout(request.timer);
    pending.delete(String(message.id));
    const result = {
      ok: message.ok === true,
      steps: Array.isArray(message.steps) ? message.steps : [],
      ...(typeof message.error === "string" ? { error: message.error } : {}),
    };
    onStatus(result.ok ? "view-applied" : "view-failed");
    request.resolve(result);
  }

  function waitUntilReady() {
    if (disposed) return Promise.reject(new Error("GEV bridge has been disposed."));
    if (ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          readyWaiters.delete(waiter);
          reject(new Error("Timed out waiting for GEV to become ready."));
        }, timeoutMs),
      };
      readyWaiters.add(waiter);
    });
  }

  windowRef.addEventListener("message", onMessage);

  return Object.freeze({
    waitUntilReady,

    async applyView(view) {
      validateView(view);
      await waitUntilReady();
      if (disposed) throw new Error("GEV bridge has been disposed.");

      const id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `aria-gev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(String(id));
          reject(new Error("Timed out waiting for GEV to apply the view."));
        }, timeoutMs);
        pending.set(String(id), { resolve, reject, timer });

        try {
          iframe.contentWindow.postMessage({ type: VIEW, id, view }, trustedOrigin);
          onStatus("view-sent");
        } catch (error) {
          clearTimeout(timer);
          pending.delete(String(id));
          reject(error);
        }
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      windowRef.removeEventListener("message", onMessage);
      for (const [id, request] of pending) {
        clearTimeout(request.timer);
        request.reject(new Error("GEV bridge has been disposed."));
        pending.delete(id);
      }
      for (const waiter of [...readyWaiters]) {
        clearWaiter(waiter);
        waiter.reject(new Error("GEV bridge has been disposed."));
      }
      onStatus("disposed");
    },
  });
}
