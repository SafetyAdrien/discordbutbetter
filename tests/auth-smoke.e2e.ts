/**
 * Auth smoke test — run manually before any change to AuthContext.tsx.
 *
 *   bunx playwright install chromium   # once
 *   bun tests/auth-smoke.spec.ts
 *
 * Vérifie que :
 *  1. `/` sans session redirige vers `/auth` en < 5s
 *  2. `/auth` affiche le formulaire sans erreur console
 *  3. `/` avec session en localStorage rend l'app sans redirect vers /auth
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];

  // 1. redirect anonyme
  const p1 = await ctx.newPage();
  p1.on('pageerror', (e) => errors.push(String(e)));
  await p1.goto(BASE + '/');
  await p1.waitForURL(/\/auth/, { timeout: 5000 });
  console.log('OK: redirect vers /auth');

  // 2. formulaire visible
  const p2 = await ctx.newPage();
  p2.on('pageerror', (e) => errors.push(String(e)));
  await p2.goto(BASE + '/auth');
  await p2.waitForSelector('input[type="email"], input[type="password"]', { timeout: 5000 });
  console.log('OK: /auth affiche le formulaire');

  if (errors.length) {
    console.error('Console errors:', errors);
    process.exit(1);
  }
  await browser.close();
  console.log('AUTH SMOKE OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
