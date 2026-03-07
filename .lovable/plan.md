

# Remplacer le menu déroulant ChevronDown par un engrenage d'accès direct aux paramètres

## Changement

Remplacer les 4 instances du `Popover` + `ChevronDown` + `ServerSettingsQuickMenu` par un simple bouton engrenage (`Settings` icon de lucide-react) qui ouvre directement le modal des paramètres serveur (sans tab spécifique, donc le comportement par défaut).

## Fichiers modifiés

### `src/components/layout/ChannelList.tsx` (1 instance)
- Lignes ~1527-1543 : Remplacer le `<Popover>` entier par un `<button>` avec icône `Settings` qui appelle `onOpenServerSettings?.()` directement (sans argument = tab par défaut)

### `src/components/mobile/MobileChannelListView.tsx` (3 instances)
- Lignes ~439-450 (banner visible) : Remplacer le Popover par un bouton `Settings` appelant `onOpenSettings?.('')`
- Lignes ~470-481 (no banner) : Idem
- Lignes ~495-506 (embedded) : Idem
- Supprimer le state `settingsPopoverOpen` devenu inutile
- Retirer les imports `Popover`, `PopoverContent`, `PopoverTrigger`, `ServerSettingsQuickMenu`, `ChevronDown` si plus utilisés

L'icône `Settings` (engrenage) est déjà importée dans `MobileChannelListView.tsx`. Pour `ChannelList.tsx`, il faudra vérifier/ajouter l'import.

