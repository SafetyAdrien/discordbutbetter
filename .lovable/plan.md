

## Problèmes à corriger

1. **API Tenor obsolète** — Tenor v1 a été fermée par Google. Tenor v2 nécessite une clé Google Cloud avec activation de "Tenor API". L'utilisateur indique qu'il n'y a plus d'API → on **retire complètement** le bouton GIF du composer (ou le remplace par un upload de `.gif` standard).

2. **Image d'en-tête mal placée** — Sur la maquette (Image 4), le bouton "ajouter image d'en-tête" est une **grande tuile carrée (~80×80px) positionnée AU-DESSUS** des champs Titre/Message, pas en ligne à gauche d'eux. Quand une image est ajoutée, elle remplit cette tuile en aperçu plein.

## Solution

### 1. Retirer Tenor
- Supprimer le bouton GIF du `AnnouncementComposer`.
- Supprimer le composant `GifPicker.tsx`.
- Supprimer l'edge function `tenor-search/index.ts` (et son entrée dans `supabase/config.toml` si présente).
- Le bouton 📎 (Paperclip) accepte déjà `image/gif` via `image/*` → suffisant pour partager des GIFs.

### 2. Refondre le layout du composer (fidèle à Image 4)

```
┌──────────────────────────────────────────────────────┐
│ ┌──────┐                                              │
│ │  🖼+ │   ← grande tuile (80×80, rounded-lg)        │
│ └──────┘                                              │
│                                                       │
│  Title (optional)         ← gras, large               │
│  Message #publish         ← placeholder dynamique     │
│                                                       │
│  [📎] [😊]                              [Send ▸]     │
└──────────────────────────────────────────────────────┘
```

**Comportement de la tuile d'en-tête :**
- Vide : icône `ImagePlus` centrée, fond `bg-background/60`, hover assombri.
- Click : ouvre un `<input type=file accept="image/*">` séparé (`headerImageInputRef`).
- Une fois sélectionnée : la tuile montre l'aperçu de l'image (`object-cover`), avec un petit bouton ✕ en haut-à-droite pour la retirer.
- L'image d'en-tête est gérée séparément des autres attachments (state local `headerImage: File | null`) puis injectée en première position dans `attachments` au moment de l'envoi.

**Ajustements :**
- Retirer le bouton image-add inline (anciennement à gauche des inputs).
- Le bouton 📎 (footer gauche) reste pour les pièces jointes additionnelles (PDF, vidéos, autres images).
- Footer simplifié : `[📎] [😊]` à gauche, `[Send ▾]` à droite (toggles inchangés).

### 3. Intégration de l'image d'en-tête à l'envoi
- Au submit : si `headerImage` existe, créer un `PendingAttachment` correspondant et le placer en première position du tableau passé à `sendMessage`.
- Reset après envoi (`setHeaderImage(null)`).

## Fichiers

**Modifiés :**
- `src/components/channels/announcement/AnnouncementComposer.tsx` — nouveau layout (tuile en-tête en haut), suppression bouton GIF, état `headerImage`.

**Supprimés :**
- `src/components/channels/announcement/GifPicker.tsx`
- `supabase/functions/tenor-search/index.ts`

## Résultat
Composer fidèle à la maquette Image 4 : tuile d'image d'en-tête proéminente en haut à gauche, champs Titre/Message dessous, footer minimal `[📎] [😊]` → `[Send ▾]`. Plus aucune dépendance à Tenor.

