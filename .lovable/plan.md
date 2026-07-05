## Ajustements de l'anneau d'anniversaire

**Problème:** les tailles ne sont pas proportionnelles selon le contexte (nav "Vous" vs profil), et l'icône Gift doit passer en rouge.

### 1. `BirthdayAvatarCrown.tsx` — rendre l'anneau et l'icône proportionnels à l'avatar

Actuellement l'anneau utilise des valeurs en pixels fixes (`inset-[-1px]`, mask `0.75px`, icône `size={7}`), ce qui rend le rendu identique quelle que soit la taille de l'avatar — d'où l'effet "trop gros sur grand avatar / à peine visible sur petit".

Passer en unités **relatives** via des CSS custom properties, avec valeurs par défaut, et exposer une prop `size` optionnelle:

- Épaisseur anneau: `~4%` du diamètre de l'avatar (env. 1px sur 24px, 4px sur 96px)
- Offset: `~2%` du diamètre
- Icône Gift: `~14%` du diamètre (env. 3px sur 24px, 13px sur 96px)
- Position icône: `top: -6%` du diamètre

Techniquement: utiliser `inset-[-2%]` et un mask `radial-gradient(circle, transparent calc(50% - 3%), #000 calc(50% - 1%))` pour que l'épaisseur suive la taille du parent. Pour l'icône Gift, utiliser une taille en `em` basée sur `font-size` calculé depuis la taille du parent (ou une prop `avatarPx`).

Approche simple retenue: **prop optionnelle `avatarSizePx`** (fallback: measure via ref au premier render) qui pilote:
- `ringThickness = max(1, avatarSizePx * 0.035)` px
- `iconSize = max(6, avatarSizePx * 0.16)` px
- `iconTop = -(iconSize * 0.55)` px

### 2. Couleur de l'icône Gift → **rouge**

Remplacer `text-[#f5b301]` et le `drop-shadow` doré par:
- `text-[#ef4444]` (rouge tailwind red-500)
- `drop-shadow-[0_0_2px_rgba(239,68,68,0.55)]`

L'anneau doré (conic-gradient) reste doré — seule l'icône devient rouge.

### 3. Opacité de l'anneau

Actuellement `opacity-70`. Passer à `opacity-100` (max) pour être bien visible partout.

### 4. `UserAvatarImage.tsx` — passer la taille de l'avatar au Crown

Mesurer la taille rendue de l'avatar via un `ref` + `ResizeObserver` (ou lire `clientWidth` après mount) et transmettre `avatarSizePx` à `<BirthdayAvatarCrown />`. Cela garantit que:
- Dans `MobileBottomNav` "Vous" (petit avatar ~28-32px): anneau et icône minuscules mais visibles
- Dans `MobileProfileView` (avatar 96px `w-24 h-24`): anneau fin proportionnel, icône Gift lisible

Aucun autre fichier touché — la correction est centralisée dans ces 2 composants.

### Résultat attendu

- Nav "Vous": anneau très fin (~1px) rouge/or bien visible (opacité 100%), petit Gift rouge
- Profil "Vous": anneau fin proportionnel (~3-4px), Gift rouge lisible (~15px), rendu équilibré
