

## Objectif

Deux corrections visuelles ciblées sur le chat :

1. **Zone de message (hover) en angles droits** — actuellement les messages affichent un fond arrondi (`rounded-xl` via `var(--radius-xl)`) au survol. Le comportement Discord-like attendu : **angles parfaitement droits** sur la zone de hover.

2. **Aperçu de mention de rôle stylisé** — ajouter une **bordure gauche colorée** (couleur du rôle) à la pastille de mention de rôle, comme déjà fait pour `@everyone`/`@here` et les self-mentions, avec un fond teinté à ~30 % d'opacité.

## Comportement final

### 1. Zone de hover des messages

| Avant | Après |
|---|---|
| `border-radius: var(--radius-xl)` (~12px) | `border-radius: 0` (angles droits) |
| Coins arrondis sur le survol | Survol rectangulaire pleine largeur (Discord-like) |

### 2. Pastille de mention de rôle

```
┌─┬──────────────┐
│█│ @NomDuRôle   │   ← bordure gauche 2px colorée + fond rgba(color, 0.3)
└─┴──────────────┘
```

- Bordure gauche : `border-l-2` colorée avec la couleur du rôle
- Fond : `rgba(color, 0.3)` (déjà en place)
- Texte : couleur du rôle (déjà en place)

Aligne visuellement le rôle sur le style `@everyone` / `@here` / self-mention pour une cohérence visuelle complète.

## Modifications

### Fichier 1 : `src/index.css`

Localiser le bloc `.message-hover` (lignes ~329-336) et **retirer** la propriété `border-radius` :

```css
.message-hover {
  @apply transition-all duration-150;
  /* border-radius supprimé → angles droits */
}

.message-hover:hover {
  background: hsl(var(--surface-hover) / 0.25);
  box-shadow: inset 0 0 0 1px hsl(var(--border) / 0.15);
}
```

Le bloc mobile (`@media max-width: 640px`) reste inchangé.

### Fichier 2 : `src/components/chat/ChatArea.tsx`

Retirer les classes `rounded-md`, `rounded-xl` accolées à `.message-hover` pour éviter qu'elles n'écrasent le CSS :

- Ligne 1115 : `"group message-hover rounded-md px-2 -mx-2 mb-1 relative"` → retirer `rounded-md`
- Ligne 1256 : `"group message-hover rounded-xl px-4 pb-2 pt-1 mb-1"` → retirer `rounded-xl`
- Ligne 1433 : `"group/message group message-hover rounded-xl px-4 pb-1 mb-1 relative"` → retirer `rounded-xl`

Vérifier également `ThreadView.tsx`, `DMConversation.tsx`, `MobileChatView.tsx` pour les mêmes occurrences `message-hover rounded-*` éventuelles.

### Fichier 3 : `src/components/chat/mentions/MentionComponents.tsx`

Modifier `RoleMention` pour ajouter une bordure gauche colorée (style ligne 95-107) :

```tsx
<span
  className="inline-flex items-center gap-0.5 pl-1.5 pr-1 rounded-[3px] cursor-default font-medium border-l-2 transition-colors duration-100"
  style={{
    backgroundColor: hexToRgba(roleColor || '#99aab5', 0.3),
    color: roleColor || '#99aab5',
    borderLeftColor: roleColor || '#99aab5',
  }}
>
  @{roleName}
</span>
```

Changements précis :
- Ajout de `border-l-2` 
- Ajout de `borderLeftColor` dans le style inline (couleur du rôle, opacité pleine)
- Padding asymétrique `pl-1.5 pr-1` pour compenser visuellement la bordure

## Détails techniques

- **Pas de migration SQL** — purement visuel.
- **Pas de changement de format** — wire format `<@&SNOWFLAKE>` inchangé.
- **`@everyone` / `@here`** déjà corrects (jaune avec bordure), **pas de modification**.
- **Self-mention utilisateur** déjà avec bordure jaune, **pas de modification**.
- Le `border-radius: 0` est cohérent avec le style Discord montré dans l'image 2 (zone de hover rectangulaire qui s'étend horizontalement).

## Fichiers modifiés

- `src/index.css` — suppression du `border-radius` sur `.message-hover`
- `src/components/chat/ChatArea.tsx` — suppression des classes `rounded-*` redondantes
- `src/components/chat/mentions/MentionComponents.tsx` — `RoleMention` : ajout de la bordure gauche colorée
- (potentiellement) `ThreadView.tsx`, `DMConversation.tsx`, `MobileChatView.tsx` si même classes redondantes détectées

## Garantie de non-régression

- Aucun changement sur l'embed thread (rounded-bl-lg conservé)
- Aucun changement sur les avatars, attachments, polls, reactions
- Aucun changement sur les mentions utilisateur, salon, `@everyone`, `@here`, special
- Le rendu Markdown reste identique
- Pas de modification de la logique de hover (juste sa forme visuelle)

