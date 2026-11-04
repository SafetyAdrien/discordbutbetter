#!/usr/bin/env node
// Garde-fou temps reel : echoue si le client ecoute une table (`postgres_changes`) qui n'est dans aucune
// publication `supabase_realtime` des migrations (l'abonnement ne recevrait alors jamais rien, sans erreur).
// Avertit (sans echouer) si une table ecoutee en UPDATE / DELETE n'a pas REPLICA IDENTITY FULL : les evenements
// n'ont alors que la cle primaire.
//
// Limite : lit les migrations, pas la base. Pour la base reelle :
//   select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
//
// Usage : node scripts/check-realtime.mjs   (aussi lance par `npm run verify`)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = join(root, 'supabase', 'migrations');

const strip = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
const ident = (s) => s.replace(/"/g, '').replace(/^public\./, '').trim();

/* ---- Migrations : tables publiees et REPLICA IDENTITY FULL ---- */
const published = new Set();
const full = new Set();
let allTables = false;

for (const file of readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = strip(readFileSync(join(migrations, file), 'utf8'));
  if (/PUBLICATION\s+supabase_realtime\s+FOR\s+ALL\s+TABLES/i.test(sql)) allTables = true;
  for (const m of sql.matchAll(/PUBLICATION\s+supabase_realtime\s+ADD\s+TABLE\s+(?:ONLY\s+)?([^;]+?)(?:;|\s+EXCEPTION|\s+END)/gi)) {
    for (const t of m[1].split(',')) if (/^[\w."]+$/.test(t.trim())) published.add(ident(t));
  }
  for (const m of sql.matchAll(/PUBLICATION\s+supabase_realtime\s+DROP\s+TABLE\s+(?:ONLY\s+)?([\w."]+)/gi)) published.delete(ident(m[1]));
  for (const m of sql.matchAll(/ALTER\s+TABLE\s+(?:ONLY\s+)?([\w."]+)\s+REPLICA\s+IDENTITY\s+FULL/gi)) full.add(ident(m[1]));
  // Blocs DO ... FOREACH sur un tableau de noms : on lit le tableau quand le bloc touche la publication / l'identite.
  if (/FOREACH\s+\w+\s+IN\s+ARRAY/i.test(sql)) {
    for (const arr of sql.matchAll(/ARRAY\s*\[([^\]]*)\]/gi)) {
      const names = [...arr[1].matchAll(/'([a-z_0-9]+)'/gi)].map((x) => x[1]);
      if (/ADD\s+TABLE/i.test(sql)) names.forEach((n) => published.add(n));
      if (/REPLICA\s+IDENTITY\s+FULL/i.test(sql)) names.forEach((n) => full.add(n));
    }
  }
}

/* ---- Client : tables ecoutees ---- */
const listened = new Map(); // table -> Set(evenements)
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/event:\s*['"](\*|INSERT|UPDATE|DELETE)['"][^}]*?table:\s*['"]([a-z_0-9]+)['"]/g)) {
    if (!listened.has(m[2])) listened.set(m[2], new Set());
    listened.get(m[2]).add(m[1]);
  }
  for (const m of src.matchAll(/table:\s*['"]([a-z_0-9]+)['"]/g)) if (!listened.has(m[1])) listened.set(m[1], new Set());
}

// Ecoutees mais volontairement non publiees (la raison doit rester ici).
const INTENTIONAL = new Set(['webhooks']); // retiree de la publication : les jetons de webhook ne doivent pas etre diffuses
const missing = [...listened.keys()].filter((t) => !allTables && !published.has(t) && !INTENTIONAL.has(t)).sort();
const noFull = [...listened.entries()]
  .filter(([t, ev]) => published.has(t) && !full.has(t) && ([...ev].includes('*') || ev.has('DELETE')))
  .map(([t]) => t)
  .sort();

if (noFull.length) console.warn(`Avertissement : ecoutees en UPDATE / DELETE sans REPLICA IDENTITY FULL (evenements partiels) :\n  ${noFull.join(', ')}\n`);

if (missing.length) {
  console.error('\nTables ecoutees par le client mais absentes de la publication supabase_realtime :\n');
  for (const t of missing) console.error(`  - ${t}`);
  console.error('\nAjoute-les dans une migration : ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>;\n');
  process.exit(1);
}
console.log(`Temps reel : ${listened.size} table(s) ecoutee(s), toutes dans la publication des migrations.`);
