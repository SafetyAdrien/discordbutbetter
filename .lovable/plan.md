## Contexte
Le fichier `src/components/chat/RepliedLine.tsx` contient actuellement trois composants : `ReplyLine`, `RepliedContent`, et `RepliedLine` (wrapper). L'utilisateur demande de séparer davantage `ReplyLine` pour pouvoir le sélectionner et l'importer indépendamment, **sans déplacer son rendu visuel d'un seul pixel**.

## Objectif
Refactorer le fichier `RepliedLine.tsx` en le divisant en trois fichiers dédiés, tout en préservant le rendu, les styles, les props, et la compatibilité des imports existants.

## Étapes

### 1. Créer `src/components/chat/ReplyLine.tsx`
- Extraire l'interface `ReplyLineProps` et le composant `ReplyLine`.
- Garder les styles inline et les classes Tailwind identiques (`absolute`, `pointer-events-none`, `text-border/70`, `data-reply-line`, `reply-line`).
- Garder la logique SVG inchangée (`left`, `top: 8`, `width`, `height: 26`, `viewBox`, `path d`).

### 2. Créer `src/components/chat/RepliedContent.tsx`
- Extraire l'interface `RepliedContentProps`, le composant `RepliedContent`, et les helpers `cleanPreview` / `describeAttachments`.
- Garder `MAX_PREVIEW_CHARS = 64`.
- Préserver tous les styles, les classes conditionnelles, et le rendu de l'avatar, du pseudo, du badge rôle, et du preview/attachment.
- Garder `data-replied-content` et `className="replied-content"`.

### 3. Mettre à jour `src/components/chat/RepliedLine.tsx`
- Supprimer les définitions internes de `ReplyLine`, `RepliedContent`, `cleanPreview`, et `describeAttachments`.
- Importer `ReplyLine` depuis `./ReplyLine` et `RepliedContent` depuis `./RepliedContent`.
- Conserver l'interface `RepliedLineProps` et le wrapper `RepliedLine` inchangés.
- Ajouter des **re-exports** (`export { ReplyLine, RepliedContent }`) depuis `RepliedLine.tsx` pour ne **pas casser** les imports existants qui ciblent `@/components/chat/RepliedLine`.

### 4. Vérifier l'absence de régression visuelle
- Aucune valeur CSS, prop par défaut, ou calcul de position (`avatarCenter`, `endX`, `indent`, `paddingLeft`) ne doit changer.
- Le DOM généré par le wrapper `RepliedLine` doit rester strictement identique (même structure, mêmes classes, mêmes attributs `data-*`).

### 5. Build & tests
- Lancer le build TypeScript pour confirmer l'absence d'erreur d'import.
- Vérifier que `src/components/chat/__tests__/RepliedLine.test.tsx` passe toujours (les imports depuis `@/components/chat/RepliedLine` restent valides grâce aux re-exports).
