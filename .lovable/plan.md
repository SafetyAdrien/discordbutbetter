

# Correctifs IntegrationsPage

## Problemes identifies

1. **Alignement** : Les icones/textes et boutons "Gerer" ne sont pas centres verticalement dans les cartes. Le `CardHeader` ajoute du padding excessif et le layout flex n'aligne pas correctement.

2. **Section "Plus d'integrations bientot"** : A remplacer par un bouton "Creer un Webhook" ouvrant un formulaire (nom + icone + choix du salon).

## Changements

### `src/components/server-settings/IntegrationsPage.tsx`

- **Alignement** : Remplacer les `Card`/`CardHeader` par des conteneurs simples avec `flex items-center` et padding uniforme (`py-3 px-4`). L'icone (w-10 h-10), le texte et le bouton "Gerer" seront parfaitement centres sur la meme ligne horizontale.

- **Formulaire webhook** : Remplacer la section dashed par un bouton "Creer un Webhook". Au clic, ouvrir un `Dialog` contenant :
  - Champ "Nom" (Input)
  - Upload d'icone (avatar optionnel)
  - Selecteur de salon (Select avec les channels text du serveur, via `useChannels`)
  - Boutons Annuler / Creer (utilisant `useCreateWebhook`)

### Fichiers impactes
- **Modifier** : `src/components/server-settings/IntegrationsPage.tsx`

