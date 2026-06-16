**Problème** : Le composant `CodeBlock` (`src/components/ui/code-block.tsx`) appelle bien `hljs.highlightElement` qui ajoute des classes `.hljs-keyword`, `.hljs-string`, etc. — mais **aucun thème CSS de highlight.js n'est importé**, donc les tokens restent sans couleur.

**Correction** :

1. **Importer un thème dark** dans `src/components/ui/code-block.tsx` :
   ```ts
   import 'highlight.js/styles/github-dark.css';
   ```
   (Cohérent avec le fond `surface-elevated` sombre du bloc.)

2. **Ajouter les langages manquants** demandés par l'utilisateur dans le même fichier :
   - `csharp` + alias `cs`, `c#`
   - `c` (C pur, séparé du C++)
   - `kotlin`, `swift`, `yaml` (couverture courante)
   - `tsx`/`jsx` mappés vers typescript/javascript (déjà géré côté parsing)

3. Aucun autre fichier modifié — `markdown.tsx` extrait déjà la langue de `` ```lang `` et la passe à `<CodeBlock language={...} />`.

**Vérification** : un bloc `` ```js \n const x = 1; \n ``` `` doit afficher `const` en violet/rose, `1` en orange, etc., selon le thème github-dark.