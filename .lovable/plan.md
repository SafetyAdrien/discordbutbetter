

# Plan de corrections multi-points

## 1. Double-clic pour le mode Focus (grille vocale)

**Fichier**: `src/components/channels/voice/VoiceParticipantGrid.tsx`

Les screen shares (lignes 306-324) utilisent encore `onClick` pour le focus. Passer en `onDoubleClick`. Les participants avec caméra et sans caméra utilisent déjà `onDoubleClick` (OK). Seule la section screen shares dans la vue normale doit être corrigée.

Aussi, dans la bande de vignettes en mode focus (lignes 222-282), les boutons utilisent `onClick` pour changer le focus -- c'est correct car on est déjà en mode focus.

---

## 2. Layout grille responsive pour streams + participants

**Fichier**: `src/components/channels/voice/VoiceParticipantGrid.tsx`

Actuellement `getScreenGridClass` est basique. Améliorer :
- 1 stream : pleine largeur, aspect-video
- 2 streams : `grid-cols-2`
- 3+ streams : `grid-cols-2 lg:grid-cols-3`
- Participants : quand il y a des streams, utiliser une grille compacte en bas. Quand il n'y a pas de streams, centrer en grille responsive adaptée.

Affiner `getFullGridClass` et `getParticipantGridClass` pour un meilleur rendu à toutes tailles.

---

## 3. Corriger l'écoute entre membres (WebRTC audio)

**Fichier**: `src/utils/webrtc/PeerConnection.ts`

Le problème probable : `ontrack` ne distingue pas correctement les streams audio des streams vidéo. Vérifier :
- `setupEventHandlers` -- comment `ontrack` identifie le type de track
- Si l'audio est bien ajouté au PeerConnection avant l'offre
- Si `addAudioStream` ajoute les tracks correctement

**Fichier**: `src/utils/webrtc/MediaManager.ts`
- Vérifier que `addRemoteAudioStream` crée et joue bien l'`<audio>` element
- Vérifier l'interaction avec `AudioContext` (autoplay policy)

Besoin de lire plus de `PeerConnection.ts` pour diagnostiquer, mais le flux semble correct : `audio.autoplay = true` + `audio.play()`. Le problème pourrait être lié à l'autoplay policy du navigateur (Chrome/Firefox bloquent l'autoplay sans interaction utilisateur). Solution : ajouter un `resume()` sur l'AudioContext après un geste utilisateur, et retenter `audio.play()` en cas d'échec.

---

## 4. Flash du chatInput (permissions au reload)

**Fichiers**: `src/hooks/useUserChannelPermissions.ts`, `src/components/chat/ChatArea.tsx`, `src/components/channels/AnnouncementChannel.tsx`

Le problème : `useMultipleChannelPermissions` retourne `cached ?? true` pendant `isPending`. Si c'est le premier chargement (pas de sessionStorage), la permission est `true` par défaut, puis bascule à `false` quand la RPC répond.

**Solution** : Au lieu de `cached ?? true`, utiliser `cached ?? undefined` et traiter `undefined` comme "en chargement" dans le composant. Côté composant, ne pas afficher le chatInput tant que la permission n'est pas résolue (afficher un skeleton ou un placeholder neutre). Alternativement, exposer `isLoading` depuis le hook et montrer un état indéterminé.

Changements :
- `useMultipleChannelPermissions` : ajouter `isLoading` (déjà exposé). Le composant doit l'utiliser.
- `ChatArea.tsx` et `AnnouncementChannel.tsx` : quand `isLoading && !isAdminOrOwner`, afficher un placeholder "Chargement..." au lieu de l'input complet. L'admin/owner bypasse toujours.

---

## 5. Mobile : chatInput Announcement au même niveau que TEXT

**Fichier**: `src/components/channels/AnnouncementChannel.tsx` (lignes 923-959)

Le conteneur d'input utilise `<div className="flex-shrink-0 bg-background w-full">` sans padding mobile. Le `MessageInput` gère déjà le padding mobile via `isMobile ? "px-1.5 pt-0.5 pb-[calc(0.125rem+env(safe-area-inset-bottom,0px))]" : "px-4 py-3"`. Vérifier que le composant `AnnouncementChannel` passe bien à `MessageInput` les bons props et que le wrapper externe n'ajoute pas de padding conflictuel.

Le vrai problème est que `AnnouncementChannel` est encapsulé dans `FullScreenWrapper` sur mobile, qui a son propre header. L'input devrait avoir un padding similaire au `MobileChatView`.

**Solution** : Uniformiser le padding du wrapper input dans `AnnouncementChannel` pour le mobile (ajouter `px-2 pb-[env(safe-area-inset-bottom)]` ou similaire).

---

## 6. Mobile : Header Announcement = même que TEXT

**Fichier**: `src/components/mobile/MobileLayout.tsx`

Actuellement l'`AnnouncementChannel` est dans un `FullScreenWrapper` qui n'a qu'un back button + nom. Remplacer par un rendu similaire au `MobileChatView` avec les icônes Notif, Members, Threads dans le header.

**Solution** : Créer un cas `'announcement'` dédié dans `renderChannelContent` qui utilise `MobileChatView` (ou un wrapper similaire avec les bons icônes) au lieu de `FullScreenWrapper + AnnouncementChannel`. Alternativement, passer `AnnouncementChannel` dans un wrapper mobile dédié avec le header correct.

Pour simplifier : le cas `'announcement'` peut rendre le même header que `MobileChatView` avec seulement Notif, Members, Threads, et le contenu `AnnouncementChannel` en dessous.

---

## 7. Mobile : Topic dans la MemberList

**Fichier**: `src/components/mobile/MobileChatView.tsx` (lignes 232-256)

Dans le `SheetContent` des membres, ajouter le topic (`channel.description`) juste après le header, séparé de la liste des membres par un `Separator`.

---

## 8. Mobile : Bouton "Suivre" à côté de "Edit Channel"

**Fichier**: `src/components/channels/AnnouncementChannel.tsx`

Le bouton "Suivre" doit apparaître sur l'interface mobile à côté du bouton "Edit Channel" (s'il existe). Actuellement le bouton est dans le header desktop. Sur mobile (via `FullScreenWrapper`), il n'apparaît pas.

La solution est liée au point 6 : quand on crée le bon header mobile pour Announcement, inclure le bouton "Suivre".

---

## Fichiers à modifier

1. `src/components/channels/voice/VoiceParticipantGrid.tsx` — Double-clic screen shares + layout responsive
2. `src/utils/webrtc/PeerConnection.ts` — Diagnostic audio (besoin de lire plus)
3. `src/utils/webrtc/MediaManager.ts` — Autoplay fix pour l'audio
4. `src/hooks/useUserChannelPermissions.ts` — Exposer mieux l'état loading
5. `src/components/chat/ChatArea.tsx` — Utiliser isLoading pour le chatInput
6. `src/components/channels/AnnouncementChannel.tsx` — Utiliser isLoading + padding mobile
7. `src/components/mobile/MobileLayout.tsx` — Header announcement mobile
8. `src/components/mobile/MobileChatView.tsx` — Topic dans la MemberList

