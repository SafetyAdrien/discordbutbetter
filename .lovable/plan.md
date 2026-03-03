

# Aperçu Markdown en temps réel dans les bios

## Contexte

Les champs bio (profil global dans `ProfileSettingsTab.tsx` et profil serveur dans `ServerProfileEditModal.tsx`) doivent afficher un aperçu Markdown en temps réel. Le modal serveur a déjà un aperçu basique via `parseMarkdown`, mais le profil global n'en a pas du tout. Les deux doivent supporter : **gras**, *italique*, `code`/```blocs```, > citations, et [liens masqués](url).

La fonction `parseMarkdown` dans `src/lib/markdown.tsx` supporte déjà tous ces formats — aucun changement nécessaire côté parser.

## Changements

### 1. `src/components/account-settings/ProfileSettingsTab.tsx`

Ajouter un aperçu markdown live sous le `<Textarea>` de la bio (après ligne 186), identique au pattern du modal serveur :
- Importer `parseMarkdown` depuis `@/lib/markdown`
- Quand `formData.bio` n'est pas vide, afficher un bloc d'aperçu avec `parseMarkdown(formData.bio)`
- Style : `bg-muted/50 border border-border rounded-md p-2` avec label "Aperçu :"
- Également remplacer la preview statique de la bio dans la card (ligne 122-124) par `parseMarkdown(formData.bio)` au lieu du texte brut

### 2. `src/components/profile/ServerProfileEditModal.tsx`

L'aperçu existe déjà (lignes 231-238). Aucun changement nécessaire — il utilise déjà `parseMarkdown`.

### Fichiers modifiés
- `src/components/account-settings/ProfileSettingsTab.tsx` — ajout import `parseMarkdown` + aperçu live sous la bio + rendu markdown dans la card preview

