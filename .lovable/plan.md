

# Ajouter `vote_in_polls` par défaut au rôle @everyone

## Problème

La permission `vote_in_polls` existe dans l'enum mais n'est pas attribuée au rôle par défaut `@everyone`. Les membres ne peuvent donc pas voter sans configuration manuelle.

## Plan

### 1. Migration SQL

Deux actions :
- **Serveurs existants** : insérer `vote_in_polls` dans `role_permissions` pour tous les rôles `@everyone` existants (avec `ON CONFLICT DO NOTHING`)
- **Futurs serveurs** : modifier la fonction `handle_new_server` pour inclure `vote_in_polls` dans les permissions par défaut

```sql
-- Ajouter aux rôles @everyone existants
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, 'vote_in_polls'::server_permission
FROM roles r WHERE r.is_default = true
ON CONFLICT DO NOTHING;

-- Mettre à jour handle_new_server pour inclure vote_in_polls
```

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | Insert + update function `handle_new_server` |

**1 migration, aucun fichier code modifié**

