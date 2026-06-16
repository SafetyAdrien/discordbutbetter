## 1. Layout des messages — conformité Discord

**Fichier**: `src/components/chat/ChatArea.tsx`

### Changements visuels

Reproduire les espacements exacts de Discord :

| Élément | Actuel | Discord / Nouveau |
|---|---|---|
| Gap avatar ↔ contenu | `gap-3` (12px) | `gap-4` (16px) |
| Espace au-dessus d'un message "premier du groupe" | `space-y-0.5` (2px) | `mt-[17px]` sur le premier message de chaque groupe |
| Espace entre nom d'auteur et 1ʳᵉ ligne | implicite (gap baseline) | `mt-[2px]` sur le bloc de contenu |
| Padding-top en haut du wrapper username | inexistant | `pt-[2px]` (petit espace au-dessus du nom) |
| Indent gauche du contenu groupé (sans avatar) | `w-10` placeholder + `gap-3` = 52px | `w-10` + `gap-4` = 56px (aligné sur Discord 72px = 16 padding container + 56) |
| Espacement entre messages d'un même groupe | `space-y-0.5` | conservé (~2px) |

### Implémentation

1. Le wrapper de liste (~ligne 1038) passe de `space-y-0.5` à `space-y-0`. Les marges sont gérées au niveau de chaque message via `mt-[17px]` pour les premiers du groupe et `mt-0` pour les groupés.
2. La rangée header (avatar + contenu, lignes 1470 et 1620) passe de `gap-3` à `gap-4`.
3. Le bloc texte/markdown (lignes 1570 et 1693) reçoit `mt-[2px]` pour créer le petit gap sous le nom.
4. L'`Avatar` perd `mt-0.5` au profit d'un alignement précis : `mt-[2px]` (pour matcher la baseline de Discord).
5. Le wrapper d'un message "premier du groupe" reçoit `mt-[17px]` (sauf le tout premier de la liste).

Aucune logique business modifiée — purement présentation. Reorder live et toutes autres règles préservées.

## 2. Simplification de la popup @everyone / @here

**Fichier**: `src/components/profile/EveryoneHerePopup.tsx`

Réduire la popup à un layout minimal type Discord (cf. capture) :

```text
┌────────────────────────────┐
│ @everyone   (texte grisé)  │  ← header simple
├────────────────────────────┤
│ [avatar] Nom membre        │
│ [avatar] Nom membre        │
│ ...                        │
└────────────────────────────┘
```

### Changements

- **Supprimer** : bandeau gradient coloré, icône AtSign/Megaphone, sous-titre "Mention contextuelle/globale", barre de stats (compteurs online/idle/dnd/offline), bloc description avec icône Info.
- **Garder** :
  - Un header unique avec le texte `@everyone` ou `@here` en `text-xs text-muted-foreground font-medium` sur un padding compact (`px-3 py-2`), séparateur `border-b border-border`.
  - La liste scrollable des membres (avatar 24px + nom), sans dot de statut pour rester minimal (style capture).
- **Conserver** : tri (online d'abord, alpha ensuite), filtrage `here` (online/idle/dnd uniquement), `ScrollArea max-h-60`.
- Taille de popover réduite : `w-64` au lieu de `w-80`.

Aucune logique de mention/notification modifiée.

## Fichiers touchés

- `src/components/chat/ChatArea.tsx` (espacements messages)
- `src/components/profile/EveryoneHerePopup.tsx` (refonte popup)
