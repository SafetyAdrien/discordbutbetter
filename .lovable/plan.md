
# Sidebar serveurs a 20% -- compact sans espace vide

## Changement

Reduire la colonne serveurs de 50% a 20% de la largeur, tout en supprimant les elements qui creent du vide inutile (noms de serveurs sous les icones, grands espacements).

## Modifications dans `src/components/mobile/MobileServersView.tsx`

### Largeur du sidebar
- Passer de `w-1/2` / `w-[45%]` a `w-[20%]` (fixe, identique sur tous les ecrans)

### Taille des icones
- Reduire de `w-14 h-14` / `w-12 h-12` a `w-10 h-10` pour que les icones remplissent bien la colonne etroite sans marges excessives

### Supprimer les noms de serveurs
- Retirer le `<span>` avec le nom du serveur sous chaque icone -- dans une colonne a 20%, le texte serait illisible et creerait du vide
- Le bouton passe de `flex-col items-center gap-1` a simplement un conteneur centre pour l'icone

### Reduire les espacements
- Passer `gap-2` a `gap-1` entre les icones
- Passer `py-3` a `py-2` pour le padding vertical du conteneur
- Reduire les boutons Discover/Create de `w-12 h-12` a `w-10 h-10`

### Resultat visuel
```text
+------+------------------------+
|  O   |                        |
|  O   |   Liste des salons     |
|  O   |   (80% de largeur)     |
|  --  |                        |
|  +   |                        |
|  🧭  |                        |
+------+------------------------+
 ~20%         ~80%
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/mobile/MobileServersView.tsx` | Largeur 20%, icones 40px, suppression noms, espacement reduit |
