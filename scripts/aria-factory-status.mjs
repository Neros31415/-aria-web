const fail = (message) => {
  console.error("ARIA Factory callback skipped: " + message);
  process.exit(1);
};

const status = process.argv[2];
if (!["running", "pr_opened", "failed"].includes(status)) {
  fail("status must be running, pr_opened or failed.");
}

const env = process.env;
const dispatchId = env.ARIA_FACTORY_DISPATCH_ID;
if (!dispatchId) {
  console.log("Manual workflow run: no Nexus dispatch ID; callback not required.");
  process.exit(0);
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dispatchId)) {
  fail("Nexus dispatch ID is invalid.");
}
if (!env.NEXUS_STATUS_URL || !env.NEXUS_CALLBACK_SECRET) {
  fail("NEXUS_STATUS_URL and NEXUS_CALLBACK_SECRET must be configured as repository secrets.");
}

let endpoint;
try {
  const base = new URL(env.NEXUS_STATUS_URL);
  if (base.protocol !== "https:") fail("NEXUS_STATUS_URL must use HTTPS.");
  endpoint = new URL("/v1/factory/tasks/" + dispatchId + "/events", base);
} catch {
  fail("NEXUS_STATUS_URL is not a valid HTTPS URL.");
}

const payload = {
  status,
  github_run_id: String(env.GITHUB_RUN_ID ?? ""),
};
if (status === "pr_opened") {
  const prUrl = env.ARIA_FACTORY_PR_URL ?? "";
  const expectedPrefix = "https://github.com/Neros31415/-aria-web/pull/";
  if (!prUrl.startsWith(expectedPrefix) || !/^https:\/\/github\.com\/Neros31415\/-aria-web\/pull\/\d+$/.test(prUrl)) {
    fail("the pull request URL is missing or does not belong to the ARIA repository.");
  }
  payload.pull_request_url = prUrl;
  payload.summary = (env.ARIA_FACTORY_SUMMARY ?? "").slice(0, 500);
}
if (status === "failed") {
  payload.error_code = "workflow_failed";
  payload.summary = "The GitHub Actions task did not complete successfully.";
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: "Bearer " + env.NEXUS_CALLBACK_SECRET,
    "content-type": "application/json",
  },
  body: JSON.stringify(payload),
  redirect: "error",
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok) {
  fail("Nexus returned HTTP " + response.status + ".");
}
console.log("Nexus execution status recorded: " + status + ".");
