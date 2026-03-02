
## Changer la couleur de fond du header serveur

**Objectif** : Remplacer la valeur actuelle de `--surface-header` par la couleur `#1C212B` convertie en HSL.

**Conversion** :
- `#1C212B` → RGB(28, 33, 43) → HSL(220, 21%, 14%)

**Modification** :
- **Fichier** : `src/index.css`, ligne 160
- Remplacer `--surface-header: 218 18% 16%;` par `--surface-header: 220 21% 14%;`

C'est un changement d'une seule ligne dans la variable CSS sémantique existante, ce qui appliquera automatiquement la nouvelle couleur partout où `--surface-header` est utilisée.
