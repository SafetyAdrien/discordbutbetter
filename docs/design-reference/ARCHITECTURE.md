# Architecture réelle de Discord — re-vérification

> Ce document remplace les valeurs estimées de `DESIGN-SYSTEM.md`.
> Il est issu de l'analyse des **322 fichiers CSS** du bundle (2,8 Mo),
> et non des 6 plus gros.

## Pourquoi cette re-vérification

La première passe n'avait téléchargé que **6 fichiers CSS sur 322**, et
aucun des 356 bundles JS. Plusieurs valeurs avaient donc été estimées
plutôt que mesurées. Les corrections sont signalées plus bas.

## Architecture de la grille

Discord n'utilise pas des colonnes en flex : c'est une **grille à zones
nommées** (`.base__5e434`).

```css
grid-template-areas:
  "titleBar   titleBar   titleBar"
  "guildsList notice     notice"
  "guildsList channelsList page";
grid-template-columns:
  [start] min-content [guildsEnd] min-content [channelsEnd] 1fr [end];
grid-template-rows:
  [top] var(--custom-app-top-bar-height)
  [titleBarEnd] min-content [noticeEnd] 1fr [end];
```

Largeurs : ce sont des variables, pas des valeurs en dur.

| Zone | Variable | Valeur |
|---|---|---|
| Barre de serveurs | `--custom-guild-list-width` | `guildbar-avatar-size + 2×padding` = **72 px** |
| Liste de salons | `--custom-guild-sidebar-width` | **268 px** |
| Colonne membres | `--custom-member-list-width` | **256 / 264 / 268 px** |
| Zone principale | `1fr` | le reste |
| Barre de titre | `--custom-app-top-bar-height` | 24 / 32 / 40 px |

`--custom-app-sidebar-target-width` = somme des deux premières.

## Échelle typographique

**Il n'existe aucun token `font-size` chez Discord.** L'échelle est cuite
dans les classes. Les valeurs réellement employées :

```
10 · 12 · 14 · 16 · 18 · 20 · 24 · 32 px
```

| Taille | Usage |
|---|---|
| 10 px | badges, supercriptions |
| 12 px | libellés de catégorie, horodatages |
| 14 px | texte secondaire, activité |
| 16 px | corps du texte, noms de salon, composeur |
| 18 px | titres |
| 20 px | titres de section |
| 24 px | titres d'écran vide |
| 32 px | chiffres, valeurs |

Interligne du message : `--chat-markup-line-height: 1.375rem` (22 px).

## Rayons

`--radius-xs 4px · sm 8px · md 12px · lg 16px · xl 24px · xxl 32px · round`

## Contrôles

```
--control-item-height-sm  32px   ligne de salon, ligne de membre
--control-item-height-md  40px   bouton, contrôle
--control-input-height-sm 32px
--control-input-height-md 40px
--form-input-height       44px   composeur
--chat-avatar-size        40px
--guildbar-avatar-size    40px
--icon-size-xxs…lg  12 / 16 / 18 / 24 / 32 px
```

## Anatomie du composeur

```css
.placeholder { height: 44px;
               padding-block: var(--space-xxs);        /* 4px  */
               padding-inline: var(--space-8) var(--space-4); } /* 8px 4px */
```

Le composeur est un bloc de fond simple : **ni bordure ni ombre**.

## Surfaces — contradiction résolue

Le point bloquant est tranché. Chaque zone ne prend pas le même token :

```css
.chat_f75fb0        { background: var(--background-gradient-chat,    var(--background-base-lowest)); }
.chatContent_f75fb0 { background: var(--background-gradient-chat,    var(--background-base-lower));  }
.sidebar__5e434     { background:                                        var(--background-base-lower)   ; }
.tree_ef3116        { background: var(--background-gradient-app-frame, var(--background-base-lowest)); }
.guildSidebar__1add6{ background: var(--background-gradient-high,       var(--background-base-lowest)); }
.popover_d6f39b     { background:                                        var(--background-surface-high); }
```

Les variables `--background-gradient-*` référencent
`--custom-background-gradient-*-color`, qui n'est défini **que** si le
thème custom est actif. Sans thème custom le `rgb()` est invalide, donc
**c'est le fallback qui s'applique**.

Valeurs par thème :

| token | dark | light |
|---|---|---|
| `--background-base-lowest` | `neutral-73` `#2c2d32` | `neutral-4` `#f3f3f4` |
| `--background-base-lower` | `neutral-69` `#323339` | `neutral-2` `#fbfbfb` |
| `--background-base-low` | `neutral-66` `#36373e` | `neutral-2` `#fbfbfb` |

→ Carte définitive des surfaces en dark :

| Zone | Classe | Fond |
|---|---|---|
| **Chat (visible)** | `.chatContent` | `base-lower` **`#323339`** |
| **Liste de salons** | `.tree` dans `.sidebar` | `base-lowest` **`#2c2d32`** |
| **Colonne membres** | `.guildSidebar` | `base-lowest` **`#2c2d32`** |
| Modale / popover | `.popover` | `surface-high` |

C'est cohérent avec la capture de référence : le chat est **plus clair**
que la liste de salons, et la colonne membres a exactement le même ton
que la liste de salons. Les deux valent `#2c2d32`.

Mon erreur précédente : j'avais lu `.sidebar{background:base-lower}` comme
« la liste de salons vaut base-lower ». C'est le *conteneur* ; c'est
`.tree`, qui le peint, qui porte `base-lowest`.

## Corrections par rapport à la première passe

| Élément | Estimé | Mesuré |
|---|---|---|
| Largeur liste de salons | 240 px | **268 px** |
| Largeur colonne membres | 240 px | **256–268 px** |
| Tokens `font-size` | supposés existants | **inexistants** |
| Fond du composeur | `neutral-64` = `#3f4048` | `neutral-64` = **`#393a41`** |
| Grille | flex + largeurs en dur | **zones nommées + variables** |
| Fond de la liste de salons | supposé `base-lower` | **`base-lowest`** — `.tree`, pas `.sidebar` |
| Fond de la colonne membres | supposé `base-lower` | **`base-lowest`** — même ton que les salons |
| Fond du chat | `primary-600` `#313338` | **`base-lower` `#323339`** |

## Ce qui reste à faire

- Trancher la contradiction chat / liste de salons (voir plus haut).
- Attaquer les 356 bundles JS : l'anatomie des composants y est plus
  riche que dans le CSS (logique de groupement des messages, états).
- Extraire l'échelle d'espacement par composant, pas seulement le global.