## Test E2E Playwright — captures réelles obligatoires

Aucune modification de code prévue tant que le test n'a pas confirmé un échec à l'exécution. Audit lecture seule déjà effectué au tour précédent : `hasInlineMentions` contient bien `<c:#[0-9a-fA-F]{3,6}>` et la branche `match[5]` de `renderLegacyAndSpecialMentions` produit bien le pill avec `className="rounded-[3px]"`, fond `surface-elevated`, sideShadow + border, "■ + nom".

### Script `/tmp/browser/color-pill/test.py`

Context navigateur configuré pour bypasser tout cache :

```python
context = await browser.new_context(
    viewport={"width": 1280, "height": 1800},
    bypass_csp=True,
    extra_http_headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
    },
)
# Unregister service workers + clear caches après première navigation
await page.goto("http://localhost:8080", wait_until="domcontentloaded")
await page.evaluate("""async () => {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
}""")
# Restaurer la session Supabase via LOVABLE_BROWSER_SUPABASE_* puis hard reload
await page.evaluate("window.localStorage.setItem(KEY, SESSION_JSON)")
await page.reload(wait_until="networkidle")
```

### Étapes (capture à chaque étape)

1. Naviguer vers un salon texte (premier serveur, premier salon texte trouvé via le DOM).
2. Cliquer dans MessageInput textarea, vider, `await page.keyboard.type("<c:#FFFFFF>", delay=20)`.
3. Screenshot **ciblé sur le composer** : `await composer.screenshot(path="/tmp/browser/color-pill/1_raw.png")`.
4. Clear, taper `<`, attendre l'autocomplete, sélectionner "White" (clic ou Enter), screenshot `2_picker.png`.
5. Taper ` ` (espace), retaper `<`, sélectionner "White" à nouveau, screenshot `3_two_pills.png`.

### Restitution

Les 3 images `.png` seront copiées vers `/mnt/documents/color-pill-test/` et présentées via `<presentation-artifact>` une par une dans la réponse finale, pas un simple résumé. Si l'une montre du texte brut au lieu d'un pill, je passe en diagnostic ciblé (filtre amont, ordre des handlers) avant tout fix.

### Touchpoints

- `/tmp/browser/color-pill/test.py` — script jetable.
- `/mnt/documents/color-pill-test/{1_raw,2_picker,3_two_pills}.png` — artefacts livrés.
- Aucun fichier projet modifié sauf si le test échoue.
