

# Supprimer le double header des salons Annonces sur mobile

## Problème

Sur mobile, les salons d'annonces affichent **deux headers** :
1. Le header de `MobileChatView` (ligne 107) — avec bouton retour, icône, nom du salon, et tous les boutons d'action
2. Le header interne de `AnnouncementChannel` (ligne 402) — avec icône, nom, bouton Suivre, notifications, threads, etc.

Les salons texte n'ont pas ce problème car `ChatArea` n'a pas de header propre.

## Solution

Ajouter une prop `hideHeader` à `AnnouncementChannel`. Quand `true`, le header interne (lignes 402-600+) est masqué. Le bouton "Suivre" sera déplacé dans le header de `MobileChatView` pour les salons d'annonces.

### Fichiers modifiés (3)

**1. `src/components/channels/AnnouncementChannel.tsx`**
- Ajouter `hideHeader?: boolean` à `AnnouncementChannelProps`
- Entourer le bloc header desktop d'un `{!hideHeader && (...)}` conditionnel

**2. `src/components/mobile/MobileLayout.tsx`**
- Passer `hideHeader` à `<AnnouncementChannel hideHeader />` dans le `renderCustomContent`

**3. `src/components/mobile/MobileChatView.tsx`**
- Pour les salons de type `announcement`, ajouter le bouton "Suivre" dans le header mobile existant (à côté des autres boutons d'action), en utilisant le même style que sur desktop

