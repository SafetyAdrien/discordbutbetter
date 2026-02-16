

# Modifications de l'interface des parametres de salon

## 1. ChannelOverview.tsx -- Icone cliquable + inline avec le nom

### Supprimer
- Le bouton "Importer" / "Modifier" et le bouton "Supprimer" (lignes 146-167)
- Le label "Icone du salon" (ligne 130)
- Le texte d'aide "PNG, JPG, WEBP ou GIF..." (ligne 176)
- La section icone actuelle (tout le bloc lignes 128-177) sera remplacee

### Ajouter
- Rendre la forme circulaire de l'icone **cliquable** : un clic dessus ouvre directement le file input pour importer une image
- Ajouter un overlay au hover avec une icone camera/upload pour indiquer que c'est cliquable
- Si une icone custom est deja definie, un clic droit ou un petit bouton X discret permettra de la supprimer (retour a l'icone par defaut)

### Reorganiser la mise en page
- Mettre l'icone du salon et le champ "Nom du salon" **sur la meme ligne** (flex row) :

```text
┌──────┐  ┌──────────────────────────────┐
│ ICON │  │ nom-du-salon                 │
└──────┘  └──────────────────────────────┘
```

- L'icone (cercle ~40px) a gauche, l'input du nom prend le reste de l'espace (flex-1)
- Le label "Nom du salon" est au-dessus de cette ligne

### Details techniques
- Le `<input type="file">` hidden reste en place
- Au clic sur le cercle de l'icone : `fileInputRef.current?.click()`
- Hover : `cursor-pointer` + overlay semi-transparent avec icone `Upload` ou `Camera`
- Si `iconUrl` existe : petit bouton X en position absolue (coin superieur droit du cercle) pour `handleRemoveIcon`

---

## 2. ChannelDangerZone.tsx -- Supprimer la zone, garder le bouton

### Supprimer
- Le `<Separator>` (ligne 54)
- Le titre "Zone de danger" avec l'icone triangle (lignes 57-60)
- Le paragraphe descriptif (lignes 62-64)

### Garder
- Le bouton "Supprimer le salon" (lignes 66-72)
- La modale de confirmation (lignes 75-103)
- Toute la logique de suppression

### Resultat
Le composant rendra uniquement le bouton destructive + la modale, sans wrapper "zone de danger", sans separateur, sans texte explicatif.

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/channel-settings/ChannelOverview.tsx` | Icone cliquable, suppression boutons, mise en ligne icone + nom |
| `src/components/channel-settings/ChannelDangerZone.tsx` | Suppression zone de danger, conservation du bouton + modale |

