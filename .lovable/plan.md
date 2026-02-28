
# Correctifs Mobile : Profil et Navigation

## 1. Profil mobile -- Supprimer le contenu par defaut

Le profil mobile affiche actuellement un faux bandeau degrade (`bg-gradient-to-br from-primary/30 to-primary/10`) meme quand l'utilisateur n'a pas configure de banniere. Cela donne l'impression que le profil est enrichi par defaut.

### Changements dans `MobileProfileView.tsx`
- Supprimer le bandeau degrade par defaut (lignes 57-58). Si l'utilisateur n'a pas de `banner_url`, afficher simplement un petit espace vide (par exemple `h-6`) au lieu d'un faux bandeau colore
- Conserver l'affichage de la banniere uniquement si `profile?.banner_url` existe
- Le bio, le statut personnalise et les autres champs restent conditionnels (ils ne s'affichent que si remplis, c'est deja le cas)

## 2. Navigation serveurs -- Corriger la duplication de la liste des salons

### Le probleme
Quand l'utilisateur est sur l'onglet "Serveurs" (qui contient deja la liste des salons en mode embarque), il clique sur un salon et arrive dans le chat. Quand il revient en arriere, la fonction `handleBackToChannels` cree un overlay `{ type: 'channels' }` au lieu de revenir a l'onglet serveurs. Resultat : l'utilisateur voit la liste des salons une deuxieme fois, sous forme de page separee.

### Correction dans `MobileLayout.tsx`
- Modifier `handleBackToChannels` pour verifier d'ou vient l'utilisateur
- Si le `mobileView` precedent etait de type `tab` (l'utilisateur venait de l'onglet serveurs avec la liste embarquee), revenir directement a `{ type: 'tab' }` au lieu de creer un overlay `channels`
- Concretement : utiliser un ref ou un champ supplementaire dans `mobileView` pour tracker l'origine de la navigation. Option plus simple : dans `handleServerChannelSelect` (appele depuis l'onglet serveurs), marquer que la source est `tab`. Puis dans `handleBackToChannels`, verifier cette source

### Implementation technique
- Ajouter un champ optionnel `fromTab?: boolean` au type `MobileView` pour le type `chat`
- Dans `handleServerChannelSelect` (ligne 89) : passer `fromTab: true` dans le state
- Dans `handleBackToChannels` (ligne 106) : si `fromTab` est vrai, revenir a `{ type: 'tab' }` au lieu de `{ type: 'channels' }`

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `MobileProfileView.tsx` | Supprimer le bandeau degrade par defaut |
| `MobileLayout.tsx` | Ajouter `fromTab` au type de vue chat + corriger `handleBackToChannels` |
