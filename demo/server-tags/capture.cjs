/* Captures reelles des Tags de serveur (harnais /design, donnees de cache pre-chargees : pas de backend).
   Usage : npm run dev (port 8080) puis node demo/server-tags/capture.cjs */
const path = require('path');
const { chromium } = require('playwright');
const OUT = __dirname;
const BASE = process.env.BASE || 'http://localhost:8080';
const shot = (p, name, opts = {}) => p.screenshot({ path: path.join(OUT, name), ...opts });
(async () => {
  const br = await chromium.launch();
  const log = [];
  const ok = (name, cond) => { log.push(`${cond ? 'OK ' : 'KO '} ${name}`); };

  // A + galerie : configuration administrateur
  let p = await br.newPage({ viewport: { width: 1600, height: 1000 } });
  p.on('pageerror', (e) => log.push('ERR ' + e.message));
  await p.goto(`${BASE}/design?view=settings&tab=tag&tagcfg=none`); await p.waitForSelector('#server-tag-name', { timeout: 20000 });
  await p.fill('#server-tag-name', 'spce!<b>'); // caracteres interdits filtres, 4 max
  ok('A nom filtre (4 max, lettres/chiffres)', (await p.inputValue('#server-tag-name')) === 'spce');
  await p.fill('#server-tag-name', 'SPCE');
  await p.click('button[aria-label="Planète"]');
  await p.click('button[aria-label="Couleur personnalisée"]'); await p.waitForTimeout(400);
  const hex = p.locator('[data-radix-popper-content-wrapper] input').first();
  await hex.fill('#2880FB'); await hex.press('Enter'); await p.waitForTimeout(300);
  ok('A couleur #2880FB appliquee', (await p.locator('text=#2880FB').count()) > 0);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await shot(p, '01-config-admin.png');
  await p.locator('[role=radiogroup]').scrollIntoViewIfNeeded();
  await shot(p, '02-galerie-badges.png');
  await p.fill('#server-tag-name', 'S');
  await p.waitForTimeout(200);
  ok('A erreur nom trop court affichee', await p.getByText('au moins 2').isVisible());
  await p.close();

  // B : menu "Tag du serveur" dans l'editeur de profil (brouillon applique avec Enregistrer)
  p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', (e) => log.push('ERR ' + e.message));
  await p.goto(`${BASE}/design?view=profileeditor`); await p.waitForSelector('button[aria-label="Tag du serveur"]', { timeout: 25000 });
  await shot(p, '03a-editeur-sans-tag.png');
  await p.click('button[aria-label="Tag du serveur"]'); await p.waitForTimeout(500);
  await shot(p, '03b-editeur-menu-tag.png');
  ok('B 4 serveurs + "Aucun tag" proposes', (await p.locator('[role=option]').count()) === 5);
  await p.click('[role=option]:has-text("RGV Aerial")'); await p.waitForTimeout(500);
  await shot(p, '03c-editeur-tag-choisi.png');
  ok('B barre "N\'oublie pas d\'enregistrer" apparait', await p.getByText("N'oublie pas d'enregistrer").isVisible());
  await p.close();

  // C/D : chat, membres, profil, fiche serveur
  p = await br.newPage({ viewport: { width: 1700, height: 950 } });
  await p.goto(`${BASE}/design?tag=1`); await p.waitForSelector('button[aria-label^="Tag du serveur"]', { timeout: 25000 });
  await p.waitForTimeout(800);
  const n = await p.locator('button[aria-label="Tag du serveur SPCE"]').count();
  ok(`C tags affiches (${n} occurrences chat + membres)`, n >= 2);
  await shot(p, '04-chat-et-membres.png');
  const chatTag = p.locator('main button[aria-label="Tag du serveur SPCE"], [class*="msg"] button[aria-label="Tag du serveur SPCE"]').first();
  await p.locator('button[aria-label="Tag du serveur SPCE"]').first().click(); await p.waitForTimeout(500);
  ok('D fiche serveur ouverte (nom + action)', (await p.locator('[data-radix-popper-content-wrapper] button:has-text("Rejoindre"), [data-radix-popper-content-wrapper] button:has-text("Voir le serveur")').first().isVisible()));
  await shot(p, '05-fiche-serveur-au-clic.png');
  await p.keyboard.press('Escape');
  await p.close();

  // Profil : carte utilisateur ouverte depuis un auteur de message
  p = await br.newPage({ viewport: { width: 1700, height: 950 } });
  await p.goto(`${BASE}/design?tag=1`); await p.waitForSelector('button[aria-label="Tag du serveur SPCE"]', { timeout: 25000 });
  await p.waitForTimeout(500);
  const author = p.locator('button[translate="no"].font-semibold').first();
  await author.click(); await p.waitForTimeout(700);
  await shot(p, '06-profil-avec-tag.png');
  await p.close();

  // F : mobile
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(`${BASE}/design?view=tagpicker`); await p.waitForSelector('text=Tag du serveur', { timeout: 20000 });
  await p.getByText('Modifier', { exact: true }).click(); await p.waitForTimeout(600);
  await shot(p, '07-mobile-selecteur.png');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('F mobile sans debordement horizontal (selecteur)', !overflow);
  await p.goto(`${BASE}/design?view=settings&tab=tag`); await p.waitForSelector('#server-tag-name', { timeout: 20000 }); await p.waitForTimeout(500);
  await shot(p, '08-mobile-config.png');
  await ctx.close();
  await br.close();
  console.log(log.join('\n'));
})();
