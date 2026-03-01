
# Ameliorations UI: Arrondis, Carte serveur, Mobile

## 1. Arrondir les angles sur l'interface (Mobile et Desktop)

Ajout de coins arrondis (`rounded-xl` / `rounded-2xl`) sur les elements principaux :

**Fichiers concernes :**
- `src/components/layout/ChannelList.tsx` : Header du serveur (ligne ~1183), popover carte serveur (ligne ~1221)
- `src/components/layout/MemberList.tsx` : Container principal (ligne ~646), barre de recherche
- `src/components/chat/ChatArea.tsx` : Zone de chat principale
- `src/components/mobile/MobileChatView.tsx` : Header mobile (ligne ~73)
- `src/components/mobile/MobileChannelListView.tsx` : Headers, boutons
- `src/index.css` : Ajouter des variables CSS pour les rayons d'arrondi globaux si necessaire

**Modifications :**
- Headers : `rounded-b-xl` sur les barres superieures
- Popovers/cartes : `rounded-2xl` et `overflow-hidden`
- Boutons d'action : `rounded-xl`
- Zone de saisie : deja `rounded-2xl` sur mobile, verifier coherence desktop

---

## 2. Carte de serveur : Separation nom / fleche + Icone invitation

### 2a. Icone d'invitation a cote du nom du serveur (Desktop)

**Fichier :** `src/components/layout/ChannelList.tsx` (lignes ~1182-1220)

Actuellement, le header du serveur est un seul bouton qui ouvre un Popover contenant la carte ET les raccourcis de parametres.

**Nouvelle logique :**
- Le **nom du serveur** (cliquable) ouvre **uniquement la carte de profil du serveur** (banniere, icone, description, membres, emojis)
- La **fleche ChevronDown** (bouton separe) ouvre **le menu des parametres du serveur** (Parametres, Profil, Emojis, Stickers, SoundBoard)
- A cote du nom, ajouter une **icone UserPlus** (ou `Users` avec un `+`) parfaitement alignee au centre verticalement, qui ouvre la modale `CreateInviteModal`

**Implementation :**
- Separer le `<Popover>` actuel en deux elements :
  1. Zone cliquable "nom du serveur" → Popover avec carte de profil (banniere, icon, description, date creation, proprietaire, membres, emojis)
  2. Bouton "invite" (icone UserPlus) → Ouvre `CreateInviteModal`
  3. Bouton ChevronDown → Popover avec les raccourcis de parametres (Parametres serveur, Profil, Emojis, Stickers, SoundBoard, Quitter)

### 2b. Meme logique sur Mobile

**Fichier :** `src/components/mobile/MobileChannelListView.tsx` (lignes ~368-423)

- Le **nom du serveur** ouvre le `ServerProfileSheet` (deja en place)
- La **fleche ChevronDown** ouvre un menu separement avec les options de parametres
- Ajouter l'icone d'invitation a cote du nom

---

## 3. Mobile : Corriger la section liste des membres

**Fichier :** `src/components/mobile/MobileChatView.tsx` (lignes ~104-165)

Problemes actuels :
- Les icones d'action (Notifications, Pin, Threads) sont dans le `SheetContent` au-dessus de la MemberList, mais peuvent etre mal organisees
- Le MemberList occupe tout l'espace sans padding/arrondis propres

**Corrections :**
- Reorganiser les icones d'action dans une barre proprement alignee avec espacement uniforme
- Ajouter des libelles courts sous les icones ou des tooltips pour la clarte
- Arrondir les coins du Sheet (`rounded-t-2xl`)
- S'assurer que la MemberList utilise un `ScrollArea` propre avec padding adequat

---

## 4. Mobile : Barre de recherche avancee sous la banniere

**Fichier :** `src/components/mobile/MobileChannelListView.tsx`

Ajouter une barre de recherche sous la banniere/nom du serveur, avec un systeme de filtrage avance similaire a celui deja implemente dans `MemberList.tsx` (lignes ~103-197).

**Fonctionnalites :**
- Barre de recherche avec icone loupe
- Au focus, affichage d'un dropdown avec les options de filtrage (de:, mentions:, contient:, dans:, pendant:, avant:, apres:, epingle:, auteur:)
- Navigation clavier (fleches + Tab pour selectionner un filtre)
- Les filtres sont cumulables (ex: `de:alice dans:#general`)
- Resultats affiches dans un panel deroulant

**Implementation :**
- Reutiliser le composant `SearchFilters` deja existant dans `MemberList.tsx`
- Extraire `SearchFilters` et la logique de filtrage dans un composant partage (`src/components/ui/search-with-filters.tsx`)
- Integrer la barre de recherche entre le header et la liste des salons dans `MobileChannelListView`

---

## Detail technique des fichiers a modifier

| Fichier | Modifications |
|---|---|
| `src/components/layout/ChannelList.tsx` | Separer le header en 3 zones (nom → carte, invite → modal, fleche → parametres). Arrondir les angles. |
| `src/components/mobile/MobileChannelListView.tsx` | Separer nom/fleche, ajouter icone invitation, ajouter barre de recherche avancee sous la banniere |
| `src/components/mobile/MobileChatView.tsx` | Corriger layout du Sheet des membres, arrondir, reorganiser icones |
| `src/components/layout/MemberList.tsx` | Arrondir les angles du container |
| `src/components/ui/search-with-filters.tsx` | Nouveau composant : barre de recherche reutilisable avec filtres avances |
| `src/index.css` | Ajustements CSS globaux pour les arrondis si necessaire |
