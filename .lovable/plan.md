

# Restructurer le header serveur : icones integrees + menu rapide parametres

## Resume

Repositionner les icones `UserPlus` et `ChevronDown` dans le header a cote du nom du serveur (opposes, avec espacement). Le nom du serveur ouvre uniquement la carte serveur. La fleche ouvre un menu compact listant les pages de parametres pour y acceder en un clic. Sur mobile, ce menu a une hauteur maximale avec scroll.

## Modifications

### 1. Desktop - `src/components/layout/ChannelList.tsx`

**Header (lignes ~1184-1350)** :

- Le bouton du nom du serveur reste un `PopoverTrigger` qui ouvre la carte serveur (PopoverContent existant)
- **Retirer** les boutons d'action (Creer une invitation, Parametres, Profil, Emojis, etc.) du PopoverContent de la carte serveur -- la carte redevient informative uniquement
- Ajouter a **droite** du nom du serveur (dans le header, alignes a l'oppose) deux icones cote a cote avec espacement :
  - `UserPlus` : ouvre le modal d'invitation (`setInviteChannelId('server')`)
  - `ChevronDown` : enveloppe dans un **nouveau Popover** qui affiche un menu compact listant toutes les pages de parametres serveur (Profil, Engagement, Boost, Emojis, Stickers, Soundboard, Membres, Roles, Invitations, Integrations, Audit Log, Bannis, Template, Supprimer). Chaque item appelle `onOpenServerSettings?.('tab_id')` directement

**Structure du header resultante** :
```text
[Nom du serveur (-> carte)]  [espace flexible]  [UserPlus]  [ChevronDown (-> menu parametres)]
```

Le menu du ChevronDown est un Popover avec les sections groupees (comme dans `ServerSettingsModal`), chaque item cliquable amenant directement a la page correspondante.

### 2. Mobile - `src/components/mobile/MobileChannelListView.tsx`

**Meme logique** sur les 3 variantes de header (banner, non-banner, embedded) :

- Le nom du serveur (`ServerProfileSheet` trigger) ouvre la carte serveur (Sheet) -- inchange
- `UserPlus` : ouvre le modal d'invitation -- inchange
- `ChevronDown` : au lieu d'appeler `onOpenSettings` directement, l'envelopper dans un **Popover** qui affiche le meme menu de pages de parametres
- Le Popover mobile aura une **hauteur maximale** (`max-h-[60vh]`) avec `overflow-y-auto` pour eviter de prendre trop de place sur l'ecran

### 3. Carte serveur nettoyee

**Desktop** (`ChannelList.tsx` PopoverContent, lignes ~1296-1346) : Supprimer la section "Actions bar" (Separator + boutons Creer invitation / Parametres / Profil / Emojis / Stickers / Soundboard). La carte n'affiche plus que les infos (banniere, nom, description, date, fondateur, membres, emojis).

**Mobile** (`MobileChannelListView.tsx` ServerProfileSheet) : La carte reste en l'etat (elle a deja ses propres actions de creation).

## Detail technique du menu parametres (Popover ChevronDown)

Le menu reutilisera les memes sections que `ServerSettingsModal` :

| Section | Items |
|---|---|
| Serveur | Profil, Engagement, Boost |
| Expressions | Emojis, Stickers, Soundboard |
| Personnes | Membres, Roles, Invitations |
| Apps | Integrations |
| Moderations | Audit Log, Bannis |
| -- | Template, Supprimer (style danger) |

Chaque item a son icone + label. Au clic, le Popover se ferme et `onOpenServerSettings?.('tab_id')` est appele.

Largeur du menu : `w-56` (desktop), `w-52` (mobile). Hauteur max mobile : `max-h-[60vh] overflow-y-auto`.

## Fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/layout/ChannelList.tsx` | Restructurer header + nettoyer carte serveur + ajouter Popover menu parametres |
| `src/components/mobile/MobileChannelListView.tsx` | Remplacer le bouton ChevronDown par un Popover menu parametres avec max-height |

