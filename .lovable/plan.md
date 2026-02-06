
# Icône Vocale Verte Quand Occupée

## Objectif
Afficher l'icône du salon vocal en vert (`hsl(var(--online))`) lorsqu'au moins un utilisateur est connecté au salon, similaire au comportement existant pour les stages "live".

---

## Analyse de l'existant

### Code actuel (ligne 468)
```tsx
<Icon className={cn("w-4 h-4 flex-shrink-0", isStage && isLiveStage && "text-[hsl(var(--online))]")} />
```

- Les stages utilisent déjà la couleur verte quand ils sont "live"
- Les salons vocaux récupèrent déjà les participants (ligne 432) : `useVoiceParticipants(isVoice ? channel.id : null)`
- La condition `participants.length > 0` est déjà utilisée pour afficher la liste des utilisateurs connectés (ligne 543)

---

## Modification requise

Ajouter une condition pour colorer l'icône vocale en vert quand le salon est occupé.

### Avant
```tsx
<Icon className={cn(
  "w-4 h-4 flex-shrink-0", 
  isStage && isLiveStage && "text-[hsl(var(--online))]"
)} />
```

### Après
```tsx
<Icon className={cn(
  "w-4 h-4 flex-shrink-0", 
  // Icône verte pour stage live OU salon vocal occupé
  (isStage && isLiveStage) && "text-[hsl(var(--online))]",
  (isVoice && participants.length > 0) && "text-[hsl(var(--online))]"
)} />
```

Ou de façon plus concise :
```tsx
<Icon className={cn(
  "w-4 h-4 flex-shrink-0", 
  // Vert quand stage live ou vocal occupé
  ((isStage && isLiveStage) || (isVoice && participants.length > 0)) && "text-[hsl(var(--online))]"
)} />
```

---

## Fichier à modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/components/layout/ChannelList.tsx` | 468 | Ajouter condition `isVoice && participants.length > 0` pour classe verte |

---

## Comportement attendu

| État du salon vocal | Couleur de l'icône |
|--------------------|--------------------|
| Vide (0 participants) | Grise (par défaut) |
| Occupé (≥1 participant) | Verte (`--online`) |

L'icône changera dynamiquement grâce au hook `useVoiceParticipants` qui écoute les changements en temps réel via Supabase Realtime.
