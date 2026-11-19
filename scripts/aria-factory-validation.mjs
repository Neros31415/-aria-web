export function validateAllowedPaths(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 10) {
    throw new Error("provide 1–10 allowed file paths or directory prefixes.");
  }
  for (const raw of paths) {
    const path = typeof raw === "string" ? raw : "";
    const value = path.endsWith("/") ? path.slice(0, -1) : path;
    if (!value || value.startsWith("/") || value.includes("\\") ||
        value.split("/").some((part) => !part || part === "." || part === "..") ||
        !/^[A-Za-z0-9._/-]+$/.test(value) ||
        value.split("/").some((part) => part === ".git") ||
        value === ".github/workflows" || value.startsWith(".github/workflows/") ||
        /(^|\/)\.env($|\.)/i.test(value)) {
      throw new Error("allowed paths must be canonical repository-relative paths; workflow, git and environment paths are forbidden.");
    }
  }
}

export function validateAndGetChangedPaths(patch, allowedPaths) {
  if (typeof patch !== "string" || patch.length === 0 || patch.length > 200_000) {
    throw new Error("patch must contain 1–200000 characters.");
  }
  const sections = patch.split(/^diff --git /m).slice(1);
  if (sections.length === 0) throw new Error("patch did not contain a git diff section.");
  const changedPaths = [];
  const isAllowedPath = (path) =>
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.split("/").some((part) => part === "" || part === "." || part === "..") &&
    !path.split("/").some((part) => part === ".git") &&
    !path.startsWith(".github/workflows/") &&
    path !== ".github/workflows" &&
    !/(^|\/)\.env($|\.)/i.test(path) &&
    /^[A-Za-z0-9._/-]+$/.test(path) &&
    allowedPaths.some((allowed) => allowed.endsWith("/") ? path.startsWith(allowed) : path === allowed);

  for (const section of sections) {
    const lines = section.split(/\r?\n/);
    const headerMatch = (lines[0] ?? "").match(/^a\/([A-Za-z0-9._/-]+) b\/([A-Za-z0-9._/-]+)$/);
    if (!headerMatch || headerMatch[1] !== headerMatch[2]) {
      throw new Error("patch contains a malformed, renamed, or redirected diff header.");
    }
    const firstHunk = lines.findIndex((line) => line.startsWith("@@"));
    const fileHeaderLines = firstHunk < 0 ? lines : lines.slice(0, firstHunk);
    const oldHeaders = fileHeaderLines.filter((line) => line.startsWith("--- "));
    const newHeaders = fileHeaderLines.filter((line) => line.startsWith("+++ "));
    if (oldHeaders.length !== 1 || newHeaders.length !== 1) {
      throw new Error("each patch section must contain exactly one old and one new file header.");
    }
    const oldMatch = oldHeaders[0].match(/^--- (?:a\/([A-Za-z0-9._/-]+)|\/dev\/null)$/);
    const newMatch = newHeaders[0].match(/^\+\+\+ (?:b\/([A-Za-z0-9._/-]+)|\/dev\/null)$/);
    if (!oldMatch || !newMatch) throw new Error("patch contains an unsupported or malformed file path header.");
    const oldPath = oldMatch[1] ?? null;
    const newPath = newMatch[1] ?? null;
    const declaredPath = headerMatch[1];
    if ((oldPath && oldPath !== declaredPath) || (newPath && newPath !== declaredPath)) {
      throw new Error("patch file headers do not match the validated diff path.");
    }
    if (!newPath && !oldPath) throw new Error("patch section does not identify a file.");
    const effectivePath = newPath ?? oldPath;
    if (!isAllowedPath(effectivePath)) throw new Error("patch attempted to modify a forbidden path: " + effectivePath);
    if (lines.some((line) =>
      /^(?:new file mode|deleted file mode|old mode|new mode) (?!100644$|100755$)/.test(line) ||
      /^GIT binary patch$/.test(line) ||
      /^rename (?:from|to) /.test(line) ||
      /^copy (?:from|to) /.test(line)
    )) throw new Error("patch contains a binary, symlink, unsupported mode change, rename, or copy operation.");
    changedPaths.push(effectivePath);
  }
  return [...new Set(changedPaths)];
}

export async function readLimitedResponseText(response, maxBytes = 1_048_576) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("provider response exceeded the configured size limit.");
  }
  if (!response.body?.getReader) throw new Error("provider response body is unavailable.");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("provider response exceeded the configured size limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
