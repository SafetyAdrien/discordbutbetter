

# Animation progressive de l'indicateur de connexion vocale

## Objectif
Quand un utilisateur rejoint un salon vocal ou un appel DM, l'indicateur de connexion (barres de signal) doit progressivement passer au vert (ou la couleur correspondant a la qualite) avec une animation fluide, au lieu d'apparaitre directement dans sa couleur finale.

## Modifications

### 1. `src/components/channels/voice/VoiceConnectionIndicator.tsx`

- Ajouter un etat local `animatedQuality` qui commence a `null` (gris) et transite progressivement vers la qualite reelle
- Quand les stats arrivent pour la premiere fois, animer les barres une par une (critical -> poor -> good -> excellent) avec un delai echelonne (~300ms par etape)
- Ajouter une classe CSS `transition-colors duration-500` sur l'icone pour que le changement de couleur soit fluide
- Les changements de qualite en cours d'appel utiliseront aussi la transition douce (pas de saut brusque)

### 2. `src/components/layout/VoiceControls.tsx`

- Ajouter une transition CSS sur le texte "Connecte" pour qu'il passe de gris a vert de facon synchronisee avec l'indicateur
- Le texte et l'icone s'animent ensemble pour un rendu coherent

### 3. `src/components/dm/DMCallView.tsx`

- Aucun changement necessaire : le composant `VoiceConnectionIndicator` est deja utilise, il beneficiera automatiquement de l'animation

## Details techniques

- Utiliser `useEffect` pour detecter l'arrivee des premieres stats et declencher l'animation d'entree
- Utiliser `useRef` pour suivre si c'est la premiere connexion (animation d'entree) ou un changement en cours (transition douce)
- Les transitions CSS (`transition-colors duration-500 ease-out`) gerent le fondu entre couleurs
- L'animation d'entree echelonnee simule les barres qui "montent" progressivement comme sur Discord

