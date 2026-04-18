

## Problèmes identifiés

### Bug #1 — Pièces jointes invisibles dans `AnnouncementChannel`
Le mapping des messages (lignes 188-218) **force `attachments: []`** au lieu de propager les pièces jointes réelles depuis la base. De plus, le rendu (lignes 905, 980) n'inclut **aucun appel à `<MessageAttachments />`**. Conséquence : aucune image/PDF/vidéo n'est affichée après envoi.

### Bug #2 — Système de fil non rendu (`[SYSTEM:THREAD_CREATED:...]` brut)
Le mapping ne propage pas non plus le flag **`is_system`** depuis la base. La vérification `(message as any).is_system` (ligne 652) renvoie donc toujours `undefined`, et le message système est rendu comme du texte brut au lieu de l'embed `ThreadSystemMessage`.

### Bug #3 — Choix Public/Privé indésirable pour les fils d'annonce
Le `CreateThreadModal` propose un toggle "Thread privé" même dans les salons d'annonce. Or par nature, une annonce diffuse publiquement et son fil doit l'être aussi.

---

## Solution

### Fix #1 et #2 — `src/components/channels/AnnouncementChannel.tsx`

**A. Mapping des messages (lignes 188-218)** :
- Remplacer `attachments: []` par `attachments: (m.attachments as any) || []`
- Ajouter `is_system: (m as any).is_system || false` dans l'objet retourné

**B. Rendu des pièces jointes** :
- Importer `MessageAttachments` et `StoredAttachment` depuis `@/components/chat/MessageAttachments`
- Sous le `<MarkdownText />` aux lignes 906 et 981, ajouter :
  ```tsx
  {(message as any).attachments?.length > 0 && (
    <MessageAttachments attachments={(message as any).attachments as StoredAttachment[]} />
  )}
  ```

### Fix #3 — `src/components/channels/AnnouncementChannel.tsx`

Ajouter une prop `forcePublic` au `CreateThreadModal` :
```tsx
<CreateThreadModal
  ...
  forcePublic
  ...
/>
```

### Fix #3 (suite) — `src/components/threads/CreateThreadModal.tsx`

- Ajouter `forcePublic?: boolean` à l'interface
- Si `forcePublic === true` : masquer entièrement le bloc Switch "Thread privé" et forcer `isPrivate = false` à l'envoi
- Dans le cas `forcePublic`, ajouter un sous-titre informatif : *"Les fils créés dans un salon d'annonce sont toujours publics."*

---

## Fichiers modifiés
1. `src/components/channels/AnnouncementChannel.tsx` — mapping `attachments` + `is_system`, rendu `<MessageAttachments />`, prop `forcePublic` sur le modal
2. `src/components/threads/CreateThreadModal.tsx` — prop `forcePublic` qui masque le toggle de confidentialité

## Résultat
- ✅ Images, vidéos et PDF s'affichent correctement après envoi dans les salons d'annonce
- ✅ Les fils créés via une annonce affichent l'embed cliquable `ThreadSystemMessage` (plus de `[SYSTEM:THREAD_CREATED:...]` brut)
- ✅ Aucun choix Public/Privé proposé dans les salons d'annonce — toujours public par défaut

