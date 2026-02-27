

# Support SVG et fichiers volumineux pour les icones de salons

## Probleme actuel
Le composant `ChannelOverview.tsx` limite les uploads a :
- **Types** : PNG, JPEG, WEBP, GIF uniquement (pas de SVG)
- **Taille** : 1 Mo maximum

## Changements

### `src/components/channel-settings/ChannelOverview.tsx`

1. **Ajouter SVG aux types acceptes** : Ajouter `image/svg+xml` dans la liste `validTypes` et dans l'attribut `accept` du champ file input.

2. **Augmenter la limite de taille** : Passer de 1 Mo a 10 Mo pour supporter les fichiers volumineux.

3. **Mettre a jour les messages d'erreur** pour refleter les nouveaux formats et la nouvelle limite.

### Detail technique

```typescript
// Avant
const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
if (file.size > 1024 * 1024) { // 1 Mo

// Apres
const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
if (file.size > 10 * 1024 * 1024) { // 10 Mo
```

Et l'attribut `accept` du input :
```html
accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
```

Un seul fichier modifie, 3 lignes changees.
