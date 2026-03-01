
# Refactorer le modal de modification de salon

## Objectif
Aligner le `ChannelSettingsModal` sur le meme pattern que le `EditCategoryModal` : utiliser `ResponsiveModal` au lieu d'un `Dialog` brut + gestion mobile custom, et appliquer le meme spacing (`px-1` sur les tabs, `p-4` sur le contenu).

## Changements

### Fichier : `src/components/channel-settings/ChannelSettingsModal.tsx`

1. Remplacer l'import de `Dialog/DialogContent/DialogHeader/DialogTitle` et la gestion mobile manuelle par `ResponsiveModal`
2. Supprimer les imports inutiles (`ChevronLeft`, `X`, `useBreakpoint`)
3. Simplifier la structure : un seul rendu avec `ResponsiveModal` qui gere automatiquement desktop (Dialog) et mobile (Drawer)
4. Appliquer `px-1` au `TabsList` et `p-4` au conteneur scrollable du contenu des tabs, comme dans `EditCategoryModal`

### Structure finale (simplifiee)

```text
ResponsiveModal
  +-- Loading spinner (si chargement)
  +-- Tabs
       +-- TabsList (grid-cols-3, px-1)
       +-- Contenu scrollable (p-4)
            +-- TabsContent "overview"
                 +-- ChannelOverview
                 +-- ChannelDangerZone
            +-- TabsContent "permissions"
            +-- TabsContent "integrations"
  +-- Message "Salon introuvable" (si erreur)
```

### Details techniques

- Le titre du modal inclura l'icone du type de salon + "Parametres de {nom}"
- Le composant passera de ~120 lignes (avec duplication mobile/desktop) a ~50 lignes
- Le `ResponsiveModal` gere deja le responsive (Dialog sur desktop, Drawer sur mobile)
- L'etat `activeTab` commencera a `'overview'` au lieu de pouvoir etre `null` (plus besoin de navigation 2 niveaux sur mobile)
