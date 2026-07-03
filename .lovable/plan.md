## Constat

En regardant à nouveau la vidéo image par image :
- Frame 5–6 : l'utilisateur est dans le modal Paramètres → onglet Apparence, il clique sur le bouton "Try it out".
- Frame 7+ : **le modal Paramètres se ferme entièrement**, et le side sheet "Customize your theme" apparaît sur la droite par-dessus l'interface principale de l'app (channel list, chat, member list).

Donc le comportement correct est : clic sur « Personnaliser » → fermer le modal des paramètres → ouvrir le side sheet.

Actuellement le sheet s'ouvre par-dessus le modal, ce qui n'est pas conforme.

## Changements

### 1. `src/components/account-settings/AccountSettingsModal.tsx`
- Créer et exporter un contexte léger `AccountSettingsContext` (`{ close: () => void }`).
- Wrapper le contenu rendu du modal avec `<AccountSettingsContext.Provider value={{ close: onClose }}>`.
- Exporter un hook `useAccountSettings()` qui renvoie ce contexte (ou `null` si utilisé hors modal).

### 2. `src/components/appearance/CustomThemeBanner.tsx`
- Consommer `useAccountSettings()`.
- Au clic sur la bannière / touche Enter :
  1. `ctx?.close()` — ferme le modal paramètres.
  2. `requestAnimationFrame(() => setOpen(true))` — ouvre le sheet après la fermeture.
- Le side sheet est déjà monté via `createPortal(document.body)` donc il survit à la fermeture du modal parent (aucun bug de démontage).

### 3. `src/components/appearance/CustomThemeSheet.tsx`
- Aucun changement structurel.
- Vérifier simplement que la fermeture du modal parent n'empêche pas la ré-ouverture du modal après clic sur "Retour/Fermer" — comme le sheet est portalisé et son état vit dans le composant `<CustomThemeBanner>` qui, lui, n'est plus monté après fermeture du modal → **il faut déplacer le montage du sheet dans un endroit toujours vivant**.

### 4. Nouveau composant `src/components/appearance/CustomThemeSheetHost.tsx` (obligatoire)
- Fournit un store global léger (`openCustomThemeSheet()` / `useCustomThemeSheetOpen()`).
- Monté une seule fois dans `src/App.tsx` (à côté de `CustomThemeTintLayer`).
- Rend `<CustomThemeSheet open={…} onOpenChange={…} />` en permanence, sous protection d'auth.
- La bannière appelle simplement `openCustomThemeSheet()` après `ctx?.close()`.

### 5. `src/App.tsx`
- Monter `<CustomThemeSheetHost />` à l'intérieur de `AuthProvider` (là où vit déjà `CustomThemeTintLayer`).

### 6. Finalisation "Partager"

L'encodage (`encodeCustomTheme`), le stripping du marker dans `markdown.tsx`, et le rendu de `ThemeCardEmbeds` dans `SmartLinkEmbeds` sont déjà en place.

Ajustements de finition :
- **`ShareCustomThemeDialog.tsx`** :
  - Ajouter les DMs (1-1 et groupes) en source d'envoi possible, sous une section "Messages privés" en tête de liste. Requête sur `dm_conversations` where l'utilisateur est membre. Sélection stockée séparément (`selectedDms: Set<string>`). Insertion via `dm_messages`.
  - Après envoi réussi, refermer le sheet parent aussi (`onOpenChange(false)` déjà OK) et afficher un toast avec bouton "Voir" qui navigue vers le premier salon/DM choisi.
  - Vérifier que le payload d'insertion respecte le schéma actuel de `messages` (déjà OK d'après `useMessages`).
- **`ThemeCardEmbed.tsx`** : ajouter une pastille "✓ Appliqué" persistante quand le thème est déjà actif (déjà géré) + tooltip "Cliquez pour prévisualiser" (petit `title` sur le bouton). Rien de plus.

Le pipeline est ainsi complet : marker encodé côté envoi → marker retiré du texte affiché → carte "Appliquer" rendue sous le message → clic applique le thème via `applySharedTheme` (déjà exporté).

## Fichiers touchés
- `src/components/account-settings/AccountSettingsModal.tsx` (contexte + Provider)
- `src/components/appearance/CustomThemeBanner.tsx` (utilise le contexte et le host global)
- `src/components/appearance/CustomThemeSheetHost.tsx` (nouveau)
- `src/App.tsx` (monter le host)
- `src/components/appearance/ShareCustomThemeDialog.tsx` (DMs + toast)

Aucune migration DB requise.
