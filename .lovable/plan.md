# Floating User Profile Panel (Desktop)

Transformer le `UserProfileCard` (bas-gauche, sous la liste de salons sur desktop) en **conteneur flottant** type Discord — une carte arrondie détachée, avec marges, ombre et léger fond/gradient, au lieu de la barre pleine largeur collée actuelle.

## Fichier modifié
- `src/components/profile/UserProfileCard.tsx` (root container uniquement — logique et popover inchangés)

## Changements visuels
Conteneur racine (ligne 124) passe de :
```
h-14 px-2 ... bg-[hsl(var(--user-panel))] border-t border-border/50
```
à un encadré flottant :
- `mx-2 mb-2` (marges latérales + bas pour détacher du bord)
- `rounded-2xl` (coins arrondis cohérents avec `VoiceControls` voisin)
- `bg-[hsl(var(--surface-2))]` (même token que le bloc voix au-dessus pour cohérence)
- `border border-border/40`
- `boxShadow: var(--shadow-elevation-1)` (ombre douce comme `VoiceControls`)
- Suppression du `border-t` (plus de barre collée)
- Hauteur conservée `h-14`, padding interne légèrement réduit (`px-2 py-1.5`) pour compenser les marges
- Aucun changement sur le popover, le menu de statut, les boutons mic/casque/réglages

## Résultat
Visuellement aligné avec le `VoiceControls` (déjà flottant arrondi) — les deux blocs forment une pile cohérente de cartes flottantes en bas de la sidebar, comme sur Discord (image de référence).

## Hors-scope
- Aucun changement mobile (`MobileLayout` non touché)
- Aucune logique métier / data / hooks modifiés
- Pas de changement de tokens globaux dans `index.css`
