import { initialize } from './dist/index.js';
import { pruneOldEntries } from './dist/cache.js';

const CACHE_DIR = '.opencode/state/ast-cache';
const PRUNE_AFTER_DAYS = 7;

async function main() {
  const pruned = pruneOldEntries(CACHE_DIR, PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  if (pruned > 0) {
    console.log(`Pruned ${pruned} old cache entries.`);
  }

  await initialize();
  console.log('AST parser initialized successfully.');
}

main().catch(err => {
  console.error('AST parser init failed:', err.message);
  process.exit(1);
});
