

# Header mobile : teinte plus claire + separateur

## Objectif

Appliquer une teinte de fond legerement plus claire sur la zone header + barre de recherche sur mobile, et ajouter un separateur subtil avant la liste des salons.

## Modifications

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

**1. Teinte plus claire pour le header (non-banner + embedded)**

Les headers aux lignes ~459 et ~487 utilisent actuellement le fond `bg-card` herite du parent. On va leur ajouter `bg-surface-elevated` (variable CSS deja definie, legerement plus claire que `--card`).

- Ligne 459 : ajouter `bg-[hsl(var(--surface-elevated))]` au div du header non-banner
- Ligne 487 : idem pour le header embedded

**2. Teinte plus claire pour la barre de recherche**

Les deux blocs de recherche (lignes ~444 et ~514) : envelopper dans un fond `bg-[hsl(var(--surface-elevated))]` pour que la barre de recherche partage la meme teinte que le header.

- Lignes 444-454 (recherche sous banner) : ajouter `bg-[hsl(var(--surface-elevated))]`
- Lignes 513-524 (recherche sans banner) : ajouter `bg-[hsl(var(--surface-elevated))]`

**3. Separateur avant la liste des salons**

Ajouter un composant `Separator` (ou `div` avec `h-px bg-border/50`) juste avant le `<div>` de la liste des salons (ligne ~528), pour creer une separation visuelle subtile entre la zone header/recherche et la liste des salons.

## Resume des changements

| Element | Avant | Apres |
|---|---|---|
| Header mobile (non-banner) | `bg-card` (herite) | `bg-[hsl(var(--surface-elevated))]` |
| Header mobile (embedded) | `bg-card` (herite) | `bg-[hsl(var(--surface-elevated))]` |
| Barre de recherche (2 blocs) | fond transparent | `bg-[hsl(var(--surface-elevated))]` |
| Avant liste des salons | rien | `Separator` leger (`bg-border/30`) |

Un seul fichier modifie : `src/components/mobile/MobileChannelListView.tsx`

