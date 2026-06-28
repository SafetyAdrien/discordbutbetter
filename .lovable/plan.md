## Avertissement self-XSS dans la console (DevTools)

### Voie retenue
**Aucun i18n existant** dans le projet → solution autonome via `navigator.language` (slice 2 chars), avec dictionnaire FR + EN inline et fallback EN si la langue n'est pas couverte. Aucune dépendance ajoutée.

### Fichier à créer : `src/lib/self-xss-warning.ts`

Module exportant `logSelfXssWarning()` :
- Dictionnaire `translations` (FR + EN) avec les 4 clés : `title`, `warning`, `info1`, `info2` (textes exacts fournis dans la consigne).
- `getLang()` interne : lit `navigator.language?.slice(0,2).toLowerCase()`, retombe sur `'en'` si non couvert.
- 4 `console.log` stylisés successifs :
  1. **Title** — très gros (`font-size: 60px`), gras, rouge `#ff3838`, `text-shadow`.
  2. **Warning** — gros (`font-size: 22px`), rouge `#ff3838`, gras.
  3. **Info1** — taille normale (`font-size: 16px`), foreground neutre.
  4. **Info2** — taille normale, lien Trust optionnel.
- Garde-fous :
  - No-op si `import.meta.env.DEV` (pas de bruit en dev).
  - No-op si `typeof window === 'undefined'` (SSR safety, even si non utilisé ici).
  - Flag `__selfXssWarned` sur `window` pour ne logger qu'une fois par session.

### Branchement : `src/main.tsx`

Ajouter un import + appel `logSelfXssWarning()` après la création du root React (en bas du fichier), pour que l'avertissement s'affiche dès l'ouverture de la console en production.

### Hors-scope
- Pas de modification de `index.html`, du serveur, ni d'autres composants.
- Pas de page Trust additionnelle (déjà présente à `/trust` si besoin de lien futur).
- Pas de détection de `navigator.languages[]` étendue — slice 2 chars suffit pour FR/EN.

### Réponse finale après implémentation
Je fournirai le diff des 2 fichiers (`src/lib/self-xss-warning.ts` créé, `src/main.tsx` modifié) et confirmerai la voie prise (navigator.language, pas d'i18n réutilisé car aucun système présent).