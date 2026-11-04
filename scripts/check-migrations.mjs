#!/usr/bin/env node
// Garde-fou "aucune perte de donnees" pour les migrations Supabase.
//
// Echoue si une migration NON ENCORE POUSSEE contient une instruction qui detruit ou ecrase des donnees :
// DROP TABLE / COLUMN / SCHEMA, TRUNCATE, ALTER COLUMN ... TYPE, DELETE ou UPDATE sans WHERE.
// Une instruction volontaire doit etre precedee d'un commentaire `-- allow-destructive: <raison>` (et la
// raison doit expliquer ou vont les donnees : sauvegarde, copie, table vide...).
//
// Usage : node scripts/check-migrations.mjs   (aussi lance par `npm run verify`)
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Migrations <= a cette version sont deja poussees : on ne les relit pas. A relever apres chaque push.
const PUSHED_UP_TO = '20261103100000';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

const RULES = [
  { re: /\bDROP\s+TABLE\b/i, why: 'DROP TABLE supprime la table et toutes ses lignes' },
  { re: /\bDROP\s+SCHEMA\b/i, why: 'DROP SCHEMA supprime tout le schema' },
  { re: /\bDROP\s+COLUMN\b/i, why: 'DROP COLUMN supprime les valeurs de la colonne' },
  { re: /\bTRUNCATE\b/i, why: 'TRUNCATE vide la table' },
  { re: /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i, why: 'changer le type d’une colonne peut tronquer ou perdre des valeurs' },
  { re: /\bDELETE\s+FROM\b(?![^;]*\bWHERE\b)/i, why: 'DELETE sans WHERE vide la table' },
  { re: /\bUPDATE\s+[\w."]+\s+SET\b(?![^;]*\bWHERE\b)/i, why: 'UPDATE sans WHERE ecrase toutes les lignes' },
];

const strip = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

const problems = [];
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let checked = 0;
for (const file of files) {
  const version = file.split('_')[0];
  if (version <= PUSHED_UP_TO) continue;
  checked += 1;
  const raw = readFileSync(join(dir, file), 'utf8');
  // Une "instruction" = texte jusqu'au prochain ';' (les commentaires qui la precedent en font partie).
  for (const piece of raw.split(';')) {
    if (/allow-destructive:/i.test(piece)) continue;
    const text = strip(piece);
    for (const rule of RULES) {
      const m = rule.re.exec(text);
      if (m) problems.push({ file, snippet: text.trim().replace(/\s+/g, ' ').slice(0, 110), why: rule.why });
    }
  }
}

if (problems.length) {
  console.error('\nMigrations dangereuses pour les donnees :\n');
  for (const p of problems) console.error(`  ${p.file}\n    ${p.snippet}\n    -> ${p.why}\n`);
  console.error('Si c’est voulu, ajoute juste avant l’instruction : -- allow-destructive: <ou vont les donnees>\n');
  process.exit(1);
}
console.log(`Migrations : ${checked} non poussee(s) verifiee(s), aucune instruction destructrice.`);
