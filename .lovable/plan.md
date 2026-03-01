
# Ajouter la modification d'un salon sur mobile (appui long)

## Principe

Reproduire le meme pattern que les categories : un appui long (500ms) sur un salon dans la liste mobile ouvre un Popover avec l'option "Modifier le salon", qui ouvre le `ChannelSettingsModal` existant (deja compatible mobile avec son interface fullscreen).

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Ajouter un state** pour le salon appuye long :
   - `longPressedChannelId` (string | null)
   - `editingChannelId` (string | null)

2. **Ajouter un import** de `Settings` (deja importe) et `ChannelSettingsModal`

3. **Modifier le rendu des salons** (lignes 430-451 et 359-379) : envelopper chaque bouton de salon dans un `Popover` avec les handlers d'appui long (meme pattern que les categories), proposant "Modifier le salon"

4. **Ajouter le `ChannelSettingsModal`** en bas du composant quand `editingChannelId` est defini

### Detail technique

Pour chaque salon (dans les categories ET les orphelins), le bouton existant sera enveloppe dans un `Popover` :

```text
Popover (open = longPressedChannelId === ch.id)
  PopoverTrigger -> bouton du salon avec longPressHandlers
  PopoverContent -> bouton "Modifier le salon" (icone Settings)
```

Au clic sur "Modifier le salon" :
- Fermer le popover (`setLongPressedChannelId(null)`)
- Ouvrir le modal (`setEditingChannelId(ch.id)`)

Le `ChannelSettingsModal` s'affiche en fullscreen sur mobile (comportement deja implemente).

### Imports a ajouter

- `ChannelSettingsModal` depuis `@/components/channel-settings/ChannelSettingsModal`
- `Settings` depuis `lucide-react` (deja importe)
