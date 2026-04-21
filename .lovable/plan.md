

# Refonte mobile des Messages Privés

Refonte complète, mobile-first, accessible et user-friendly de l'interface DM (liste + conversation 1:1 et groupes), inspirée des standards iMessage/WhatsApp tout en restant cohérente avec le langage visuel de l'app.

## Ce que l'utilisateur verra

### 1. Page d'accueil Messages (`MobileHomeView`)

**Header redesigné**
- Titre "Messages" + sous-titre dynamique ("12 conversations · 3 non lues")
- Avatar utilisateur à gauche (tap → profil)
- Actions à droite : Recherche · Nouveau message · Créer un groupe
- Hauteur agrandie pour respirer (56px)

**Barre de recherche persistante**
- Sous le header, plein largeur, placeholder "Rechercher une conversation…"
- Filtre instantané : nom, @username, dernier message
- Bouton clear (×)

**Pills de filtres** (sticky)
- `Tous` · `Non lus` (badge rouge) · `Groupes` · `Favoris`
- Badge compteur sur "Non lus"

**Liste organisée en sections**
- ⭐ **Favoris** — amis favoris épinglés (réutilise `useFavoriteFriendIds`)
- 📅 **Aujourd'hui** — conversations actives < 24h
- **Cette semaine**
- **Plus ancien**
- Tri par dernier message dans chaque section
- Si filtre ≠ "Tous" : liste plate triée par récence

**Cards de conversation enrichies**
- Avatar 52px avec ring de statut coloré (online/idle/dnd/offline) + badge "groupe" pour les groupes (icône superposée)
- Display name en bold + custom_status si présent
- Aperçu dernier message avec préfixe auteur ("Toi: …" ou "Alice: …")
- Indicateur "📎 Pièce jointe" / "🎤 Audio" / "📷 Image" quand applicable
- Timestamp à droite (compact + couleur primaire si non lu)
- Badge non lu rond à droite (style Discord)
- Indicateur "frappe en cours…" en temps réel sous le nom (remplace l'aperçu)
- État muet : icône cloche barrée discrète

**Interactions natives**
- **Tap** → ouvre la conversation
- **Swipe-left** révèle 2 actions : 🔕 Mute (toggle) | 🗑️ Archiver
- **Swipe-right** : Marquer comme lu (haptic success)
- **Long-press** (500ms) → bottom sheet `MobileDMActionSheet` : Voir profil · Appel vocal · Appel vidéo · Mettre en favori · Marquer (non) lu · Couper notifications · Bloquer · Supprimer la conversation

**FAB Nouveau message** (existant, repositionné)
- Position respect safe-area, avec libellé contextuel "Nouveau"
- Long-press → "Créer un groupe" en raccourci

**État vide**
- Illustration + CTA "Démarre une conversation"

**Pull-to-refresh** (existant) — préservé

### 2. Conversation (`DMConversation` mobile)

**Header tappable enrichi**
- Avatar 40px + ring statut + badge "appel actif" si en cours
- Display name + sous-ligne dynamique :
  - "En ligne" / "Inactif depuis 5min" / "Vu il y a 2h"
  - "frappe en cours…" pendant la frappe (anim)
  - "3 membres" pour les groupes
- Tap → ouvre `DMUserInfoPanel` en bottom sheet
- Actions à droite : 📞 Appel · 🎥 Vidéo · ⋮ Plus (épinglés, recherche, médias, mute, bloquer)

**Messages style bulles**
- **Mes messages** : alignés à droite, bulle primaire arrondie (`rounded-2xl rounded-br-md`)
- **Messages reçus** : alignés à gauche, bulle surface-2 (`rounded-2xl rounded-bl-md`)
- **Groupes** : avatar petit + nom au-dessus de la 1ère bulle d'une rafale
- Regroupement intelligent (rafales < 5min sans avatar répété)
- Date sticky en haut du scroll (Aujourd'hui, Hier, 12 mars)
- Timestamp sous la bulle au tap (révélé) + accusé de réception (✓ envoyé, ✓✓ lu)

**Réactions inline**
- Pill compact sous la bulle, tap pour toggle, long-press pour ouvrir le viewer

**Pièces jointes**
- Images en grid arrondi (max 4 visibles + "+N")
- Audio : waveform + bouton play
- Liens : embed compact

**Swipe-to-reply renforcé** (existant `SwipeToReplyRow`)
- Seuil augmenté + haptic au franchissement + icône reply qui glisse

**Long-press message**
- Ouvre `UniversalMessageActions` en bottom sheet (existant) : Répondre · Réagir · Copier · Épingler · Modifier · Supprimer · Signaler

**Indicateur de frappe**
- Bulle "…" animée à gauche, avec avatar mini

**Galerie médias** (nouveau)
- Action "Médias" dans le ⋮ → bottom sheet plein écran avec grid de toutes les images/vidéos partagées

**Input message**
- Sticky en bas, respect safe-area + clavier visuel (`useVisualViewport`)
- Bouton + (pièces jointes), emoji, micro (audio futur), envoi
- Comportement Enter = nouvelle ligne, envoi via bouton (cf. memory existante)

**Accessibilité globale**
- Tous les boutons ≥ 44×44px
- `aria-label` complet sur les actions icônes
- Haptics : `selection` au swipe, `light` au tap action, `success` à l'envoi/lu
- Respect `prefers-reduced-motion` (pas d'anim de bulles si activé)
- Contraste AAA sur timestamps et compteurs

## Détails techniques

**Fichiers créés**
- `src/components/mobile/dm/MobileDMHomeView.tsx` — refonte de `MobileHomeView`
- `src/components/mobile/dm/MobileDMConversation.tsx` — wrapper mobile autour des hooks existants, rendu bulles
- `src/components/mobile/dm/MobileDMListItem.tsx` — card swipeable réutilisable
- `src/components/mobile/dm/MobileDMActionSheet.tsx` — bottom sheet long-press
- `src/components/mobile/dm/MobileDMHeader.tsx` — header tappable conversation
- `src/components/mobile/dm/MobileMessageBubble.tsx` — composant bulle avec regroupement
- `src/components/mobile/dm/MobileDMMediaGallery.tsx` — galerie médias plein écran

**Fichiers modifiés**
- `src/components/mobile/MobileHomeView.tsx` — délègue à `MobileDMHomeView`
- `src/components/mobile/MobileLayout.tsx` — route le rendu DM mobile vers le nouveau composant (DMConversation desktop reste intact)

**Données — hooks réutilisés**
- `useDMConversations`, `useDMMessages`, `useUnreadCounts`, `useTypingIndicator`, `useFavoriteFriendIds`, `useDMMessageReactions`, `useDMPinnedMessages`, `useDMCalls`
- Aucune nouvelle migration DB

**Mute / Archive**
- État stocké en `localStorage` côté client dans un premier temps (`dm-muted:userId`, `dm-archived:userId`) — clé : Set<conversationId>
- Permet d'éviter une migration immédiate ; migration possible plus tard vers `dm_user_settings`

**Bucketing par activité**
- `useMemo` sur `conversations` triées par `lastMessage.created_at`
- Buckets : favoris (croisé avec `useFavoriteFriendIds`), <24h, <7j, plus ancien

**Groupement de messages (rafales)**
- Calcul `useMemo` : même auteur + < 5 min depuis le précédent → masquer avatar + nom
- Premier de rafale : afficher avatar + display_name (groupes uniquement)

**Swipe**
- Réutilise pattern de `SwipeToReplyRow` / `MobileFriendCard` (touch events, seuil 80px, rubber-band)
- Lock direction après 8px pour préserver scroll vertical

**Long-press**
- Hook existant `useLongPress` (500ms, scroll-tolérant)

**Frappe en temps réel**
- `useTypingIndicator(null, conversationId)` (existant) → exposer dans la liste DM via un nouveau petit hook `useDMTypingMap()` qui s'abonne à un canal Realtime global "typing" filtré par conversation_id

**Statut de présence**
- `useProfilesRealtime` (existant) garantit la mise à jour du ring statut en live

**Performance**
- `useMemo` sur le bucketing/filtrage
- Pas de virtualisation (listes typiquement < 200 items)
- Rendu conditionnel : DMConversation desktop intacte, le composant mobile ne se monte que si `isMobile`

**Aucune modification DB requise.**

