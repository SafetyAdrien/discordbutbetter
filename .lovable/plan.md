## Problème

Au clic sur la barre "Rechercher", le placeholder saute vers la gauche de ~3px.

**Cause** : différence de padding effectif entre l'état repos et l'état actif.

| État | Composant | Border | Padding gauche | Offset texte total |
|---|---|---|---|---|
| Repos (MemberList) | `<Input className="pl-3 pr-8">` | 1px (`border-border`) | 12px | **13px** |
| Actif (MessageSearchPanel) | `<div … pl-2.5 pr-8>` avec `<input>` interne | 0px | 10px | **10px** |

L'active state supprime la border et utilise `pl-2.5` au lieu de `pl-3`, ce qui décale le texte de 3px vers la gauche.

## Fix (ciblé, un seul fichier)

**`src/components/layout/MessageSearchPanel.tsx`** — ligne 701 :

Remplacer le conteneur de la barre active pour reproduire EXACTEMENT la géométrie de l'`Input` au repos :

```diff
- 'relative flex items-center gap-1.5 h-8 min-h-8 max-h-8 pl-2.5 pr-8 rounded-xl bg-input box-border overflow-hidden',
+ 'relative flex items-center gap-1.5 h-8 min-h-8 max-h-8 pl-3 pr-8 rounded-xl bg-input box-border overflow-hidden border border-transparent',
```

- `pl-3` → aligne le texte avec l'état repos (12px identique).
- `border border-transparent` → compense le 1px de border de `<Input>` au repos, garantissant l'égalité pixel-perfect sans changer l'apparence visuelle (transparent).
- `h-8` + `box-border` conservés → hauteur totale reste 32px.

Ajouter un commentaire de verrouillage anti-régression au-dessus expliquant pourquoi `pl-3` + `border border-transparent` sont obligatoires (parité stricte avec l'`Input` shadcn au repos dans `MemberList.tsx`).

## Vérification

Cliquer sur la barre : le mot "Rechercher" ne doit plus bouger d'un pixel horizontalement entre l'état repos et l'état focus/popover ouvert.
