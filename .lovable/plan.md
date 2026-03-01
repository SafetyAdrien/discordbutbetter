

# Fix: Sous-listes imbriquees et Embeds de liens

## Probleme 1 : Les sous-listes ne fonctionnent pas avec indentation simple

**Cause** : Le parseur calcule le niveau d'indentation avec `Math.floor(spaces / 2)`. Avec 1 espace (` - Test`), le resultat est `Math.floor(1/2) = 0`, donc le meme niveau que le parent.

**Correction** dans `src/lib/markdown.tsx` (lignes 418-421) :
- Changer le calcul d'indentation pour accepter chaque espace comme un niveau : utiliser directement `listMatch[1].length` au lieu de `Math.floor(length / 2)`
- Meme correction pour les listes ordonnees (lignes 424-427)

Avant : `Math.floor(listMatch[1].length / 2)` → ` - Test` = niveau 0
Apres : `listMatch[1].length` → ` - Test` = niveau 1, `  - Test` = niveau 2

**Ajustement du rendu** (lignes 710-718) :
- Adapter le calcul de `marginLeft` pour qu'il corresponde au nouveau systeme (chaque niveau = un cran d'indentation)
- Les puces changent deja correctement selon le niveau (disc → circle → square)

---

## Probleme 2 : Les Embeds de liens ne s'affichent pas

**Cause** : La fonction backend fonctionne (testee avec succes sur github.com). Le probleme est dans le composant `LinkEmbeds` qui utilise `extractUrls` de `src/hooks/useUrlMetadata.ts`. Cette fonction exclut les URLs contenues dans des liens masques `[text](url)`. De plus, l'auto-linking dans le parseur Markdown peut entrer en conflit.

**Corrections** dans `src/hooks/useUrlMetadata.ts` :
- Verifier que la regex `extractUrls` fonctionne correctement avec les URLs brutes dans le contenu des messages
- S'assurer que les URLs ne sont pas filtrees par erreur (la regex maskedLink peut capturer des faux positifs)

**Verification** dans `src/components/chat/LinkEmbed.tsx` :
- S'assurer que le composant recoit bien le contenu brut du message et pas le HTML rendu

---

## Fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/lib/markdown.tsx` | Corriger le calcul d'indentation des listes (lignes 418-427) et ajuster le rendu (lignes 710-725) |
| `src/hooks/useUrlMetadata.ts` | Verifier/corriger la regex `extractUrls` pour ne pas exclure les URLs brutes |

