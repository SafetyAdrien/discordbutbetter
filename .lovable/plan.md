Constat: l’app affiche encore d’anciennes données parce que certains hooks réutilisent le cache local comme donnée fraîche. L’ancien système de reply par citation Markdown est aussi toujours rendu visuellement via `parseRepliedMessage`, même quand la nouvelle réponse par `reply_to_id` existe.

Plan d’implémentation:

1. Forcer l’expiration des caches obsolètes
   - Augmenter la version globale du cache local pour purger IndexedDB/localStorage au prochain chargement.
   - Garder la purge ciblée compatible avec l’architecture `warmCache` existante.

2. Rendre les messages toujours capables de se rafraîchir
   - Modifier le chargement des messages de salons pour ne plus considérer `initialData` cache comme donnée fraîche pendant 60s.
   - Utiliser le cache seulement comme affichage temporaire, puis refetch systématique au montage.
   - Appliquer la même logique aux messages DM si nécessaire pour éviter les anciennes conversations figées.

3. Supprimer l’ancien rendu reply visible
   - Dans les salons, afficher `RepliedLine` uniquement quand `reply_to_id` / `repliedMessage` existe réellement.
   - Ne plus afficher les anciennes citations Markdown comme une reply riche.
   - Continuer à nettoyer le corps du message avec `parseRepliedMessage(...).body` pour que les anciens messages ne montrent pas le blocquote brut.

4. Aligner threads et DMs
   - Vérifier les surfaces qui utilisent encore le fallback legacy (`ThreadView`, DM si concerné).
   - Conserver les replies modernes, mais retirer l’affichage riche basé uniquement sur l’ancien format Markdown.

5. Validation
   - Vérifier dans l’aperçu que les anciens messages ne montrent plus la reply obsolète.
   - Vérifier qu’une nouvelle réponse moderne affiche toujours la ligne de réponse correcte.
   - Vérifier qu’un refresh ne garde plus des anciennes données bloquées.