# Mentions — synchronisation visuelle & restyle Discord-like

## 1. MentionBadge — alignement & animation synchronisés (desktop + mobile)

Problème : sur les icônes de serveur (desktop `ServerList.tsx`, mobile `MobileServersView.tsx`) le badge utilise `absolute -top-1.5 -right-1.5` + `border-2` + `animate-badge-pop`. Quand le `count` passe de 1→2 chiffres (cercle → pilule), la largeur change mais l'ancrage `right` reste fixe : le badge "saute" vers la gauche au moment exact d'un update temps réel.

Correctifs dans `src/components/ui/MentionBadge.tsx` :
- Origine de transform stable : ajouter `origin-center` et `transform-gpu` (évite le sub-pixel jitter sur l'animation pop).
- Garantir un wrapper inline-flex centré qui ne dépend pas du contenu : conserver `h` fixe pour les deux variantes et ajouter `justify-center` + `whitespace-nowrap` + `select-none` + `pointer-events-none` (le badge ne doit jamais intercepter le clic sur l'icône parente).
- Stabiliser la transition : `transition-[min-width,width] duration-150 ease-out` pour que le passage cercle→pilule soit fluide au lieu d'un saut.

Correctifs aux call-sites avec ancrage absolu (`ServerList.tsx` ×2, `MobileServersView.tsx` ×2) :
- Remplacer `-top-1.5 -right-1.5` / `-bottom-1 -right-1` par un ancrage centré qui ne dépend plus de la largeur : wrapper `absolute -top-1 -right-1 flex` + sur le badge `translate-x-1/2 -translate-y-0` (ou utiliser `right-0 translate-x-1/2`) → le centre du badge reste à la même coordonnée quelle que soit la largeur.
- Appliquer rigoureusement les mêmes offsets/`border-2`/`size` entre desktop et mobile pour éviter tout décalage perçu lors d'un switch entre vues.
- Vérifier que `animate-badge-pop` se déclenche uniquement à l'apparition (passage de 0→n) et pas à chaque incrément : ajouter `key={count > 0 ? 'on' : 'off'}` sur le wrapper pour ne remonter l'animation qu'à la première apparition.

## 2. Mention utilisateur par défaut → bleu Discord

Dans `src/components/chat/mentions/MentionComponents.tsx`, `UserMention` (variant `chat`, branche non-self) utilise actuellement `bg-primary/30 text-[#dee0fc] hover:bg-primary` (teinte violet/indigo du thème). Le remplacer par la teinte bleue Discord déjà utilisée dans la variante `bio` :
- Repos : `bg-[rgba(88,101,242,0.15)] text-[#5865F2]`
- Hover : `bg-[rgba(88,101,242,0.3)] text-white`

Conserver toutes les classes mobile (`max-sm:!min-h-0 …`), le tooltip et le `onClick`.

## 3. Self-mention → même teinte bleue (et plus orange)

Toujours dans `UserMention`, la branche `isSelf` utilise actuellement l'orange `#faa61a`. La demande : "même teinte que celle par défaut" → garder la teinte bleue `#5865F2` mais marquer la self-mention par une intensité plus forte + barre latérale gauche (équivalent visuel Discord highlight) :
- `bg-[rgba(88,101,242,0.3)] text-[#5865F2] border-l-2 border-[#5865F2] hover:bg-[rgba(88,101,242,0.5)] hover:text-white`

Aucune autre logique (détection `isSelf`, propagation `currentUserId`) n'est modifiée.

## 4. RoleMention — couleur du rôle dans le texte (Discord-like)

Dans `RoleMention` (`MentionComponents.tsx`), le pill ignore `roleColor`. Le rendre dynamique :
- Couleur du texte = `roleColor` (fallback `#5865F2` si rôle sans couleur ou couleur `#000000`/invalide).
- Fond = même couleur à 10 % d'opacité au repos, 30 % au hover, texte → blanc au hover.
- Implémentation via `style={{ color, backgroundColor: hexToRgba(color, 0.1) }}` + handlers `onMouseEnter/Leave` pour basculer à 30 % et `color: '#fff'` (ou via une classe `group` + variables CSS inline `--mention-color` / `--mention-bg`, puis classes `bg-[var(--mention-bg)] hover:bg-[color:rgb(from_var(--mention-color)_r_g_b_/_0.3)]`). Approche retenue : variables CSS inline pour éviter les handlers JS.
  - `style={{ '--mc': color, '--mcb': hexToRgba(color, 0.1), '--mcbh': hexToRgba(color, 0.3) }}`
  - `className="… text-[color:var(--mc)] bg-[var(--mcb)] hover:bg-[var(--mcbh)] hover:text-white"`
- Ajouter petit helper `hexToRgba(hex, alpha)` local au fichier (ou dans `src/lib/utils.ts` si déjà absent) — accepter `#rgb`, `#rrggbb`, fallback bleu.
- `markdown.tsx` passe déjà `roleColor={roleData?.color || '#99aab5'}` : remplacer le fallback `#99aab5` par `#5865F2` pour cohérence quand un rôle n'a pas de couleur (sinon le texte serait gris au lieu de bleu).

Le `RoleInfoPopup` / Tooltip enveloppant reste inchangé.

## Détails techniques

Fichiers modifiés :
- `src/components/ui/MentionBadge.tsx` — stabilité d'ancrage/animation.
- `src/components/layout/ServerList.tsx` — wrapper d'ancrage centré (2 occurrences).
- `src/components/mobile/MobileServersView.tsx` — idem (2 occurrences).
- `src/components/chat/mentions/MentionComponents.tsx` — restyle `UserMention` (default + self) et `RoleMention` (couleur dynamique).
- `src/lib/markdown.tsx` — fallback couleur rôle `#5865F2`.

Hors scope : pas de changement de logique temps réel (les hooks `useChannelUnreadCounts`, etc. ne sont pas touchés), pas de modification des autres pills (`ChannelMention`, `EveryoneMention`, `SpecialMention`) — seuls user/role/badge sont concernés par la demande.
