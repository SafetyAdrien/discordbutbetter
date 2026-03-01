
# Refonte du layout mobile des paramètres de salon

## Objectif

Sur mobile, au lieu d'afficher d'abord une liste de menus, l'utilisateur arrive directement sur la page "Apercu" avec deux onglets (tabs) au-dessus : **Permissions** et **Integrations**. L'onglet "Integrations" affiche la section Webhooks avec un bouton "Creer un Webhook".

## Changements

### Fichier : `src/components/channel-settings/ChannelSettingsModal.tsx`

**Mobile** : Supprimer la navigation a deux niveaux (menu list -> contenu) et la remplacer par un layout direct :

1. **Header** : Titre du salon + bouton fermer (X)
2. **Contenu principal** : `ChannelOverview` + `ChannelDangerZone` affiches directement
3. **Deux tabs en dessous** : "Permissions" et "Integrations" (utiliser le composant `Tabs` existant)
4. **Etat initial** : `activeTab` commence a `'overview'` sur mobile aussi (plus de `null`)

La structure mobile deviendra :

```text
[X]  # nom-du-salon  Parametres
------------------------------
  ChannelOverview
  ChannelDangerZone
------------------------------
  [ Permissions | Integrations ]   <-- Tabs
  (contenu du tab selectionne)
```

- Quand "Permissions" est selectionne : affiche `ChannelPermissions`
- Quand "Integrations" est selectionne : affiche `ChannelWebhooks`

### Fichier : `src/components/channel-settings/ChannelWebhooks.tsx`

Modifier le bouton de creation pour afficher **"Creer un Webhook"** au lieu de simplement "Creer" :

- Changer le texte du bouton principal
- Garder le reste du composant identique

## Detail technique

Le bloc mobile (lignes 74-127) sera remplace par un layout vertical simple :
- Header avec X pour fermer
- ScrollArea contenant : Overview, DangerZone, puis un composant Tabs a 2 onglets (Permissions / Integrations)
- Plus besoin de ChevronLeft ni de navigation a deux niveaux
