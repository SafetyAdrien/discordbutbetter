## Résultat de la requête (lecture seule)

Serveur : **Adrien's House**, salon : **Calendrier** (`41fb6f99-76e1-4b2e-a133-51af0f55c851`).

```
 name | is_default | permission
------+------------+------------
(0 rows)
```

**Aucun rôle** du serveur (ni `@everyone`, ni un autre) ne possède `manage_events` ou `create_events` dans `role_permissions`.

## Audit complémentaire

Overrides du salon `Calendrier` :

```
role_id …4633c3d | permission=create_events | type=deny | sync_with_category=false
```

→ Un seul override, qui **refuse** `create_events` à un rôle spécifique. Aucun `allow` nulle part.

## Conclusion

L'hypothèse "ligne `manage_events` accordée à @everyone" est **infirmée** : la base est propre.

Donc si tu vois quand même le bouton « Nouvel événement » / les actions Modifier-Supprimer sur ce salon avec un compte qui ne devrait pas, ça ne vient **pas** d'un grant DB parasite. Les seuls chemins qui restent dans `has_channel_permission` pour renvoyer `true` sur `create_events` / `manage_events` sont :

1. Le compte testé est **owner** ou **secondary_owner** du serveur (bypass total — `is_server_owner` → `true`).
2. Le compte a un rôle avec la permission **`administrator`** (bypass total).
3. Le compte a un rôle qui accorde explicitement `create_events` ou `manage_events` *(exclu par la requête ci-dessus)*.
4. Un override de salon `allow` *(exclu : il n'y a qu'un `deny`)*.

## Prochaine étape proposée

Pour trancher définitivement, dis-moi avec quel compte tu observes le bouton, et je lance (toujours en lecture seule) :

- `SELECT owner_id, secondary_owner_id FROM servers WHERE name = 'Adrien''s House';`
- la liste des rôles + permission `administrator` de ce compte sur ce serveur.

Si le compte est owner / secondary / admin, le comportement actuel est **correct par design** (God Mode documenté dans la mémoire projet) et il n'y a pas de bug à corriger. Sinon, on aura identifié une vraie fuite et je préparerai un correctif ciblé.

Aucune modification n'est proposée tant que ce point n'est pas levé.