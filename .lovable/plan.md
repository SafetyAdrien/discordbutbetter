

## Plan

Déplacer le bouton chevron (réduire le composer) du footer vers le coin **haut-droit** du composer d'annonce, en mode étendu uniquement.

### Changement
Dans `AnnouncementComposer.tsx` :
1. **Retirer** le bouton `ChevronDown` actuellement dans la barre footer (entre Emoji et Send).
2. **Ajouter** un petit bouton `ChevronDown` positionné en absolute en haut-droite du composer (coin supérieur droit), avec :
   - `position: absolute; top: 8px; right: 8px; z-index: 10`
   - Icône `ChevronDown` (16-18px), couleur `text-muted-foreground hover:text-foreground`
   - Background subtil au hover (`hover:bg-background/60`)
   - Désactivé si `hasContent` (cohérence avec comportement actuel — empêche réduction si du contenu est en cours de rédaction)
   - Tooltip "Réduire" / "Effacez le contenu pour réduire"
3. Ajuster légèrement le padding-top de la zone header (`p-3 pb-2 → pt-3 pr-10` ou équivalent) pour éviter que la tuile d'image d'en-tête se chevauche avec le bouton.

### Mode réduit
Inchangé — le bouton `ChevronUp` reste à droite de la barre compacte.

### Fichier modifié
- `src/components/channels/announcement/AnnouncementComposer.tsx`

### Résultat
Le chevron de réduction est désormais discret en haut-droite du composer (comme un bouton "minimize" classique), libérant la barre footer pour les actions principales (📎, 😊, Send).

