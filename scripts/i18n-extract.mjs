#!/usr/bin/env node
/*
 * Extrait les textes francais de l'interface (src/**) pour le dictionnaire
 * de traduction : textes JSX, chaines litterales d'affichage, et gabarits
 * `...${x}...` (convertis en motifs "{0}").
 *
 *   node scripts/i18n-extract.mjs            -> ecrit src/i18n/source.json
 *   node scripts/i18n-extract.mjs --missing en
 *                                            -> liste les cles absentes de
 *                                               src/i18n/locales/en.json
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'i18n', 'source.json');

const SKIP_DIRS = ['integrations', '__tests__', 'i18n', 'design', 'test'];
const SKIP_FILES = /(\.test\.|\.d\.ts$|DesignHarness|StageHarness|colorNames\.ts$)/;
// Appels / proprietes dont les chaines ne sont jamais affichees.
const NON_UI_CALLS = new Set(['cn', 'clsx', 'cva', 'twMerge', 'require', 'import', 'from', 'eq', 'neq', 'select', 'order', 'channel', 'rpc', 'getItem', 'setItem', 'removeItem', 'querySelector', 'querySelectorAll', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'matchMedia', 'createElement', 'getElementById', 'invalidateQueries', 'setQueryData', 'getQueryData', 'startsWith', 'endsWith', 'includes', 'split', 'replace', 'match', 'test', 'storage', 'upload', 'remove', 'on', 'emit', 'postMessage', 'open', 'Error', 'RegExp']);
const NON_UI_PROPS = new Set(['className', 'class', 'style', 'key', 'id', 'href', 'src', 'type', 'name', 'role', 'variant', 'size', 'side', 'align', 'queryKey', 'to', 'path', 'rel', 'target', 'mode', 'value', 'htmlFor', 'accept', 'autoComplete', 'inputMode', 'data-testid', 'icon', 'color', 'event', 'schema', 'table', 'filter', 'kind', 'status', 'format', 'method', 'contentType', 'cacheControl', 'mimeType', 'lang', 'dir', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'width', 'height', 'preserveAspectRatio', 'xmlns', 'storageKey', 'tab', 'initialTab', 'view', 'layout', 'permission', 'channelType', 'onConflict']);

const FRENCH_HINT = /[àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊÎÔÙÛŒ]|\b(le|la|les|un|une|des|du|de|et|ou|ton|ta|tes|ce|cette|pour|avec|sans|dans|sur|est|sont|pas|plus|aucun|aucune|tous|tout|toute|ici|qui|que|à|au|aux)\b/i;
const LETTER = /\p{L}/u;

const isUiText = (s) => {
  const t = s.trim();
  if (t.length < 2 || t.length > 600 || !LETTER.test(t)) return false;
  // Balisage SVG/HTML, requetes media, expressions regulieres, polices.
  if (/<\/?[a-z][^>]*>|^\((prefers|pointer|hover|display|min|max|horizontal|vertical)-|^\(\[|^"?[\w ]+"?, "|sans-serif$/.test(t)) return false;
  if (/^https?:|^\/|^#[0-9a-f]{3,8}$|^[a-z0-9_.:-]+$|^[A-Z0-9_]+$|^\[?SYSTEM:/.test(t)) return false;
  // Classes utilitaires / selecteurs.
  if (/^[a-z]/.test(t) && /^[\w\-:/[\]().#%&>!*@=,' ]+$/.test(t) && /(^|\s)[a-z]+-[\w[\]./%-]+/.test(t) && !FRENCH_HINT.test(t)) return false;
  if (/^[a-z][\w-]*(\s+[a-z][\w-]*)*$/.test(t) && !FRENCH_HINT.test(t)) return false;
  return /^[\p{Lu}0-9«"'(…•·+-]/u.test(t) || FRENCH_HINT.test(t);
};

function walkDir(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.includes(e.name)) walkDir(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !SKIP_FILES.test(e.name)) out.push(p);
  }
  return out;
}

const keys = new Map(); // texte -> premier fichier
const add = (s, file) => {
  const t = s.replace(/\s+/g, ' ').trim();
  if (isUiText(t) && !keys.has(t)) keys.set(t, path.relative(ROOT, file));
};

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return '';
}

const CONSOLE = new Set(['log', 'warn', 'error', 'debug', 'info', 'trace']);
const isConsoleCall = (e) => ts.isPropertyAccessExpression(e) && CONSOLE.has(e.name.text) && /^(console|logger)$/.test(e.expression.getText());

function isNonUiContext(node) {
  for (let p = node.parent, depth = 0; p && depth < 6; p = p.parent, depth++) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isJsxAttribute(p)) return NON_UI_PROPS.has(p.name.getText());
    if (ts.isPropertyAssignment(p) && p.initializer && depth <= 2) {
      const n = p.name.getText().replace(/['"]/g, '');
      if (NON_UI_PROPS.has(n)) return true;
    }
    if ((ts.isCallExpression(p) || ts.isNewExpression(p)) && depth <= 3) {
      if (NON_UI_CALLS.has(calleeName(p.expression)) || isConsoleCall(p.expression)) return true;
    }
    if (ts.isElementAccessExpression(p) || ts.isCaseClause(p)) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
    if (ts.isTypeNode(p) || ts.isLiteralTypeNode(p)) return true;
  }
  return false;
}

function templatePattern(node) {
  // `Etape ${a} sur ${b}` -> "Etape {0} sur {1}"
  let s = node.head.text;
  node.templateSpans.forEach((span, i) => {
    s += `{${i}}` + span.literal.text;
  });
  return s;
}

for (const file of walkDir(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      add(node.text, file);
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isNonUiContext(node)) {
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) return;
      add(node.text, file);
    } else if (ts.isTemplateExpression(node) && !isNonUiContext(node)) {
      const pat = templatePattern(node);
      if (/\{\d\}/.test(pat) && LETTER.test(pat.replace(/\{\d\}/g, ''))) add(pat, file);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const sorted = [...keys.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
const arg = process.argv.indexOf('--missing');
if (arg !== -1) {
  const lang = process.argv[arg + 1];
  const file = path.join(SRC, 'i18n', 'locales', `${lang}.json`);
  const dict = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const missing = sorted.filter((k) => !(k in dict));
  process.stdout.write(JSON.stringify(missing, null, 1) + '\n');
  process.stderr.write(`${missing.length} / ${sorted.length} manquantes pour ${lang}\n`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${sorted.length} textes -> ${path.relative(ROOT, OUT)}`);
}
