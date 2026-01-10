#!/usr/bin/env node
"use strict";

/**
 * Validate upstream doc links in N.E.K.O.-RN.
 *
 * Purpose:
 * - We use "方案 A": RN docs only link to upstream @N.E.K.O/docs/frontend/* (no copy).
 * - This script checks that those link targets exist on disk in the current workspace.
 *
 * Notes:
 * - No network is used.
 * - Works best when both repos are present as siblings (as used by sync-neko-packages.js).
 */

const fs = require("fs");
const path = require("path");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function collectMarkdownLinks(markdown) {
  // Very small parser: extract [text](target), ignore image ![](...) and ignore http(s) and mailto.
  const out = [];
  const re = /(?<!\!)\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown))) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    const target = raw.split(/\s+/)[0]; // strip optional title
    out.push(target);
  }
  return out;
}

function isSkippableTarget(t) {
  const s = String(t);
  if (s.startsWith("#")) return true;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  if (s.startsWith("mailto:")) return true;
  return false;
}

function main() {
  const rnRoot = path.resolve(__dirname, "..");
  const entry = path.join(rnRoot, "docs", "upstream-frontend-packages.md");

  if (!fileExists(entry)) {
    console.error(`[check-upstream-docs] missing entry doc: ${entry}`);
    process.exit(1);
  }

  const md = readText(entry);
  const links = collectMarkdownLinks(md).filter((t) => !isSkippableTarget(t));

  if (links.length === 0) {
    console.log("[check-upstream-docs] no links found, nothing to check.");
    process.exit(0);
  }

  const baseDir = path.dirname(entry);
  const missing = [];

  for (const t of links) {
    // Strip fragment: foo/bar.md#section -> foo/bar.md
    const withoutHash = t.split("#")[0];
    if (!withoutHash) continue;

    const resolved = path.resolve(baseDir, withoutHash);
    if (!fileExists(resolved)) {
      missing.push({ target: t, resolved });
    }
  }

  if (missing.length > 0) {
    console.error(`[check-upstream-docs] missing link targets: ${missing.length}`);
    for (const item of missing) {
      console.error(`- ${item.target}`);
      console.error(`  -> ${item.resolved}`);
    }
    console.error(
      "\n[check-upstream-docs] Hint: This check expects the upstream repo (@N.E.K.O) to exist in the same workspace."
    );
    process.exit(1);
  }

  console.log(`[check-upstream-docs] OK (${links.length} links)`);
}

main();

