## Correction de l'emplacement des badges

### Ce qui a été mal compris
J'ai placé les badges + le bouton copier **à l'intérieur** de la carte « Identity », alignés à droite du `display_name`. Or la demande était :
- Les badges vont **au-dessus** de la section Display name (donc dans la zone hero, pas dans la carte identity).
- Aligné **à l'opposé** du bloc identité (donc à droite du hero, en face de l'avatar).
- **Juste au-dessus de l'icône copier-coller** du username/DisplayName (donc badges empilés au-dessus du bouton copier, ensemble en haut à droite du hero).

### Nouvel emplacement — dans le hero (banner)

Structure cible de la section hero du `FullUserProfileModal` :

```text
+----------------------------------------------------------+
|  [ banner image ]                          🎂 ⭐ ✨ +2    |  <- badges strip
|                                              [copy icon]  |  <- copy username
|                                                           |
|  [avatar]                       [ Message ] [ Ajouter ]   |  <- existing row
+----------------------------------------------------------+
```

- **Retirer** la colonne badges + copier de la carte Identity (retour au layout d'origine : display_name + @username plein largeur).
- **Ajouter** dans la section hero, en `absolute top-2 right-3`, un `<div className="flex flex-col items-end gap-1.5 z-20">` contenant :
  - `<InlineBadgeStrip userId={user.id} max={4} />` — strip inline avec fond translucide (`bg-black/40 backdrop-blur-sm rounded-full px-2 py-1`) pour rester lisible sur n'importe quelle bannière.
  - Bouton copier `@username` (`variant="secondary"`, `size="icon"`, `h-7 w-7`, même fond translucide) avec toast « Nom d'utilisateur copié ».

### Responsive

- **Mobile 360px** : `right-3 top-2`, `max={3}` sur mobile via un plafond dynamique (composant `InlineBadgeStrip` accepte déjà `max`, on passe `useBreakpoint`-conditionnel : 3 sur mobile, 4 sur tablette, 5 sur desktop). `flex-wrap justify-end` sur la strip pour absorber un overflow inattendu.
- **Tablette/desktop** : même position, plus d'espace, plus de badges visibles.
- Sur `!isOwnProfile`, les boutons Message/Ajouter existent déjà en bas de la même section — les badges au top-right ne se chevauchent pas car ils sont sur une ligne différente (top vs bottom du hero).
- Sur `isOwnProfile`, aucun bouton action en bas → badges + copier restent seuls en top-right, cohérent.

### Fichiers touchés

- `src/components/profile/FullUserProfileModal.tsx` :
  - Ajouter l'overlay hero top-right (badges + copier).
  - Retirer la colonne droite ajoutée dans la carte Identity, restaurer le layout précédent.
- `src/components/badges/InlineBadgeStrip.tsx` :
  - Nouvelle prop optionnelle `variant?: 'plain' | 'overlay'` pour styler avec fond translucide quand posé sur une image (utilisée dans le hero).
  - `flex-wrap justify-end` pour la sécurité.

Aucune migration, aucune écriture DB, aucun impact ailleurs.
