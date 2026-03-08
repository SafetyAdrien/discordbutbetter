

# Aligner les couleurs de tous les types de salons sur le salon Textuel

## Problème
Le salon textuel (`ChatArea`) utilise le design Material You avec :
- Container : `bg-[hsl(var(--surface-2)/0.3)]`
- Header : `bg-[hsl(var(--surface-2))]` + `borderBottom: 1px solid hsl(var(--border) / 0.5)` + `boxShadow: var(--shadow-elevation-1)` + `borderRadius: 0 0 var(--radius-xl) var(--radius-xl)`

Les autres salons utilisent encore `bg-background`, `border-b border-border`, ou `bg-[#151723]`.

## Fichiers et changements

### 1. AnnouncementChannel.tsx
- **L434** : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`
- **L436** : header — supprimer `border-b border-border/50 bg-[#151723]`, appliquer style surface-2 + shadow + radius via `style={{}}`

### 2. ForumChannel.tsx
- **L44** : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`
- **L45** : header — supprimer `border-b border-border`, appliquer `bg-[hsl(var(--surface-2))]` + style inline (shadow + radius)

### 3. MediaChannel.tsx
- **L96** : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`
- **L107** : header — supprimer `border-b border-border`, appliquer style surface-2 + shadow + radius

### 4. TasksChannel.tsx
- **Container** : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`
- **Header** : supprimer `border-b border-border`, appliquer style surface-2 + shadow + radius

### 5. CalendarChannel.tsx
- **L53** : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`
- **L54** : header — supprimer `border-b border-border`, appliquer style surface-2 + shadow + radius

### 6. StageChannel.tsx
- **L194** (état sans session) : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`, header L196 → style surface-2 + shadow + radius
- **L226** (état principal) : `bg-background` → `bg-[hsl(var(--surface-2)/0.3)]`, header L228-230 → appliquer surface-2 base + shadow + radius (en gardant la logique conditionnelle pour le mode live)

### 7. ThreadView.tsx
- **L382** : `bg-card` → `bg-[hsl(var(--surface-2)/0.3)]`
- **L384** : header — supprimer `border-b border-border`, appliquer `bg-[hsl(var(--surface-2))]` + style inline (shadow + radius)

### 8. VoiceChannelChat.tsx
- **L175** : header — supprimer `border-b border-white/10`, appliquer `bg-[hsl(var(--surface-2))]` + style inline (shadow + radius)

## Style header standardisé (appliqué partout)

```tsx
className="h-12 px-3 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full"
style={{
  borderBottom: "1px solid hsl(var(--border) / 0.5)",
  boxShadow: "var(--shadow-elevation-1)",
  borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
}}
```

**8 fichiers modifiés — aucun nouveau fichier.**

