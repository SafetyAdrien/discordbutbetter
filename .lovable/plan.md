

# Améliorer les teintes du conteneur des Sondages

## Problème
Le sondage utilise `--poll-background: 220 18% 10%` (luminosité 10%) qui est très proche du fond principal (11%). Les options utilisent `bg-[hsl(var(--surface-2))]` (14%). Le conteneur se fond dans l'interface de discussion — pas assez de distinction visuelle.

## Solution
Créer un conteneur de sondage avec une teinte distincte qui le fait ressortir visuellement, en utilisant une légère teinte colorée (bleu/indigo) pour signaler "ceci est un élément interactif spécial".

### Changements

**1. `src/index.css`** — Mettre à jour la variable poll-background
- `--poll-background: 220 18% 10%` → `--poll-background: 228 20% 15%` (plus lumineux, légèrement plus saturé et teinté bleu)

**2. `src/components/chat/PollDisplay.tsx`** — Enrichir le conteneur
- Conteneur principal : ajouter une bordure subtile `border border-primary/15` + `shadow-elevation-1` pour l'élévation
- Coins plus arrondis : `rounded-lg` → `rounded-xl` (cohérence Material You)
- Options : `bg-[hsl(var(--surface-2))]` → `bg-[hsl(var(--surface-1))]` pour créer du contraste avec le fond poll plus clair
- Options sélectionnées/votées : garder `border-primary bg-primary/10`
- Ajouter une bordure gauche colorée sur le conteneur : `border-l-[3px] border-l-primary/40` pour une accroche visuelle immédiate

**Résultat** : Le sondage aura une élévation visible, une teinte bleutée distincte et un accent latéral coloré qui le distingue clairement des messages normaux.

2 fichiers modifiés.

