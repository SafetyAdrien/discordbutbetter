# Génération du design system Discord

Ce dossier documente d'où viennent les fichiers de `src/styles/`, comment les
régénérer, et ce qui est permis de les éditer à la main.

## Fichiers

| Fichier | Nature | Édition |
|---|---|---|
| `src/styles/discord-tokens.css` | **Généré** — 4 056 tokens bruts du bundle Discord | ❌ jamais |
| `src/styles/discord-bridge.css` | **Maintenu à la main** — le pont vers shadcn | ✅ oui |
| `docs/design-reference/tokens.json` | **Généré** — tous les tokens | ❌ jamais |
| `docs/design-reference/design-system.json` | **Généré** — tokens résolus en hex | ❌ jamais |
| `docs/design-reference/DESIGN-SYSTEM.md` | **Généré** — spécification lisible | ❌ jamais |

## Origine

Vesktop a été écarté : c'est un simple wrapper Electron, ses 2,9 Ko de CSS ne
couvrent que le sélecteur d'écran de Venmic. Le design réel est dans les assets
servis par `discord.com/app` — 322 fichiers CSS dont un principal de 778 Ko.

## Régénérer

Les scripts vivent dans `/tmp/opencode/discord-design/` (hors dépôt, car ils
dépendent d'un accès réseau ponctuel).

```sh
cd /tmp/opencode/discord-design

# 1. récupérer l'index des assets
#    -> <RAW>/  doit contenir 952007.*.css et 419070.*.css au minimum

# 2. tokens de composants (les 4 056) + CSV de sortie
node extract-components.mjs

# 3. tokens sémantiques résolus en hex
node extract.mjs

# 4. écriture dans le projet
node emit.mjs
```

Discord republie ses assets régulièrement : les noms de fichiers contiennent un
hash (`952007.875e21df2d29b575.css`). Il faut refaire l'étape 1 si le hash
change.

## Le pont

`discord-bridge.css` ne fait qu'une chose : redéfinir des variables **déjà
déclarées** dans `src/index.css`, en les pointant vers les tokens Discord.

Aucun composant n'est modifié. **Pour annuler l'intégration, il suffit de
supprimer les deux lignes `@import` en tête de `src/index.css`.**

### Trois contraintes à connaître avant d'y toucher

**0. Les blocs `.theme-*` sont morts.** Discord déclare ses tokens de couleur
sémantique dans `.theme-dark` / `.theme-darker` / `.theme-midnight` /
`.theme-light`. Or ce projet pose `.dark` / `.light` sur `<html>`
(`ThemeContext` fait un `classList.toggle`). Les sélecteurs ne correspondent
donc jamais : **tous les tokens `--interactive-*`, `--text-*`, `--border-*`,
`--status-*` de Discord sont indéfinis à l'exécution.** Seuls les tokens
`:root` — les échelles `--blurple-*`, `--primary-*`, `--neutral-*`,
`--icon-size-*`, `--radius-*`, `--control-item-height-*` — sont joignables.

C'est pour ça que `discord-bridge.css` re-déclare explicitement le système
interactif par thème. Tout nouveau token sémantique de Discord doit être
ajouté là, pas seulement dans `discord-tokens.css`.

**1. La spécificité, pas l'ordre.** Vite remonte les `@import` en tête de feuille,
donc un pont déclaré plus bas perdrait la cascade contre les `@layer base` de
`index.css`. Le pont utilise donc `html.dark` (0,1,1) et `html:not(.dark)`
(0,1,1) pour battre `.dark` et `:root` (0,1,0) — l'intégration devient
indépendante de l'ordre du fichier.

**2. Un triplet HSL ne porte pas d'alpha.** Tailwind consomme `hsl(var(--x))`
et `hsl(var(--x) / .5)`. C'est compatible avec les variables `--*-hsl` de
Discord, qui sont déjà des triplets. Mais Discord exprime beaucoup de couleurs
via `hsl(X / 0.06)` : ces valeurs-là sont **aplaties** sur leur surface de
référence (`--*-flat-hsl`). Le rendu à l'écran est identique, mais ces
variables ne sont plus rejouables via la syntaxe `/opacity` de Tailwind.

**3. Discord n'utilise pas du noir pour ses bordures.** Le gris d'opacité
`--opacity-N` vaut `#97979f` dans les deux thèmes. Utiliser du noir en light
produisait une bordure à 59 % de luminance, bien trop lourde.

### Tokens non couverts

Restent sur les valeurs d'origine de `index.css` :

- `--secondary`, `--secondary-foreground` (violet/gris, usage marginal)
- `--alert-*` (5 couleurs de feedback, hors système Discord)
- `--gradient-*`, `--glow-*`, `--shadow-elevation-*`, `--shadow-glow*`
- `--discord-sheet-*` (le panneau latéral de thème custom, scopé à sa classe)
- `--streaming`, `--motion-*`, `--ease-standard`
- `--surface-server-list` (la barre de serveurs — voir « Reste à faire »)

## Reste à faire

- **167 tokens `--mobile-*`** : barre d'onglets, feuille clavier mobile,
  subgroups de guild bar. Le projet a une UI mobile complète (48 composants)
  qui n'exploite aucun de ces tokens.
- **Thème custom** : brancher `src/lib/customTheme/palette.ts` sur les hooks
  `--custom-theme-base-color` / `-text-color` / `-border-color`. C'est le plus
  gros gain restant — voir `DESIGN-SYSTEM.md`.
- **Chat** : 44 composants, aucun encore traité.
- **`--surface-server-list`** : devrait pointer sur `--primary-700-hsl`
  (`#1e1f22`) en dark. Non fait : c'est le fond du rail, à valider à l'œil.

## Harnais de design

Route `/design`, **hors `RequireAuth`**, données fictives
(`src/design/fixtures.ts`). Sert à photographier un état stable pour
comparer avant/après sans passer par Supabase.

```sh
npm run dev
# puis http://localhost:5173/design
```

Screenshot reproductible des deux thèmes (Chromium via Playwright) :

```sh
node /tmp/opencode/shot.mjs http://localhost:8080/design /tmp/shots/h
```

Le harnais respecte volontairement l'invariant
`MemberList.fillHeight` : ce prop est réservé au montage desktop
d'`Index.tsx`, et un test le vérifie.

## État du restyle

Faits, avec la source de chaque valeur :

| Élément | Avant | Après |
|---|---|---|
| Tuile serveur | 52 px, cercle | 48 px, rayon 24 px |
| Pastille serveur | `-left-[14px]` | `-left-3` (collée à la tuile) |
| Ligne salon | `py-[6px]`, 30 px | 32 px, inset 8 px, rayon 4 px |
| Libellé catégorie | `px-3 pt-1.5` | 24 px de haut, `mt-2`, `px-2` |
| Conteneur salons | `px-1` | aucun padding (les items le portent) |
| Ligne membre | pilule `rounded-2xl` | 40 px, rayon 4 px, inset 8 px |
| Anneau de statut | `border-card` | `border-surface-1` |
| En-tête membres | absent | titre + 3 icônes, 48 px, filet |

Les hauteurs viennent de `--control-item-height-sm/md`, les rayons de
`--radius-*`, les états de `--interactive-*`.