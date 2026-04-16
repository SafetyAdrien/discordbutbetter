

# Plan : Rôle @everyone protégé + Import de serveur Discord

## 1. Rôle @everyone — Protection complète

### Problèmes actuels
- Le rôle `@everyone` (`is_default`) peut être déplacé via drag-and-drop
- Le RoleEditor désactive certains champs via `role.is_default` mais la couleur est aussi désactivée (l'utilisateur veut pouvoir la modifier)

### Corrections dans `RoleManager.tsx`
- Exclure le rôle `is_default` du `SortableContext` (ou le rendre `disabled` dans le sortable, ce qui est déjà fait via `canDragAbove` mais pas suffisant)
- Empêcher tout autre rôle d'être déplacé **en dessous** du rôle `@everyone` : dans `handleDragEnd`, si la position cible placerait un rôle après `@everyone` (dernier), bloquer le drop
- Le rôle `@everyone` doit toujours rester en dernière position dans la liste

### Corrections dans `RoleEditor.tsx`
- Quand `role.is_default` :
  - Nom : `disabled` (déjà fait)
  - Couleur : **activée** (retirer `disabled={role.is_default}` des inputs couleur)
  - Description, icône, hoist : `disabled` (déjà fait)
  - Permissions : modifiables (déjà fait)
- Le `hasChanges` et `handleSave` restent fonctionnels pour permettre la modification de couleur + permissions

## 2. Import de serveur Discord

### Nouveau flow dans `CreateServerModal.tsx`
- Ajouter un bouton "Importer un serveur" dans l'étape `choice` (entre "Créer le mien" et "Rejoindre un serveur")
- Nouvel étape `step = 'import-source'` : choix entre "Discord" (et "Fluxer" grisé/coming soon)
- Nouvel étape `step = 'import-discord'` : 
  - Input pour le lien `discord.new/TEMPLATE_ID` ou directement l'ID du template
  - Bouton "Récupérer" qui appelle l'API publique Discord `https://discord.com/api/v10/guilds/templates/{code}` via une edge function (pour éviter CORS)
  - Affiche un aperçu : nom du serveur, liste des salons par catégorie, liste des rôles
  - Bouton "Finaliser" qui crée le serveur avec les catégories, salons et rôles importés

### Nouvelle edge function `import-discord-template`
- Reçoit le template code/URL
- Fetch `https://discord.com/api/v10/guilds/templates/{code}` (API publique, pas de token requis)
- Retourne la structure : nom, description, catégories, salons (nom + type), rôles (nom + couleur + permissions mappées)

### Mapping des types de salons Discord → Fluxer
- `0` (GUILD_TEXT) → `text`
- `2` (GUILD_VOICE) → `voice`
- `5` (GUILD_ANNOUNCEMENT) → `announcement`
- `15` (GUILD_FORUM) → `forum`
- Autres → `text` par défaut

### Création effective
- Après "Finaliser", utiliser `useCreateServer` avec un nouveau paramètre `importData` contenant les catégories, salons et rôles à recréer
- Ou directement créer le serveur puis insérer les catégories/salons/rôles dans `CreateServerModal` comme le fait déjà le template system

## Fichiers modifiés
- `src/components/server-settings/RoleManager.tsx` — protection drag @everyone
- `src/components/server-settings/RoleEditor.tsx` — autoriser couleur pour @everyone
- `src/components/modals/CreateServerModal.tsx` — nouveau flow import
- `supabase/functions/import-discord-template/index.ts` — nouvelle edge function
- `src/hooks/useServers.ts` — support import data dans create server

