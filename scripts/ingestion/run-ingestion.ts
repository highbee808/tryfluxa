#!/usr/bin/env node
/**
 * Manual trigger for ingestion runner.
 *
 * Usage:
 *   tsx scripts/ingestion/run-ingestion.ts mediastack
 *   tsx scripts/ingestion/run-ingestion.ts tmdb --force
 */

import { runIngestion } from "../../src/lib/ingestion/runner";

function parseArgs(): { sourceKey: string; force: boolean } {
  const [, , sourceKey, ...rest] = process.argv;
  if (!sourceKey) {
    console.error("Usage: tsx scripts/ingestion/run-ingestion.ts <sourceKey> [--force]");
    process.exit(1);
  }
  const force = rest.includes("--force");
  return { sourceKey, force };
}

async function main() {
  const { sourceKey, force } = parseArgs();

  try {
    const result = await runIngestion(sourceKey, { force });
    console.log("Ingestion result:", result);
    if (!result.success) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Ingestion failed:", error);
    process.exitCode = 1;
  }
}

main();
