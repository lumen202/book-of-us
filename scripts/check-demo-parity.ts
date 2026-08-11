/**
 * Guards the invariant behind the demo account: every `public.*` table has a
 * `demo.*` twin with RLS enabled. Nothing enforces that structurally — a
 * migration can add a public table and simply forget the mirror — and the
 * failure mode is silent: "the demo is missing a feature", discovered long
 * after the migration that caused it. See
 * `docs/agent/codebase-map/data-model.md` for why the two schemas exist.
 *
 * Parses `supabase/migrations/*.sql` for `create table` and
 * `enable row level security` statements rather than reading a live database,
 * so it runs in CI with no Supabase connection. Run with
 * `npx tsx scripts/check-demo-parity.ts`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "supabase", "migrations");

const CREATE_TABLE = /create table(?: if not exists)?\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi;
const ENABLE_RLS = /alter table\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+enable row level security/gi;

function collect(pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    for (const match of sql.matchAll(pattern)) {
      names.add(match[1].replace(/"/g, "").toLowerCase());
    }
  }
  return names;
}

function unqualified(name: string): string {
  return name.includes(".") ? name.split(".")[1] : name;
}

const tables = collect(CREATE_TABLE);
const rlsEnabled = collect(ENABLE_RLS);

const publicTables = [...tables].filter((t) => !t.startsWith("demo."));
const demoTables = new Set([...tables].filter((t) => t.startsWith("demo.")).map(unqualified));

const errors: string[] = [];

for (const table of publicTables) {
  if (!rlsEnabled.has(table)) {
    errors.push(`public.${table} has no "enable row level security" statement`);
  }
  if (!demoTables.has(table)) {
    errors.push(`public.${table} has no demo.${table} counterpart`);
  } else if (!rlsEnabled.has(`demo.${table}`)) {
    errors.push(`demo.${table} has no "enable row level security" statement`);
  }
}

if (errors.length > 0) {
  console.error(`Demo-schema parity check failed (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Demo-schema parity OK — ${publicTables.length} public tables, all mirrored with RLS.`);
