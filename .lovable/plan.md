Déplacer la bande de badges (`InlineBadgeStrip`) du rangée avatar/bannière vers juste au-dessus de la première section d'infos du profil mobile, avec un léger espacement entre les deux.

### Modifications

1. `src/components/mobile/MobileProfileView.tsx`
   - Retirer le `<InlineBadgeStrip ... />` actuellement dans le bloc avatar (ligne ~233), en gardant la mise en page de l'avatar et du bouton de statut intacte.
   - Insérer le `<InlineBadgeStrip userId={profile?.id} max={4} className="..." />` juste au-dessus de la première section `<section className="mx-4 mt-4 rounded-2xl bg-card ...">` (ligne ~257), avec un léger `mb-2` ou `mb-3` pour créer l'espacement demandé.
   - Aligner la bande à droite ou à gauche selon la cohérence visuelle du profil mobile (conserver `justify-end` pour rester alignée avec l'ancien placement à droite).

### Non concerné
- Les versions desktop (`FullUserProfileModal`, `UserProfilePopup`) restent inchangées.
- Le tooltip du badge anniversaire reste tel que récemment simplifié (nom uniquement).
- Les icônes de copie dans la section restent à leur place.