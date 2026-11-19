import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAllowedPaths,
  validateAndGetChangedPaths,
  readLimitedResponseText,
} from "../scripts/aria-factory-validation.mjs";

const validPatch = (path = "docs/notes.md") =>
  "diff --git a/" + path + " b/" + path + "\n" +
  "index 1111111..2222222 100644\n" +
  "--- a/" + path + "\n" +
  "+++ b/" + path + "\n" +
  "@@ -1 +1 @@\n-old\n+new\n";

test("accepts canonical allow-list entries and an in-scope patch", () => {
  validateAllowedPaths(["docs/"]);
  assert.deepEqual(validateAndGetChangedPaths(validPatch(), ["docs/"]), ["docs/notes.md"]);
});

test("rejects traversal, backslashes, dot segments and protected allow-list paths", () => {
  for (const path of ["../secrets/", "docs/../", "docs//", "docs/./", "docs\\private", ".git/config", ".github/workflows/"]) {
    assert.throws(() => validateAllowedPaths([path]));
  }
});

test("rejects a patch whose real target differs from its diff header", () => {
  const patch = validPatch().replace("+++ b/docs/notes.md", "+++ b/.github/workflows/ci.yml");
  assert.throws(() => validateAndGetChangedPaths(patch, ["docs/"]), /do not match/);
});

test("rejects paths outside scope, renames, binary patches and symlinks", () => {
  assert.throws(() => validateAndGetChangedPaths(validPatch("app.js"), ["docs/"]), /forbidden path/);
  assert.throws(() => validateAndGetChangedPaths(validPatch().replace("a/docs/notes.md b/docs/notes.md", "a/docs/old.md b/docs/notes.md"), ["docs/"]), /renamed/);
  assert.throws(() => validateAndGetChangedPaths(validPatch().replace("@@ -1 +1 @@", "GIT binary patch\n@@ -1 +1 @@"), ["docs/"]), /binary/);
  assert.throws(() => validateAndGetChangedPaths(validPatch().replace("index 1111111..2222222 100644", "new file mode 120000"), ["docs/"]), /symlink/);
  assert.throws(() => validateAndGetChangedPaths(validPatch().replace("index 1111111..2222222 100644", "old mode 100644\\nnew mode 100755"), ["docs/"]), /mode change/);
});

test("bounds provider response size while streaming", async () => {
  const response = new Response("123456789", { headers: { "content-type": "application/json" } });
  await assert.rejects(readLimitedResponseText(response, 4), /size limit/);
  const small = new Response('{"ok":true}');
  assert.equal(await readLimitedResponseText(small, 32), '{"ok":true}');
});
