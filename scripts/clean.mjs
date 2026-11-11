// HERMES — clean the monorepo for a fresh reinstall + rebuild.
//
// Removes every dependency tree (node_modules) plus Turbo/Next build artifacts
// and caches (.turbo, .next, dist, build) so `npm ci && npm run build` starts
// from a completely clean slate. All removed directories are git-ignored.
//
// A Node script is used (instead of a shell glob like `**/node_modules`)
// because npm runs scripts with /bin/sh, which does not expand `**`.

import { rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root is the parent of this script's directory.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Directories to remove for a clean rebuild.
const REMOVE = new Set(['node_modules', '.turbo', '.next', 'dist', 'build']);

// Directories to skip while walking (never removal targets).
const SKIP = new Set(['.git']);

function prune(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;
    if (SKIP.has(name)) continue;

    const full = join(dir, name);
    if (REMOVE.has(name)) {
      console.log(`rm -rf ${full}`);
      try {
        rmSync(full, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to remove ${full}: ${err.message}`);
      }
    } else {
      prune(full);
    }
  }
}

prune(root);
console.log('Clean complete.');
