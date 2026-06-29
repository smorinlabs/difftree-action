"use strict";

// Read `difftree --json` from stdin and print summary.files_changed (or 0).
// Used by action.yml to get a reliable change count without parsing the
// human-readable summary line.

let buf = "";
process.stdin.on("data", (d) => (buf += d));
process.stdin.on("end", () => {
  let n = 0;
  try {
    const parsed = JSON.parse(buf);
    n = (parsed.summary || {}).files_changed ?? 0;
  } catch {
    n = 0;
  }
  process.stdout.write(String(n));
});
