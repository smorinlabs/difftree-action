#!/usr/bin/env node
"use strict";

// CLI wrapper over comment.js's composeBody for the difftree-pr-body skill:
// renders a plain difftree tree (stdin) into the same foldable, colored
// markdown the sticky PR comment carries — minus the leading ownership
// marker, which belongs to the comment upsert path, not a PR body.
//
//   difftree --pr=origin/main --committed --no-color \
//     | node scripts/render-body.js [--color-section=open|closed|hidden]
//                                   [--plain-section=open|closed|hidden]
//                                   [--no-advertise] [--heading=<text>]
//
// Body goes to stdout; renderer warnings (e.g. a colored-rendering decline)
// go to stderr. Exits non-zero only on unusable arguments.

const { composeBody, MARKER } = require("./comment.js");

function parseArgs(argv) {
  const opts = { advertise: true };
  const states = new Set(["open", "closed", "hidden"]);
  for (const arg of argv) {
    let m;
    if ((m = arg.match(/^--color-section=(.+)$/))) {
      if (!states.has(m[1])) return { error: `invalid --color-section: ${m[1]}` };
      opts.colorSection = m[1];
    } else if ((m = arg.match(/^--plain-section=(.+)$/))) {
      if (!states.has(m[1])) return { error: `invalid --plain-section: ${m[1]}` };
      opts.plainSection = m[1];
    } else if ((m = arg.match(/^--heading=(.+)$/))) {
      opts.heading = m[1];
    } else if (arg === "--no-advertise") {
      opts.advertise = false;
    } else {
      return { error: `unknown argument: ${arg}` };
    }
  }
  return { opts };
}

function render(tree, opts) {
  const { body, warnings } = composeBody(tree, { ...opts, empty: !tree.trim() });
  // The marker marks comment ownership; a body section has its own markers.
  const lines = body.split("\n");
  if (lines[0] === MARKER) lines.shift();
  while (lines[0] === "") lines.shift();
  return { body: lines.join("\n"), warnings };
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    process.stderr.write(`render-body: ${parsed.error}\n`);
    process.exit(2);
  }
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("end", () => {
    const { body, warnings } = render(Buffer.concat(chunks).toString("utf8"), parsed.opts);
    warnings.forEach((w) => process.stderr.write(`render-body: ${w}\n`));
    process.stdout.write(body + "\n");
  });
}

if (require.main === module) main();

module.exports = { parseArgs, render };
