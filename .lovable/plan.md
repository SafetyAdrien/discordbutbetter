

# Utiliser le VoiceConnectionIndicator dans les appels DM

## Contexte

L'indicateur de qualite de connexion (barres de signal) existe deja en tant que composant reutilisable (`VoiceConnectionIndicator`) et fonctionne correctement dans les salons vocaux. Cependant, dans les appels prives (DM), le composant `DMCallView` utilise une logique inline simplifiee avec moins de niveaux de qualite et sans le tooltip detaille (latence, jitter, perte de paquets, type de connexion).

## Plan

### Fichier : `src/components/dm/DMCallView.tsx`

1. **Importer** `VoiceConnectionIndicator` depuis `@/components/channels/voice/VoiceConnectionIndicator`
2. **Supprimer** la fonction `getConnectionQuality` (lignes 95-102) et la variable `quality` (ligne 104) qui dupliquent la logique
3. **Remplacer** le rendu inline de l'indicateur (lignes 127-131) par le composant `VoiceConnectionIndicator` avec `stats={connectionStats}`
4. **Nettoyer** les imports devenus inutiles (`Signal`, `SignalMedium`, `SignalLow` de lucide-react) s'ils ne sont plus utilises ailleurs dans le fichier

Resultat : les appels DM afficheront le meme indicateur de qualite que les salons vocaux, avec le tooltip detaille au survol montrant latence, perte de paquets, jitter et type de connexion.

