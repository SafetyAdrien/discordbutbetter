

# Suppression de la sauvegarde automatique — Bouton de sauvegarde unifié

## Résumé
Remplacer toutes les sauvegardes automatiques (toggles, switches) par un modèle de modifications locales + bouton "Enregistrer" explicite. Les uploads de fichiers (icône, bannière, avatar) restent immédiats car ce sont des actions distinctes.

## Composants concernés

### 1. `ServerProfileSettings.tsx` — FlexibleChannelNamesSection
**Actuellement** : Le toggle `flexible_channel_names` sauvegarde immédiatement via `updateSettings.mutate()`.
**Changement** : Intégrer ce toggle dans le state local `formData` du composant parent. Le bouton "Enregistrer les modifications" existant sauvegardera aussi ce paramètre. Supprimer le sous-composant séparé `FlexibleChannelNamesSection` et l'inliner dans le parent avec un state local. Ajouter une détection `hasChanges` pour ne montrer le bouton save que si nécessaire.

### 2. `PrivacySettings.tsx`
**Actuellement** : Le switch `is_public` appelle `updateServer.mutate()` immédiatement.
**Changement** : Stocker `isPublic` en local sans sauvegarder. Ajouter un bouton "Enregistrer" sticky en bas, visible uniquement quand `isPublic !== server.is_public`. Sauvegarder au clic.

### 3. `EngagementSettings.tsx`
**Déjà correct** : Utilise un state local + bouton save conditionnel. Aucun changement nécessaire.

### 4. `ProfileSettingsTab.tsx` (paramètres utilisateur)
**Actuellement** : Les champs texte ont un bouton save manuel (correct). Avatar/bannière s'uploadent immédiatement (correct, ce sont des fichiers).
**Changement** : Aucun changement majeur nécessaire. Ajouter une détection `hasChanges` pour afficher le bouton save de façon conditionnelle (style sticky comme EngagementSettings).

## Pattern commun du bouton Save

Toutes les pages adopteront le même pattern sticky déjà utilisé dans `EngagementSettings` :

```tsx
{hasChanges && (
  <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
    <Button onClick={handleSave} disabled={isPending} className="w-full">
      {isPending ? <><Loader2 /> Sauvegarde...</> : 'Sauvegarder les modifications'}
    </Button>
  </div>
)}
```

## Fichiers modifiés
- `src/components/server-settings/ServerProfileSettings.tsx` — Intégrer flexible_channel_names dans le formData local, ajouter `hasChanges`, bouton save conditionnel sticky
- `src/components/server-settings/PrivacySettings.tsx` — Supprimer auto-save du toggle, ajouter bouton save conditionnel
- `src/components/account-settings/ProfileSettingsTab.tsx` — Ajouter `hasChanges` et rendre le bouton save conditionnel + sticky

