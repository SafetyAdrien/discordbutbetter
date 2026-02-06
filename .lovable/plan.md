

# Harmonisation des Couleurs Hardcodées vers le Thème Gris-Bleuté

## Problème identifié

De nombreux composants utilisent des couleurs hexadécimales hardcodées (anciennes valeurs Discord violet-bleu) au lieu des variables CSS du nouveau thème gris-bleuté (218°).

### Couleurs hardcodées à remplacer

| Couleur hardcodée | Utilisation | Remplacer par |
|-------------------|-------------|---------------|
| `#1e1f22` | Background sombre | `hsl(var(--popover))` ou `bg-popover` |
| `#2b2d31` | Surface élevée | `hsl(var(--surface-elevated))` ou `bg-card` |
| `#232428` | Éléments UI | `hsl(var(--muted))` ou `bg-muted` |
| `#151723` / `#121421` | Header/Toolbar | `hsl(var(--toolbar))` |
| `#1e2124` | Background alternatif | `bg-popover` |
| `#2d2f34` | Gradient surface | `hsl(var(--muted))` |
| `#949BA4` | Texte secondaire | `text-muted-foreground` |
| `#5865f2` | Blurple Discord | `hsl(var(--primary))` ← **Conservé** |

**Note importante** : `#5865f2` (Blurple) est proche de notre `--primary` (225 85% 53%) et sera remplacé par `hsl(var(--primary))` pour cohérence.

---

## Fichiers à modifier (28 fichiers identifiés)

### Composants Voice/Audio
| Fichier | Modifications |
|---------|---------------|
| `VoiceChannelView.tsx` | `bg-[#1e1f22]` → `bg-popover` |
| `VoiceChannelChat.tsx` | `bg-[#2b2d31]` → `bg-card` |
| `VoiceVideoTile.tsx` | `bg-[#1e1f22]`, gradients → variables CSS |
| `VoiceActionBar.tsx` | `bg-[#232428]` → `bg-muted` |
| `VoiceParticipantGrid.tsx` | `bg-[#232428]` → `bg-muted` |

### Composants Chat
| Fichier | Modifications |
|---------|---------------|
| `ChatArea.tsx` | `bg-[#151723]` → `bg-[hsl(var(--toolbar))]` |
| `CreatePollModal.tsx` | `bg-[#1e1f22]`, `bg-[#5865f2]` → variables |
| `EmojiStickerPicker.tsx` | `bg-[#2b2d31]`, `bg-[#1e1f22]` → variables |
| `MarkdownPreview.tsx` | `bg-[#1e1f22]`, `text-[#949BA4]` → variables |
| `MentionComponents.tsx` | `bg-[#111214]`, `bg-[#2b2d31]` → variables |
| `RoleBadgePopover.tsx` | `bg-[#111214]` → `bg-popover` |

### Composants UI
| Fichier | Modifications |
|---------|---------------|
| `code-block.tsx` | `bg-[#2b2d31]`, `bg-[#232428]`, `text-[#949BA4]` |
| `upload/UploadDropOverlay.tsx` | `bg-[#1e2124]` → `bg-popover` |

### Composants Layout
| Fichier | Modifications |
|---------|---------------|
| `ChannelList.tsx` | `bg-[#121421]`, `text-[#c6c7cd]`, `text-[#9B9CA3]` |
| `ServerList.tsx` | `bg-[#5865f2]` → `bg-primary` |

### Composants Announcement
| Fichier | Modifications |
|---------|---------------|
| `AnnouncementChannel.tsx` | `bg-[#151723]` → `bg-[hsl(var(--toolbar))]` |

### Autres composants
| Fichier | Modifications |
|---------|---------------|
| `DMUserInfoPanel.tsx` | `text-[#b0b1b5]` → `text-muted-foreground` |
| `SummariesBar.tsx` | `bg-[#5865F2]` → `bg-primary` |
| `SummariesDropdown.tsx` | `bg-[#5865F2]` → `bg-primary` |
| `RoleManager.tsx` | `bg-[#5865f2]` → `bg-primary` |
| `DndComponents.tsx` | `bg-[#5865f2]` → `bg-primary` |
| `ThreadView.tsx` | `text-[#5865f2]` → `text-primary` |
| `BoostBenefitsPage.tsx` | Couleurs boost (conservées - spécifique) |

---

## Détail des remplacements par fichier

### 1. VoiceChannelView.tsx (lignes 99-142)
```tsx
// Avant
<div className="flex-1 flex flex-col bg-[#1e1f22]">
<header className="... bg-[#1e1f22]">

// Après
<div className="flex-1 flex flex-col bg-popover">
<header className="... bg-popover">
```

### 2. ChatArea.tsx (ligne 786)
```tsx
// Avant
<div className="h-12 ... bg-[#151723] ...">

// Après
<div className="h-12 ... bg-[hsl(var(--toolbar))] ...">
```

### 3. ChannelList.tsx (ligne 1191)
```tsx
// Avant
<div className="h-14 ... bg-[hsl(var(--card))] ... bg-[#121421]">

// Après (supprimer la double déclaration)
<div className="h-14 ... bg-[hsl(var(--toolbar))] ...">
```

### 4. code-block.tsx (lignes 72-74)
```tsx
// Avant
<pre className="... bg-[#2b2d31] border border-[#1e1f22] ...">
  <div className="... border-b border-[#1e1f22] bg-[#232428]">
    <span className="text-xs text-[#949BA4]">

// Après
<pre className="... bg-card border border-border ...">
  <div className="... border-b border-border bg-muted">
    <span className="text-xs text-muted-foreground">
```

### 5. EmojiStickerPicker.tsx
```tsx
// Avant
className="... bg-[#2b2d31] ..."
className="... bg-[#1e1f22] ..."

// Après
className="... bg-popover ..."
className="... bg-card ..."
```

### 6. VoiceActionBar.tsx
```tsx
// Avant
<div className="flex items-center bg-[#232428] rounded-lg overflow-hidden">

// Après
<div className="flex items-center bg-muted rounded-lg overflow-hidden">
```

### 7. ServerList.tsx
```tsx
// Avant
'bg-[#5865f2] text-white rounded-[16px]'
'hover:bg-[#5865f2]/80'

// Après
'bg-primary text-white rounded-[16px]'
'hover:bg-primary/80'
```

---

## Nouvelles variables CSS recommandées

Pour faciliter la maintenance, ajouter ces variables dans `index.css` si nécessaire :

```css
:root {
  /* Déjà présentes - mapping */
  --popover: 218 22% 9%;      /* Surfaces très sombres (#171a20) */
  --card: 218 20% 10%;        /* Sidebar/surfaces (#191d23) */
  --muted: 218 15% 20%;       /* Éléments UI (#2a3039) */
  --toolbar: 218 20% 18%;     /* Headers (#262c36) */
  --surface-elevated: 218 18% 14%;  /* Surfaces élevées */
}
```

---

## Mapping des couleurs (référence)

| Ancienne couleur | Hex | Nouvelle variable | Hex approximatif |
|------------------|-----|-------------------|------------------|
| `#1e1f22` | Noir Discord | `--popover` | `#171a20` |
| `#2b2d31` | Gris Discord | `--card` | `#191d23` |
| `#232428` | Gris moyen | `--muted` | `#2a3039` |
| `#151723` | Toolbar | `--toolbar` | `#262c36` |
| `#5865f2` | Blurple | `--primary` | `#2153ed` |
| `#949BA4` | Texte muted | `--muted-foreground` | `#a1a7b5` |

---

## Ordre d'implémentation

1. **Composants de base** : `code-block.tsx`, `MarkdownPreview.tsx`
2. **Layout** : `ChannelList.tsx`, `ServerList.tsx`
3. **Chat** : `ChatArea.tsx`, `CreatePollModal.tsx`, `EmojiStickerPicker.tsx`
4. **Voice** : `VoiceChannelView.tsx`, `VoiceActionBar.tsx`, `VoiceChannelChat.tsx`
5. **Autres** : Remaining files

---

## Avantages

1. **Cohérence** : Toute l'app utilise les mêmes variables CSS
2. **Maintenabilité** : Un seul endroit pour modifier le thème
3. **Thème futur** : Facilite l'ajout d'un mode clair si nécessaire
4. **Performance** : Les variables CSS sont gérées par le navigateur

