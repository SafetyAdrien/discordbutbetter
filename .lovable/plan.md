## 1. Préchargement des 9 images de la bannière

Aujourd'hui les 9 PNG sont importés en `import` statique en haut du fichier : Vite les bundle dans le graphe, donc elles partent en requête dès que `AppearanceSettings` est chargé — mais rien ne priorise le premier slide, et rien ne garantit que les slides 2 & 3 soient décodées **avant** leur fondu (d'où le pop-in au premier cycle).

### Ce qu'on fait
- **Slide 1 (visible immédiatement)** : passer les 3 `<img>` en `fetchpriority="high"` + `decoding="sync"` + `loading="eager"`.
- **Slides 2 & 3** : garder `loading="lazy"` + `decoding="async"`, mais lancer un **prefetch programmatique** dès que la bannière est montée, dans un `useEffect` avec `requestIdleCallback` (fallback `setTimeout(_, 300)`) — via `new Image(); img.src = ...; img.decode()`. Résultat : le fondu enchaîné trouve les bitmaps déjà décodés, zéro reflow, zéro flash blanc.
- **Bonus zéro coût** : ajouter `width`/`height` intrinsèques sur les `<img>` pour éviter tout layout shift, et `will-change: opacity` uniquement pendant la transition.

Aucun changement d'API du composant, aucun impact sur le fondu.

## 2. Thème clair — audit et complétion

L'étape précédente a posé les tokens sémantiques (`:root` = clair, `.dark` = sombre) et le thème bascule bien globalement. Il reste **72 fichiers** qui contiennent au moins une couleur codée en dur (`bg-black`, `text-white`, `bg-[#…]`, `bg-[hsl(220…)]`, dégradés `from-[#…]`) qui **ne réagissent pas** au switch et cassent la lisibilité en clair.

### Stratégie : catégoriser puis remplacer par tokens

Passage systématique par zones fonctionnelles, du plus visible au plus rare :

1. **Chat & messages** — `MessageInput`, `MessageList`, `MessageItem`, réactions, mentions, embeds, code blocks, alerts markdown, blockquotes.
2. **Sidebar & rails** — `ServerList`, `ChannelList`, `MemberList`, `UserPanel`, headers.
3. **Modales & popovers** — settings, profile card, context menus, tooltips, color picker, emoji picker.
4. **Voice/Video** — tiles, halos, controls bar.
5. **Auth & landing** — pages `/auth`, `/`, `/invite`, écrans vides.
6. **Divers** — badges, calendrier, forum, media feed, threads sidebar.

### Règles de substitution appliquées

| Avant | Après |
|---|---|
| `bg-black`, `bg-[#0…]` | `bg-background` ou `bg-surface-1/2/3` |
| `text-white` | `text-foreground` ou `text-primary-foreground` selon contexte |
| `text-black` | `text-foreground` |
| `bg-white` | `bg-card` ou `bg-popover` |
| `border-[#…]` | `border-border` |
| `text-gray-400/500` | `text-muted-foreground` |
| `bg-[hsl(220 20% 9%)]` explicites | `bg-[hsl(var(--surface-1))]` |
| Dégradés hardcodés | tokens `--gradient-*` ou HSL via variable |

### Ajouts CSS ciblés (`src/index.css`)

- Ajuster quelques valeurs claires si l'audit visuel révèle un contraste trop faible (ex. `--muted-foreground` clair à `225 12% 35%`).
- Ajouter des variantes light pour les backdrops de modales (`--overlay: 225 25% 8% / 0.5` en dark, `220 20% 40% / 0.35` en light).
- Vérifier les scrollbars custom, les shadows d'élévation, et les `bg-black/50` de dropzones.

### Vérification

Playwright headless, en boucle :
1. Ouvrir chaque page/section principale (server, DMs, settings, profil, invite, auth).
2. Switch dark → light → dark, screenshot à chaque étape.
3. Contrôle visuel du contraste + scan console `getComputedStyle` sur les nœuds qui contenaient du hardcodé.

## Détails techniques

- Fichier bannière : `src/components/appearance/AppearancePreviewBanner.tsx` — ajout `useEffect` de prefetch + attributs `fetchpriority`/`decoding`/`loading` par pane, exposition via un flag `elevation === 1 ? eager : lazy`.
- Aucun changement du système de transition (opacité 900 ms) ni de la composition des slides.
- Pour le light theme : uniquement des edits de fichiers `.tsx` (remplacement classes) + potentiels tweaks dans `src/index.css`. Aucune migration, aucun changement de contrat de composants, aucune régression de layout attendue.
- La liste exhaustive des 72 fichiers est traitée par lots parallèles (rg + line_replace batchés).

## Hors scope

- Refonte des palettes de couleurs (on garde exactement les valeurs déjà en place).
- Nouveau système de theming (déjà en place via CSS vars).
- Retouche des screenshots de la bannière (déjà propres).
