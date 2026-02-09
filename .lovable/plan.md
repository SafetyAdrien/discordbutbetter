
# Correction du Problème d'Upload lors de la Création de Serveurs

## Problème identifié

Les politiques RLS actuelles pour les buckets `server-icons` et `server-banners` exigent que le serveur existe déjà dans la base de données avant de pouvoir uploader des fichiers :

```sql
-- Politique actuelle - PROBLÉMATIQUE
WITH CHECK (
  EXISTS (
    SELECT 1 FROM servers 
    WHERE servers.id::text = storage.foldername(name)[1]
    AND (servers.owner_id = auth.uid() OR servers.secondary_owner_id = auth.uid())
  )
)
```

Or, dans `CreateServerModal.tsx`, l'upload se fait **AVANT** la création du serveur (lignes 104-109), donc :
1. L'utilisateur sélectionne une icône/bannière
2. Le modal tente d'uploader → **ÉCHEC RLS** (serveur inexistant)
3. La création du serveur ne se fait jamais

---

## Solution proposée

### Stratégie : Autoriser l'upload pour tout utilisateur authentifié

Pour les buckets `server-icons` et `server-banners`, on doit permettre l'upload à tout utilisateur authentifié car l'icône/bannière est uploadée **avant** que le serveur n'existe.

C'est sécurisé car :
- Les fichiers sont stockés dans des sous-dossiers UUID aléatoires
- Seul le créateur du serveur aura l'URL finale
- Les politiques UPDATE/DELETE restent restrictives (propriétaire seulement)

---

## Modifications

### Migration SQL

Supprimer les anciennes politiques INSERT et créer de nouvelles qui autorisent l'upload pour les utilisateurs authentifiés :

```sql
-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Server owners can upload server icon" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server banner" ON storage.objects;

-- Créer de nouvelles politiques permissives pour INSERT
CREATE POLICY "Authenticated users can upload server icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload server banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-banners' AND auth.uid() IS NOT NULL);
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| **Migration SQL** | Remplacer les politiques INSERT pour `server-icons` et `server-banners` |

---

## Sécurité

| Opération | Avant | Après |
|-----------|-------|-------|
| INSERT | Propriétaire serveur seulement | Tout utilisateur authentifié |
| SELECT | Public | Public (inchangé) |
| UPDATE | Propriétaire serveur | Propriétaire serveur (inchangé) |
| DELETE | Propriétaire serveur | Propriétaire serveur (inchangé) |

L'approche est sécurisée car :
1. Les fichiers uploadés utilisent des UUID aléatoires (`crypto.randomUUID()/timestamp.ext`)
2. Seul le créateur connait l'URL finale
3. Les opérations UPDATE/DELETE restent restreintes aux propriétaires
4. Les buckets sont publics en lecture de toute façon (les URLs sont partagées)

---

## Résultat attendu

- **Avant** : Erreur `new row violates row-level security policy` lors de l'upload
- **Après** : Upload réussi → Serveur créé avec icône/bannière

