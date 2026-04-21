

# Modernisation des icônes (Mobile / Tablette / Desktop) + conteneur emoji/stickers

Refonte visuelle cohérente : tous les icônes adoptent un style **moderne, plein, arrondi** sur les 3 plateformes, et le picker emoji/autocollants reçoit un nouveau conteneur premium (sections rapides, catégories visuelles, animations).

## Ce que l'utilisateur verra

### A. Système d'icônes unifié

**Avant** : icônes Lucide en trait fin (stroke 2, caps droits), inconsistance avec les Streamline déjà filled.

**Après** : 
- **Stroke arrondi** partout (`stroke-linecap: round`, `stroke-linejoin: round`)
- **Stroke épaissi** (2.25 par défaut) pour un rendu plus présent
- **Variante "filled"** automatique pour les icônes d'état (actives, sélectionnées, primaires)
- **Tailles standardisées** : `xs` 14px · `sm` 16px · `md` 20px · `lg` 24px · `xl` 28px
- **Coins doux** sur tous les boutons d'icônes (passage à `rounded-2xl`/`rounded-full` selon contexte)
- **Conteneurs colorés doux** (icône sur pastille `bg-primary/10`) pour les actions principales

**Composant central** : `<Icon />` wrapper qui prend un icône Lucide + une variante (`outline` | `filled` | `duotone`) et applique le style global.

**Application visible** :
- **Bottom nav mobile** : icônes plus rondes, version filled quand actif (style iOS/Material You)
- **Voice controls** (mic, casque, raccrocher) : pastilles circulaires plus généreuses
- **Message input** : actions (+, image, sondage, gif, sticker, emoji, send) en cercles doux
- **Header conversation** : appel/vidéo/menu en boutons ronds remplis
- **DM list** : icônes statut/groupe/mute avec rendu plein
- **Sidebar serveurs/canaux** : hash, voix, megaphone — déjà Streamline, harmonisés (même épaisseur, même radius optique)
- **Modals/dialogs** : close (×) toujours rond, retour (‹) avec stroke arrondi

### B. Conteneur Emoji & Stickers — refonte premium

**Layout repensé** :
- Header avec **2 onglets segmentés** (pill toggle) au lieu de tabs basiques : `😀 Emojis` · `🎨 Autocollants`
- Compteur d'emojis disponibles à droite ("324 emojis · 12 du serveur")

**Recherche améliorée** :
- Barre arrondie pleine largeur, icône search filled, chip "Effacer" quand rempli
- Recherche réelle (filtrage par nom, alias) — actuellement le filtrage retourne tous les emojis
- État "Aucun résultat" illustré

**Navigation rapide par catégories**
- **Barre verticale** à gauche (desktop) ou **scrollable horizontale** sticky en haut (mobile) avec icône par catégorie : 🕐 Récents · 😀 Smileys · 🐶 Animaux · 🍔 Nourriture · ⚽ Sport · 🚗 Transport · 💡 Objets · 🔣 Symboles · 🏳️ Drapeaux + 🌟 Serveur
- Tap = scroll instantané vers la section
- Active : pastille primary avec icône fill

**Récents & Fréquents**
- Nouvelle section "Récemment utilisés" (12 derniers, persistés en `localStorage`)
- Affichée en premier
- Clear via bouton "Effacer l'historique"

**Grille emoji modernisée**
- Tailles harmonisées : 36×36 (mobile) / 32×32 (desktop)
- Tap haptic léger
- Hover : zoom subtil + tooltip avec nom
- Long-press emoji du serveur (mobile) : prévisualisation en plein écran

**Onglet Autocollants**
- Grille 3 colonnes (mobile) / 4 (desktop) avec aspect-square
- Vignette plus grande, padding plus aéré, ombre douce au hover
- État vide illustré (sticker icon filled, message + lien vers paramètres serveur si admin)

**Conteneur global**
- Mobile : Drawer arrondi haut (`rounded-t-3xl`), poignée visible
- Desktop : Popover avec `rounded-2xl`, ombre `shadow-elevation-3`, largeur 380px
- Animation d'apparition douce (fade + slide-up)
- Respect `prefers-reduced-motion`

### C. Cohérence cross-plateforme

- Mêmes tailles d'icônes par contexte sur mobile/tablette/desktop (la pastille s'adapte)
- Mêmes radius (mappés sur les tokens `--radius-*` existants)
- Mêmes haptics sur mobile
- Mêmes états hover/active/disabled

## Détails techniques

**Fichiers créés**
- `src/components/ui/icon.tsx` — wrapper `<Icon icon={Heart} variant="filled" size="md" />` ; encapsule Lucide + applique `strokeWidth=2.25`, `strokeLinecap="round"`, `strokeLinejoin="round"` ; pour `variant="filled"` ajoute `fill="currentColor"` quand l'icône le supporte (cœur, étoile, etc.) ou bascule sur la version solide quand disponible
- `src/lib/icon-config.ts` — tokens centralisés (tailles, stroke widths, classes de pastille)
- `src/components/chat/emoji-picker/EmojiPickerHeader.tsx` — onglets segmentés + recherche
- `src/components/chat/emoji-picker/EmojiCategoryNav.tsx` — barre catégories (vertical desktop, horizontal mobile)
- `src/components/chat/emoji-picker/EmojiGrid.tsx` — grille avec virtualisation simple par section
- `src/components/chat/emoji-picker/StickerGrid.tsx` — grille stickers
- `src/components/chat/emoji-picker/useRecentEmojis.ts` — hook localStorage (clé `recent-emojis`, 24 max, dédoublonnage)

**Fichiers modifiés**
- `src/components/chat/EmojiStickerPicker.tsx` — refonte complète, orchestre les nouveaux sous-composants
- `src/index.css` — règles globales pour `.lucide` : `stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round;` (override par défaut, sans casser les usages explicites)
- `src/components/mobile/MobileBottomNav.tsx` — icônes filled quand actif (variantes Lucide solides ou cn fill class)
- `src/components/layout/VoiceControls.tsx` — pastilles agrandies, radius doublé
- `src/components/chat/MessageInput.tsx` — boutons d'action en cercles uniformes (même taille tactile 36×36)
- `src/components/mobile/dm/MobileDMHeader.tsx` — actions header en pastilles circulaires
- `src/components/dm/DMConversation.tsx` (header desktop) — même cohérence

**Approche globale (sans toucher 146 fichiers)**
- L'override CSS sur `.lucide` (classe injectée par lucide-react sur chaque SVG) applique automatiquement le stroke arrondi à TOUS les usages existants
- Les fichiers modifiés sont uniquement ceux où on veut **plus** que le stroke arrondi (pastilles, fill, taille spéciale)
- Aucune migration ni refactor de masse nécessaire

**Performance**
- Pas de nouveaux paquets ; on continue sur lucide-react
- `useRecentEmojis` : lectures synchrones localStorage, écriture debounced
- Catégorie sticky sur scroll : `IntersectionObserver` (un seul observer par picker)

**Accessibilité**
- `aria-label` sur tous les boutons d'icône
- Contraste AA minimum sur les pastilles
- Navigation clavier : flèches dans la grille emoji, Escape ferme, Enter sélectionne
- Touch targets ≥ 44×44 px sur mobile

**Aucune migration DB requise.**

