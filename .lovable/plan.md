## Ajustement de l'anneau doré d'anniversaire

### Problème
Sur `MobileProfileView` (via "Vous"), l'anneau doré autour de la PdP est visible mais **beaucoup trop épais**. Il envahit visuellement l'avatar au lieu d'être un liseré discret.

### Cause
Dans `src/components/profile/BirthdayAvatarCrown.tsx`, l'anneau utilise :
- `inset-[-4px]` (déborde de 4px vers l'extérieur)
- masque radial `calc(50% - 3px)` → `calc(50% - 2px)` (épaisseur ~3px)
Total visuel : ~4px d'épaisseur, ce qui est trop lourd sur des avatars 96–112px en mobile.

### Correctif
Réduire massivement l'épaisseur à un fin liseré doré (~1.5px) :
- `inset-[-2px]` au lieu de `inset-[-4px]`
- masque radial `calc(50% - 1.5px)` → `calc(50% - 0.5px)` (épaisseur ~1px visible)

Ajuster l'icône Gift en conséquence pour qu'elle reste posée sur le tracé fin :
- `top-[-5px]` au lieu de `top-[-6px]`
- Taille icône réduite à 10px (au lieu de 12px) pour rester proportionnée au fin liseré
- Garder le `drop-shadow` doré pour la lisibilité

### Question en suspens (à trancher après cet ajustement)
Tu m'as dit ne voir l'anneau **nulle part ailleurs** sur mobile. Une fois l'épaisseur corrigée, on ira vérifier :
- listes de membres, DM, messages en salon, éditeur de profil
- probable cause : ancêtres `overflow-hidden` qui clippent l'anneau, ou avatars qui n'utilisent pas `UserAvatarImage`

Mais commençons par l'ajustement d'épaisseur pour avoir une base visuelle correcte avant de chasser les endroits manquants.

### Fichier touché
- `src/components/profile/BirthdayAvatarCrown.tsx`
