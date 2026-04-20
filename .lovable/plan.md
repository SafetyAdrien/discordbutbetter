

## Objectif

Restructurer la zone de saisie de `MessageInput.tsx` : le **textarea occupe toute la largeur** sur sa propre ligne, et les **boutons (+, Sticker, Emoji, Send) deviennent une barre d'actions en dessous, alignée à droite**. Plus de disposition horizontale — tout passe en colonne à l'intérieur du conteneur arrondi `bg-input`.

## Structure visuelle cible

```text
┌──────────────────────────────────────────────────┐
│ Envoyer un message dans #Lisez-moi               │  ← textarea pleine largeur
│                                                   │
├──────────────────────────────────────────────────┤  ← séparateur subtil border-border/40
│ ⊕                              🏷️  😊   ➤        │  ← barre d'actions
└──────────────────────────────────────────────────┘
```

- `+` reste à gauche de la barre d'actions
- `Sticker`, `Emoji`, `Send` restent groupés à droite
- Le textarea déborde verticalement comme aujourd'hui (min 44px, max 200px)
- L'overlay Markdown reste parfaitement aligné sur le textarea (mêmes paddings)
- L'autocomplete de mentions, la zone d'attachements, le slowmode et l'état "follow bar / permission denied" restent inchangés

## Changements (un seul fichier)

**`src/components/chat/MessageInput.tsx`** — remplacer le bloc lignes ~557–671 :

1. Le wrapper principal passe de `flex items-stretch gap-2` à `flex flex-col w-full`.
2. **Bloc 1 — textarea** : sortir le `<div className="relative flex-1 ...">` du flex horizontal, le placer en haut, occuper toute la largeur avec un padding interne (`px-4 pt-3 pb-2` desktop, `px-3 pt-2 pb-1.5` compact).
3. **Bloc 2 — barre d'actions** : nouvelle `<div className="flex items-center justify-between px-2 py-1.5 border-t border-border/40">` contenant :
   - Gauche : le `<Popover>` `+` existant
   - Droite : `<div className="flex items-center gap-0.5">` avec `Sticker`, `Emoji`, `Send`
4. Conserver `bg-[hsl(var(--input))] border border-border/50 rounded-2xl` et `boxShadow: var(--shadow-elevation-2)` sur le conteneur global.
5. Adapter les classes du textarea : retirer `pr-1` / `pr-2` (plus besoin de réserver la place pour les boutons à droite), conserver `min-h-[44px] max-h-[200px]` et la logique d'auto-resize.
6. Ajuster `InputMarkdownOverlay` : retirer `pr-1` / `pr-2`, garder les paddings verticaux.

## Détails de comportement préservés

- **Auto-resize** du textarea (`adjustTextareaHeight`) : inchangé
- **Sync overlay scroll** ↔ textarea scroll : inchangé
- **Mention autocomplete** : se positionne au-dessus du textarea, donc compatible avec la nouvelle structure (rien à changer)
- **Send button** : reste conditionnel (apparaît si `value.trim() || attachments.length > 0 || isMobile`), mais reste dans la barre du bas — sur mobile il était déjà toujours visible
- **Compact mode** (utilisé dans threads/DM) : applique aussi la nouvelle structure verticale, paddings réduits
- **Permission denied / Follow bar** : aucun changement (early returns indépendants)
- **Focus ring removal**, hover states, font-ginto : inchangés

## Garantie « ne casse rien »

- Aucune prop, aucune signature, aucun hook modifié
- AttachmentStagingArea reste au-dessus du conteneur (inchangé)
- `CreatePollModal` et tous les handlers (`handleSendMessage`, `handlePaste`, `handleKeyDown`) inchangés
- Auto-focus global Discord-style (`handleGlobalKeyDown`) inchangé
- Le `compact` prop continue de s'appliquer aux paddings et tailles d'icônes

## Fichier modifié

- `src/components/chat/MessageInput.tsx` (refactor du JSX du conteneur principal — lignes 557 à 671)

