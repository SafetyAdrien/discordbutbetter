

## Compréhension

L'utilisateur souhaite que le **conteneur du composant de saisie lui-même** (et non juste la mince bande de 24px au-dessus) agisse comme un **calque flou** par-dessus les messages qui défilent derrière, au lieu d'avoir un fond opaque qui masque tout.

État actuel : le conteneur `<div className="... px-4 pb-4 pt-2">` a un fond hérité du parent (opaque `bg-background`), et seule une petite bande de 24px au-dessus a un dégradé flouté.

Objectif : transformer toute la zone du composer en surface translucide floutée → on aperçoit les anciens messages floutés derrière le champ de saisie, au lieu d'un bloc plat.

## Solution

Remplacer la bande de transition (`-top-6 h-6`) par un **fond flou intégré au conteneur du composer**, couvrant toute sa hauteur, avec un dégradé d'opacité (haut transparent → bas opaque) pour une transition douce.

### Changements (3 fichiers, même pattern)

**1. `src/components/chat/ChatArea.tsx` (~ligne 1894-1896)**
```tsx
<div className="relative flex-shrink-0 w-full px-4 pb-4 pt-2 md:px-4 md:pb-4 md:pt-2">
  {/* Calque flou couvrant tout le composer + extension vers le haut */}
  <div className="pointer-events-none absolute -top-8 left-0 right-0 bottom-0 backdrop-blur-md bg-gradient-to-b from-background/0 via-background/60 to-background/85 -z-0" />
  <div className="relative z-10">
    <TypingIndicator ... />
    {replyingTo && <ReplyReference ... />}
    <MessageInput ... />
  </div>
</div>
```

**2. `src/components/threads/ThreadView.tsx` (~ligne 940-942)** — même pattern.

**3. `src/components/channels/AnnouncementChannel.tsx` (~ligne 1093-1095)** — même pattern.

### Détails techniques
- `-top-8` : étend le flou 32px au-dessus du conteneur pour une transition naturelle
- `backdrop-blur-md` : flou réel sur les pixels derrière (vs `blur-[2px]` cosmétique)
- `bg-gradient-to-b from-background/0 via-background/60 to-background/85` : transparent en haut → semi-opaque en bas pour assurer la lisibilité du champ de saisie
- `pointer-events-none` + `z-0` derrière, contenu en `z-10` : le composer reste 100% interactif
- Aucune logique métier touchée, uniquement présentation

### Garantie "ne casse rien"
- Hauteur, padding, comportement du composer : inchangés
- TypingIndicator, ReplyReference, MessageInput : positionnement préservé via wrapper `relative z-10`
- Mobile : `md:` paddings préservés
- Le `pointer-events-none` empêche tout blocage de clic

## Fichiers modifiés
- `src/components/chat/ChatArea.tsx`
- `src/components/threads/ThreadView.tsx`
- `src/components/channels/AnnouncementChannel.tsx`

## Résultat
Les messages qui défilent derrière le composant de saisie apparaissent **subtilement floutés** avec un fondu progressif vers le bas, créant un effet "verre dépoli" moderne au lieu d'un fond plat opaque — appliqué à tous les types de salons (Texte, Annonces, Fils).

