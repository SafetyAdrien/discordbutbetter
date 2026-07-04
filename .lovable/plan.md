Je vais corriger uniquement le placement des badges, sans modifier les icônes de copie.

Plan d’implémentation :

1. Profil Desktop / Tablette
- Retirer la barre de badges du conteneur qui contient le nom d’affichage, le @username et les pronoms.
- Placer `InlineBadgeStrip` dans la zone visuelle du header, sous la bannière et à l’opposé de la photo de profil : avatar à gauche, badges à droite.
- Conserver l’affichage responsive avec un nombre adapté de badges selon mobile/tablette/desktop.

2. Profil Mobile
- Retirer `InlineBadgeStrip` du bloc identité où se trouvent le nom, le @username et les icônes de copie.
- Remettre les icônes de copie à leur place en ne modifiant pas leurs boutons, icônes, handlers, tailles ou classes.
- Ajouter les badges dans le header mobile, sous la bannière et à droite, en face de la photo de profil à gauche.

3. Logique du badge anniversaire
- Garder la logique existante qui affiche virtuellement le badge anniversaire le jour concerné, même si le badge n’a pas encore été enregistré manuellement.
- Ne pas modifier la base de données ni les autres badges.

4. Vérification
- Vérifier que les badges sont visibles hors du bloc identité sur desktop, tablette et mobile.
- Vérifier que les icônes de copie n’ont pas été déplacées ni modifiées.