Plan de mise à jour de `src/lib/colorNames.ts` :

1. Remplacer l'intégralité de la table `NAMED_COLORS` par les 148 noms de couleurs CSS Level 4 en anglais standard, organisés par familles (reds, oranges, yellows, etc.). La logique `nearestColorName()` reste inchangée.

2. Insérer une entrée supplémentaire hors liste standard, en début de table, avant les couleurs CSS : `{ hex: '#5865F2', name: 'Blurple' }`. Le match exact (d === 0) dans `nearestColorName()` court-circuite la recherche, donc `#5865F2` exact retournera "Blurple" en priorité.

3. Vérification après modification :
   - `nearestColorName('#5865F2')` → "Blurple"
   - `nearestColorName('#5865F0')` → nom anglais le plus proche (probablement "Blurple" si la distance est plus courte, sinon le CSS standard le plus proche)

4. Vérifier le build TypeScript (`tsgo --noEmit`) après modification.

Aucun autre fichier n'est concerné.