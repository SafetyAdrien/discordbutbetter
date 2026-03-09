
# Unifier hover et sélection dans la navigation des paramètres serveur

## Problème
Le style de sélection (active) et le style de hover sont visuellement différents. Il faut que la sélection utilise le même style que le hover, avec une opacité légèrement réduite pour le hover.

## Changements

**Fichier : `src/components/server-settings/ServerSettingsModal.tsx`**

### Boutons normaux (lignes 141-146)
- **Sélection** : remplacer `bg-primary/12 text-primary font-medium` par `bg-muted text-foreground font-medium`
- **Hover** : remplacer `hover:bg-muted` par `hover:bg-muted/60` (opacité réduite)
- **Icône active** (ligne 152) : remplacer `bg-primary/15` par `bg-transparent` (plus de cercle coloré sur l'icône)

### Boutons danger (lignes 170-176)
- **Sélection** : remplacer `bg-destructive/10 text-destructive font-medium` par `bg-destructive/8 text-destructive font-medium`
- **Hover** : remplacer `hover:bg-destructive/8` par `hover:bg-destructive/5`
- **Icône active danger** (ligne 183) : remplacer `bg-destructive/15` par `bg-transparent`

Résultat : hover et sélection partagent le même fond (`bg-muted`), la sélection étant pleine opacité et le hover à opacité réduite (~60%).
