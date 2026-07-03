## Objectif

Remplacer les images générées IA par de **vraies captures de l'app** (thème sombre uniquement — le thème clair n'existe pas encore), présentées en **mise en scène 3 layers empilés** (fenêtre principale au fond + 2 fenêtres flottantes rotées devant), et remplacer le fondu au noir par un **fondu enchaîné** (crossfade).

## Étape 1 — Capturer les vraies vues via Playwright

Restaurer la session Supabase injectée (`LOVABLE_BROWSER_SUPABASE_*`) puis naviguer dans `http://localhost:8080` pour capturer, sous viewport 1280×1800 :

**Moment 1 — Vue principale**
- Fenêtre large : screenshot du layout principal (ChannelList + zone chat).
- Vignette flottante 1 : element screenshot de la liste de salons (`aside` / colonne channels).
- Vignette flottante 2 : element screenshot d'un popover (ex. menu utilisateur en bas de la ChannelList, ou un context menu ouvert).

**Moment 2 — Paramètres Apparence**
- Fenêtre large : screenshot du modal Paramètres > Apparence (juste au-dessous de la bannière, ou en scrollant à la section Thème).
- Vignette flottante 1 : element screenshot des deux tuiles « Sombre / Clair ».
- Vignette flottante 2 : element screenshot d'un des boutons de casse (AG/ag/Ag/Aa).

**Moment 3 — Paramètres Typographie**
- Fenêtre large : screenshot de la section « Typographie des catégories » (avec la grille + preview).
- Vignette flottante 1 : element screenshot du live preview « ChannelList » à droite.
- Vignette flottante 2 : element screenshot d'une ligne de zone (Switch + boutons AG/ag/Ag/Aa).

Total : 9 PNG capturés dans `/tmp/browser/appearance-banner/`. Nettoyer les curseurs / hover states avant capture (`await page.mouse.move(0, 0)`).

Les 9 fichiers sont ensuite copiés dans `src/assets/appearance-banner/` :
- `m1-back.png`, `m1-front-a.png`, `m1-front-b.png`
- `m2-back.png`, `m2-front-a.png`, `m2-front-b.png`
- `m3-back.png`, `m3-front-a.png`, `m3-front-b.png`

Les 3 anciennes images IA (`appearance-banner-dark.jpg` / `-light.jpg` / `-typography.jpg`) sont supprimées.

## Étape 2 — Refactor du composant `AppearancePreviewBanner`

Réécrire `src/components/appearance/AppearancePreviewBanner.tsx` :

- Le container garde `h-[260px] rounded-2xl overflow-hidden relative border border-border/50`.
- **Fond** : dégradé sombre (`bg-gradient-to-br from-[hsl(var(--surface-2))] via-[hsl(var(--background))] to-black`) au lieu de `bg-black`.
- 3 slides absolument positionnés (`inset-0`), un par moment. Chaque slide contient les 3 layers de mise en scène :

```
<div className="absolute inset-0 flex items-center justify-center">
  {/* Back window : large mockup shell */}
  <div className="relative w-[70%] aspect-[16/10] rounded-xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] border border-white/10">
    <img src={backSrc} className="w-full h-full object-cover" />
  </div>
  {/* Front A : right-side floating window, rotated */}
  <div className="absolute right-[10%] top-[25%] w-[38%] aspect-[4/3] rounded-lg overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] border border-white/10"
       style={{ transform: 'rotate(-4deg)' }}>
    <img src={frontASrc} className="w-full h-full object-cover" />
  </div>
  {/* Front B : bottom-right popover, smaller, rotated the other way */}
  <div className="absolute right-[6%] bottom-[8%] w-[22%] aspect-square rounded-lg overflow-hidden shadow-[0_15px_30px_-8px_rgba(0,0,0,0.8)] border border-white/10"
       style={{ transform: 'rotate(3deg)' }}>
    <img src={frontBSrc} className="w-full h-full object-cover" />
  </div>
</div>
```

- **Crossfade (fondu enchaîné)** : chaque slide a `opacity-100` si actif, `opacity-0` sinon, `transition-opacity duration-700`. On supprime le state `isFading` et l'overlay noir : les deux slides se chevauchent naturellement pendant la transition, plus de passage par le noir.
- L'auto-play `setInterval(8000)` reste identique. Suppression de la constante `FADE_MS` du timing (on garde la variable pour la durée de transition CSS).
- `useReducedMotion` respecté (aucun défilement si actif).
- Dots indicateurs en bas inchangés.

## Étape 3 — Nettoyage

- Supprimer les 3 images IA obsolètes dans `src/assets/`.
- Aucun autre fichier modifié.

## Détails techniques

- Les captures Playwright sont faites en mode headless, viewport 1280×1800 comme prescrit. Session injectée si `LOVABLE_BROWSER_AUTH_STATUS === 'injected'` (à vérifier avant lancement).
- Si la session est absente ou si aucun serveur n'existe sur le compte de test : replier sur des captures d'un serveur seed / de l'écran vide. Je notifierai le cas dans la réponse.
- Aucun changement backend, aucune requête réseau côté app.
- Aucun impact sur la logique existante (thème, typographie, prefs Supabase).

## Ce qui n'est PAS fait

- Pas de moment « thème clair » (impossible sans implémentation clair — l'utilisateur a choisi « 3 scènes sombres réelles »).
- Pas de génération d'images IA.
- Pas de changement du timing 8s.