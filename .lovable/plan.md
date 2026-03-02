

## Réajuster la couleur du header serveur

**Problème** : La couleur actuelle du header (`220 21% 14%`) ne s'harmonise pas correctement avec la liste des salons (`--card: 218 20% 10%`). La teinte (220° vs 218°) et la saturation (21% vs 20%) divergent légèrement du système de couleurs existant.

**Solution** : Réaligner le header sur la teinte de base 218° tout en maintenant une différence de luminosité subtile (+3%) par rapport à la liste des salons.

| Variable | Actuelle | Nouvelle |
|---|---|---|
| `--card` (liste salons) | `218 20% 10%` | inchangé |
| `--surface-header` | `220 21% 14%` | `218 20% 13%` |

**Modification** :
- **Fichier** : `src/index.css`, ligne 160
- Remplacer `--surface-header: 220 21% 14%` par `--surface-header: 218 20% 13%`

Cela donne un header légèrement plus clair que la liste des salons (+3% de luminosité), avec une teinte et saturation parfaitement cohérentes avec le reste du design system.
