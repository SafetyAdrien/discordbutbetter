

# Fix du crash : VoiceConnectionIndicator accede a stats quand il est null

## Probleme

L'application crash avec l'erreur `TypeError: can't access property "latency", stats is null`. Dans le composant `VoiceConnectionIndicator`, la qualite est correctement calculee meme quand `stats` est `null` (ligne 54), mais le contenu du tooltip (lignes 82-94) accede directement a `stats.latency`, `stats.packetLoss`, `stats.jitter` et `stats.connectionType` sans verifier que `stats` n'est pas `null`.

Cela se produit lorsqu'un utilisateur est connecte a un salon vocal seul, sans pair WebRTC -- donc sans statistiques de connexion.

## Correction

### Fichier : `src/components/channels/voice/VoiceConnectionIndicator.tsx`

Modifier le contenu du tooltip pour gerer le cas ou `stats` est `null` :

- Si `stats` est disponible : afficher toutes les statistiques detaillees (latence, perte de paquets, jitter, type de connexion)
- Si `stats` est `null` : afficher uniquement la qualite ("Excellente") et un message indiquant que les statistiques detaillees ne sont pas encore disponibles (par exemple "Aucune donnee pair disponible")

Cela garantit que le tooltip ne plante jamais, tout en restant informatif.

