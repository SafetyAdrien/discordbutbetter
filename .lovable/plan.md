## Objectif

Ajouter, tout en haut de l'onglet **Apparence** (au-dessus de la section « Thème », séparé par un `<Separator />`), une **bannière visuelle non-interactive** de ~260px de haut qui fait défiler 3 « moments » avec transition **fondu au noir**, chaque moment durant **8s**.

Chaque moment reprend la mise en scène de ta capture : 3 couches empilées en cascade (mockup principal au fond, deux fenêtres flottantes devant, décalées et légèrement rotées), sur un fond dégradé sombre.

## Les 3 moments

1. **Thème sombre** — composition de 3 layers sombres (channel list + chat + modal paramètres) sur dégradé violet/indigo.
2. **Thème clair** — même composition mais en palette claire, séparée visuellement du moment sombre par la transition (pas côte à côte : l'utilisateur a demandé un vrai carrousel avec fondu, pas un split-screen figé).
3. **Typographie des catégories** — composition mettant en scène une ChannelList + le panneau de contrôle « AG / ag / Ag / Aa » + un modal, pour illustrer la personnalisation.

## Assets

Générer **3 images PNG** via `imagegen--generate_image` (tier `standard` pour un rendu propre), format 1920x520 (ratio bannière large), chacune représentant la composition « 3 layers empilés » demandée. Les images sont importées via ES6 imports classiques dans `src/assets/` (pas d'externalisation `lovable-assets` nécessaire — 3 fichiers modérés).

- `src/assets/appearance-banner-dark.jpg`
- `src/assets/appearance-banner-light.jpg`
- `src/assets/appearance-banner-typography.jpg`

Prompts orientés : « floating UI mockup screenshots stacked in 3 layers, main window in back, two smaller windows overlapping in front with slight rotation, isometric-ish, deep gradient background, no text legibility required, cinematic soft shadows ».

## Composant

Nouveau fichier `src/components/appearance/AppearancePreviewBanner.tsx` :

- Container `h-[260px] w-full rounded-2xl overflow-hidden relative border border-border/50`.
- 3 `<img>` absolument positionnés (`inset-0 w-full h-full object-cover`), un par moment.
- État `activeIndex` (0/1/2), setInterval de 8000ms pour avancer.
- Transition : chaque image a `opacity-100` si active, `opacity-0` sinon, `transition-opacity duration-700 ease-in-out`.
- **Fondu au noir** : overlay `<div className="absolute inset-0 bg-black pointer-events-none" />` dont l'opacité passe à `1` pendant 700ms au moment du switch (via un second state `isFading`), puis retombe à `0`. Timing total : 8000ms visible → 700ms fondu au noir montant → swap image → 700ms fondu descendant.
- Respect `prefers-reduced-motion` (via `useReducedMotion` déjà présent) : désactive l'auto-play et affiche uniquement le moment 0.
- Petits « dots » d'indicateur en bas (purement décoratifs, `aria-hidden`), 3 pastilles.
- `role="img"` + `aria-label` global sur le container : « Aperçu des thèmes et de la personnalisation typographique ».
- Non-interactif : `pointer-events-none` sur les images, aucun clic/hover, aucun bouton.

## Intégration

Modifier `src/components/account-settings/AppearanceSettings.tsx` :

```tsx
<div className="space-y-8">
  <AppearancePreviewBanner />
  <Separator />
  <section data-settings-section-id="theme">…</section>
  <CategoryCaseSection />
</div>
```

Aucune modification du registre de sections ni de l'index de recherche (la bannière n'est pas une section navigable).

## Détails techniques

- Cleanup du `setInterval` dans le `useEffect` return.
- `useEffect` déclenché uniquement quand l'onglet est monté (pas de logique globale).
- Aucune requête réseau, aucune donnée utilisateur, aucune persistance.
- Le composant est pur présentation → uniquement du frontend, conforme à la règle « UI change → frontend only ».
- Aucun impact sur la logique existante (thème, typographie, prefs Supabase).

## Ce qui n'est PAS fait

- Pas de split-screen simultané dark|light (l'utilisateur veut un carrousel, pas une comparaison figée).
- Pas d'animation interactive dans les mockups (images statiques uniquement, comme demandé).
- Pas de génération dynamique côté serveur.