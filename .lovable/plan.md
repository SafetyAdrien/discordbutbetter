

# Refonte Material You — Phase 1 : Layout principal + Navigation

## Vision

Transformer le squelette visuel (ServerList, ChannelList, MemberList, header chat) en style **Material You** : coins très arrondis (20-28px), surfaces élevées avec ombres douces, couleurs dynamiques, espaces généreux, transitions fluides. Tout en préservant 100% de la logique existante (DnD, permissions, realtime, etc.).

## Changements

### 1. `src/index.css` — Fondation visuelle Material You

- Nouvelles variables CSS : `--radius-xl: 1.25rem`, `--radius-2xl: 1.5rem`, `--radius-3xl: 1.75rem`
- Palette ajustée : surfaces plus contrastées avec des élévations (`surface-1`, `surface-2`, `surface-3`)
- Ombres Material : `--shadow-elevation-1` à `--shadow-elevation-3` (ombres douces colorées)
- `.server-icon` : passer de 48px carré arrondi à 56px avec `rounded-[20px]` actif → `rounded-full` inactif (pill → circle morph)
- `.channel-item` : `rounded-2xl`, padding plus généreux, fond élevé au hover avec transition 300ms
- Scrollbar redessinée avec track arrondi semi-transparent
- Nouvelle classe `.surface-card` pour les panneaux Material avec élévation

### 2. `src/components/layout/ServerList.tsx` — Sidebar serveurs Material

- Largeur : 72px → 80px, fond `surface-1` avec séparateur arrondi
- Icônes serveur : 56px, `rounded-full` par défaut, `rounded-[18px]` au hover/actif (morph inverse Discord)
- Indicateur actif : barre latérale remplacée par un **pill highlight** derrière l'icône (fond primaire/10 arrondi)
- Bouton Home : icône dans un cercle avec fond tonal `primary/12`
- Séparateur : capsule arrondie `h-[3px] w-10 rounded-full` avec couleur `surface-3`
- Badges : `rounded-full` avec ombre portée douce
- Boutons + et Compass : fond tonal avec couleur d'accent, `rounded-full`

### 3. `src/components/layout/ChannelList.tsx` — Sidebar salons Material

- Largeur panel : fond `surface-1`, bords arrondis internes
- **Header serveur** : carte Material avec coins `rounded-2xl`, élévation au hover, backdrop-blur sur la bannière
- Popover info serveur : `rounded-3xl` avec ombre Material
- **Barre de recherche** : champ arrondi `rounded-full` avec fond tonal, icône intégrée
- **Catégories** : label en capsule `rounded-xl`, chevron animé avec spring
- **Salons** : items `rounded-xl` avec padding `py-2 px-3`, icône dans un cercle tonal au hover, fond `primary/8` pour l'actif avec indicateur gauche arrondi
- **Fils (threads)** : connecteurs visuels avec coins plus arrondis
- **Voice controls** : section inférieure avec fond `surface-2` et `rounded-t-2xl`
- **User panel** : carte arrondie avec avatar élevé

### 4. `src/components/layout/MemberList.tsx` — Panneau membres Material

- Fond `surface-1`, largeur conservée
- Membres : items `rounded-2xl` au hover, avatar avec ring tonal
- Rôle headers : badge `rounded-full` avec fond tonal de la couleur du rôle
- Statut : indicateur avec bordure plus épaisse et ombre interne
- Séparateur de section : ligne arrondie

### 5. `src/components/chat/ChatArea.tsx` — Header chat Material

- Header : fond `surface-2` avec `rounded-b-2xl` (coins bas arrondis), ombre douce
- Icônes toolbar : boutons `rounded-full` avec fond tonal au hover
- Séparateur date : badge `rounded-full` centré avec fond `surface-2`
- Messages : hover avec fond `surface-1/50` et `rounded-xl`

### 6. `src/pages/Index.tsx` — Structure principale

- Layout flex : gap entre les panneaux (2px) pour laisser respirer
- Zone principale : coins arrondis internes sur les bords de jonction

## Détails techniques

- Toutes les transitions utilisent `cubic-bezier(0.2, 0, 0, 1)` (Material motion)
- Les couleurs tonales sont dérivées de `--primary` avec opacité variable (8%, 12%, 20%)
- Les ombres Material utilisent deux layers : une ombre large diffuse + une ombre serrée
- Le DnD, les context menus, les permissions et le realtime ne sont pas modifiés — seul le rendu visuel change
- Les composants mobiles (MobileLayout, etc.) ne sont PAS modifiés dans cette phase

## Fichiers modifiés

- `src/index.css`
- `src/components/layout/ServerList.tsx`
- `src/components/layout/ChannelList.tsx`
- `src/components/layout/MemberList.tsx`
- `src/components/chat/ChatArea.tsx`
- `src/pages/Index.tsx`

