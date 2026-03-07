

# Layout Discord-like pour les paramètres serveur (Desktop)

## Objectif

Adopter un layout similaire à Discord : la sidebar de navigation est poussée vers la droite avec une marge flexible à gauche, et le contenu occupe l'espace restant à droite avec une marge sur le bord droit.

## Changement

### `src/components/server-settings/ServerSettingsModal.tsx` (desktop return, lignes 221-246)

Remplacer le layout actuel (sidebar fixe `w-56` collée à gauche + contenu flex) par un layout centré à deux colonnes :

```text
|  flex-1 bg-card  |  w-56 nav (align right)  |  flex-1 content (align left)  |  margin  |
|   (push right)   |      sidebar             |       max-w-2xl               |          |
```

Structure :
- Container `flex` pleine page
- Zone gauche (`flex-1 bg-card`) : contient la nav alignée à droite (`ml-auto w-56`)
- Zone droite (`flex-1`) : contient le contenu avec padding gauche et `max-w-2xl`
- Le bouton X se place en position absolue ou dans le header du contenu

Même pattern que les settings Discord : la sidebar flotte vers le centre, le contenu commence juste après.

### Fichier modifié
- `src/components/server-settings/ServerSettingsModal.tsx` — section desktop uniquement (lignes 220-246)

