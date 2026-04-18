
## Objectif
Quand l'utilisateur tape une touche de clavier dans un salon textuel ou d'annonces, le focus doit automatiquement aller dans la barre de saisie, et le caractère tapé doit y apparaître directement (comportement Discord).

## Analyse

Je dois d'abord vérifier l'implémentation actuelle de `MessageInput` et `ChatArea` pour comprendre :
- Si un listener global existe déjà
- Comment le textarea est référencé
- Quels salons utilisent `MessageInput` (textuel + annonces via PublishPrompt)
