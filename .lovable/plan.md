
# Uniformisation du Thème Gris Bleuté

## Problème identifié
Le nouveau thème gris bleuté (teinte 218°) a été appliqué aux variables CSS globales, mais de nombreux composants utilisent des couleurs hexadécimales codées en dur qui ne respectent pas ces variables.

---

## Fichiers à corriger

### 1. MemberList.tsx (Liste des membres)
**Lignes 606-608** - Couleurs en dur pour le background :
```tsx
// Avant
bg-[#161928] → bg-card
bg-[#151723] → transparent
bg-[#161927] → transparent
```

**Ligne 662** - Tooltip couleur en dur :
```tsx
// Avant
bg-[#111214] → bg-popover
```

### 2. VoiceChannelView.tsx (Vue du salon vocal)
**Lignes 99-101, 140-142, 226** - Couleurs en dur :
```tsx
// Avant
bg-[#1e1f22] → bg-background
bg-[#2b2d31] → bg-card
```

### 3. VoiceActionBar.tsx (Barre d'actions vocale)
**Lignes 55, 105** - Background des boutons :
```tsx
// Avant
bg-[#232428] → bg-surface-elevated
```

### 4. VoiceParticipantGrid.tsx
**Ligne 263** - Badge mute/deafen :
```tsx
// Avant
bg-[#232428] → bg-surface-elevated
```

### 5. EmojiStickerPicker.tsx
**Lignes 65, 94** - Background du picker :
```tsx
// Avant
bg-[#2b2d31] → bg-popover
bg-[#1e1f22] → bg-input
```

### 6. DMUserInfoPanel.tsx
**Ligne 165** - Couleur du texte :
```tsx
// Avant
text-[#b0b1b5] → text-muted-foreground
```

**Lignes 20-24** - Couleurs de statut :
```tsx
// Avant (couleurs Tailwind génériques)
bg-green-500 → bg-[hsl(var(--online))]
bg-yellow-500 → bg-[hsl(var(--idle))]
bg-red-500 → bg-[hsl(var(--dnd))]
bg-gray-500 → bg-[hsl(var(--offline))]
```

### 7. ChatArea.tsx
**Lignes 1066, 1194** - Badges de poll et system :
```tsx
// Avant
text-[#5865f2] → text-primary
bg-[#5865f2]/10 → bg-primary/10
```

### 8. markdown.tsx (Rendu Markdown)
**Lignes 427, 450, 583, 589, 595, 707** - Couleurs de code et citations :
```tsx
// Avant
bg-[#2b2d31] → bg-surface-elevated
text-[#d4d7dc] → text-foreground
text-[#00a8fc] → text-primary
text-[#949BA4] → text-muted-foreground
border-[#4e5058] → border-border
text-[#dbdee1] → text-foreground
```

### 9. UploadDropOverlay.tsx
**Lignes 16, 28, 36, 45** - Couleurs de l'overlay de téléchargement :
```tsx
// Avant
bg-[#5865f2] → bg-primary
bg-[#1e2124] → bg-background
bg-[#2f3136] → bg-card
bg-[#36393f] → bg-muted
```

### 10. RoleBadgePopover.tsx
**Ligne 37** - Tooltip background :
```tsx
// Avant
bg-[#111214] → bg-popover
```

### 11. MentionComponents.tsx
**Lignes 29-30** - Couleurs des mentions :
```tsx
// Utiliser les variables CSS pour primary au lieu de #5865f2
```

### 12. ServerList.tsx
**Lignes 45, 116-119, 205, 517, 531** - Couleurs du blurple Discord :
```tsx
// Avant
bg-[#5865f2] → bg-primary
text-[#5865f2] → text-primary
```

### 13. ThreadSystemMessage.tsx
**Lignes 39, 46** - Couleurs du texte :
```tsx
// Avant
text-[#ecedee] → text-foreground
text-[#c8cad0] → text-muted-foreground
```

### 14. SummariesDropdown.tsx
**Lignes 138, 202** - Badge BETA :
```tsx
// Avant
bg-[#5865F2] → bg-primary
```

### 15. VoiceVideoTile.tsx
**Lignes 45, 87** - Background et badge :
```tsx
// Avant
bg-[#1e1f22] → bg-background
bg-[#5865f2]/80 → bg-primary/80
```

---

## Tableau récapitulatif des correspondances

| Couleur hexadécimale | Variable CSS correspondante |
|----------------------|----------------------------|
| `#1e1f22` | `bg-background` (fond principal) |
| `#2b2d31` | `bg-card` (sidebar/panneau) |
| `#161928`, `#161927`, `#151723` | `bg-card` (sidebar) |
| `#232428` | `bg-surface-elevated` (surfaces élevées) |
| `#36393f` | `bg-muted` (surfaces secondaires) |
| `#5865f2` | `bg-primary` / `text-primary` (accent bleu) |
| `#111214` | `bg-popover` (menus/tooltips) |
| `#00a8fc` | `text-primary` (liens) |
| `#dbdee1`, `#ecedee` | `text-foreground` (texte principal) |
| `#d4d7dc` | `text-foreground` (texte code) |
| `#949BA4`, `#c8cad0`, `#b0b1b5` | `text-muted-foreground` (texte secondaire) |
| `#4e5058` | `border-border` (bordures) |

---

## Résultat attendu

Après ces modifications :
- Tous les composants utiliseront les variables CSS du thème
- La modification des variables dans `index.css` affectera automatiquement tous les composants
- Le thème gris bleuté sera cohérent dans toute l'application
- Les futurs changements de thème seront simplifiés

---

## Priorité des corrections

1. **Haute** : MemberList, VoiceChannelView, VoiceActionBar (visibilité immédiate)
2. **Moyenne** : EmojiStickerPicker, DMUserInfoPanel, ChatArea (fréquemment utilisés)
3. **Basse** : markdown.tsx, UploadDropOverlay, ThreadSystemMessage (moins visibles)
