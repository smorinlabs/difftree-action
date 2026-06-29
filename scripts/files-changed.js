"use strict";

// Extract summary.files_changed from `difftree --json` output.
// Returns the integer count, or null when the JSON is missing/invalid/unexpected
// — callers must treat null as "unknown" (NOT zero), so a parse failure never
// masquerades as an empty diff.

function countFromJson(text) {
  try {
    const n = (JSON.parse(text).summary || {}).files_changed;
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}

module.exports = { countFromJson };

// CLI: read stdin, print the count, or an empty string when unknown.
if (require.main === module) {
  let buf = "";
  process.stdin.on("data", (d) => (buf += d));
  process.stdin.on("end", () => {
    const n = countFromJson(buf);
    process.stdout.write(n === null ? "" : String(n));
  });
}
