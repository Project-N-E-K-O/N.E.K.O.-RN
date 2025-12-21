#!/usr/bin/env node
"use strict";

/**
 * Sync N.E.K.O frontend workspace packages into N.E.K.O.-RN workspace packages.
 *
 * Default mapping:
 * - N.E.K.O/frontend/packages/common    -> N.E.K.O.-RN/packages/project-neko-common
 * - N.E.K.O/frontend/packages/components-> N.E.K.O.-RN/packages/project-neko-components
 * - N.E.K.O/frontend/packages/request   -> N.E.K.O.-RN/packages/project-neko-request
 * - N.E.K.O/frontend/packages/realtime  -> N.E.K.O.-RN/packages/project-neko-realtime (created if missing)
 *
 * Safety:
 * - Excludes noisy folders (node_modules, dist, coverage, .vite, .turbo)
 * - By default cleans the destination package folder before copying (mirror behavior)
 * - Post-processes vite.config.ts to fix outDir from "../../../static/bundles" to "../../static/bundles" for RN repo
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = {
    source: null,
    dest: null,
    packages: null,
    dryRun: false,
    clean: true,
    postprocess: true,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source" || a === "-s") {
      out.source = argv[++i];
    } else if (a === "--dest" || a === "-d") {
      out.dest = argv[++i];
    } else if (a === "--packages" || a === "-p") {
      out.packages = argv[++i];
    } else if (a === "--dry-run" || a === "--dry") {
      out.dryRun = true;
    } else if (a === "--no-clean") {
      out.clean = false;
    } else if (a === "--no-postprocess") {
      out.postprocess = false;
    } else if (a === "--verbose" || a === "-v") {
      out.verbose = true;
    } else if (a === "--help" || a === "-h") {
      printHelpAndExit(0);
    } else {
      console.error(`[sync-neko-packages] Unknown arg: ${a}`);
      printHelpAndExit(1);
    }
  }
  return out;
}

function printHelpAndExit(code) {
  const msg = `
Usage:
  node scripts/sync-neko-packages.js [options]

Options:
  -s, --source <path>       Source packages dir (default: ../N.E.K.O/frontend/packages)
  -d, --dest <path>         Dest packages dir (default: ./packages)
  -p, --packages <list>     Comma list: common,components,request,realtime (default: all)
      --dry-run             Print actions, do not write
      --no-clean            Do not delete destination package folder before copy
      --no-postprocess      Skip vite.config.ts outDir fixups
  -v, --verbose             Verbose logging
  -h, --help                Show help

Examples:
  node scripts/sync-neko-packages.js
  node scripts/sync-neko-packages.js --packages common,request
  node scripts/sync-neko-packages.js --dry-run --verbose
  node scripts/sync-neko-packages.js --source /abs/path/to/N.E.K.O/frontend/packages
`.trim();
  console.log(msg);
  process.exit(code);
}

function ensureDirSync(dir, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dir, { recursive: true });
}

function rmDirSync(dir, dryRun) {
  if (dryRun) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDirSync(srcDir, destDir, dryRun, verbose) {
  const ignoreNames = new Set(["node_modules", "dist", "coverage", ".vite", ".turbo", ".DS_Store"]);

  const filter = (srcPath) => {
    const rel = path.relative(srcDir, srcPath);
    if (!rel) return true;
    const parts = rel.split(path.sep);
    for (const p of parts) {
      if (!p) continue;
      if (ignoreNames.has(p)) return false;
    }
    return true;
  };

  if (dryRun) {
    console.log(`[sync-neko-packages] (dry-run) copy ${srcDir} -> ${destDir}`);
    return;
  }

  fs.cpSync(srcDir, destDir, {
    recursive: true,
    force: true,
    filter,
  });

  if (verbose) console.log(`[sync-neko-packages] copied ${srcDir} -> ${destDir}`);
}

function patchFileIfExists(filePath, replacer, dryRun, verbose) {
  if (!fs.existsSync(filePath)) return false;
  const before = fs.readFileSync(filePath, "utf8");
  const after = replacer(before);
  if (after === before) return false;
  if (dryRun) {
    console.log(`[sync-neko-packages] (dry-run) patch ${filePath}`);
    return true;
  }
  fs.writeFileSync(filePath, after, "utf8");
  if (verbose) console.log(`[sync-neko-packages] patched ${filePath}`);
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const rnRoot = path.resolve(__dirname, "..");
  const defaultSource = path.resolve(rnRoot, "..", "N.E.K.O", "frontend", "packages");
  const defaultDest = path.resolve(rnRoot, "packages");

  const sourceBase = path.resolve(args.source || defaultSource);
  const destBase = path.resolve(args.dest || defaultDest);

  const mapping = {
    common: { src: "common", dest: "project-neko-common" },
    components: { src: "components", dest: "project-neko-components" },
    request: { src: "request", dest: "project-neko-request" },
    realtime: { src: "realtime", dest: "project-neko-realtime" },
  };

  const selected = (args.packages
    ? args.packages.split(",").map((s) => s.trim()).filter(Boolean)
    : Object.keys(mapping)
  ).filter(Boolean);

  for (const p of selected) {
    if (!mapping[p]) {
      console.error(`[sync-neko-packages] Unknown package key: ${p}`);
      console.error(`[sync-neko-packages] Allowed: ${Object.keys(mapping).join(", ")}`);
      process.exit(1);
    }
  }

  console.log(`[sync-neko-packages] source: ${sourceBase}`);
  console.log(`[sync-neko-packages] dest:   ${destBase}`);
  console.log(`[sync-neko-packages] packages: ${selected.join(", ")}`);
  if (args.dryRun) console.log(`[sync-neko-packages] mode: dry-run`);

  if (!fs.existsSync(sourceBase)) {
    console.error(`[sync-neko-packages] Source not found: ${sourceBase}`);
    process.exit(1);
  }

  ensureDirSync(destBase, args.dryRun);

  for (const key of selected) {
    const srcDir = path.join(sourceBase, mapping[key].src);
    const destDir = path.join(destBase, mapping[key].dest);

    if (!fs.existsSync(srcDir)) {
      console.error(`[sync-neko-packages] Missing source package dir: ${srcDir}`);
      process.exit(1);
    }

    if (args.clean) {
      if (args.verbose) console.log(`[sync-neko-packages] clean ${destDir}`);
      rmDirSync(destDir, args.dryRun);
    } else {
      ensureDirSync(destDir, args.dryRun);
    }

    copyDirSync(srcDir, destDir, args.dryRun, args.verbose);

    if (args.postprocess) {
      // RN repo layout differs by one ".." compared to N.E.K.O repo.
      const viteConfig = path.join(destDir, "vite.config.ts");
      patchFileIfExists(
        viteConfig,
        (content) =>
          content
            .replace(/path\.resolve\(__dirname,\s*"(\.\.\/){3}static\/bundles"\)/g, 'path.resolve(__dirname, "../../static/bundles")')
            .replace(/path\.resolve\(__dirname,\s*"\.\.\/\.\.\/\.\.\/static\/bundles"\)/g, 'path.resolve(__dirname, "../../static/bundles")'),
        args.dryRun,
        args.verbose
      );
    }
  }

  console.log(`[sync-neko-packages] done`);
}

main();


