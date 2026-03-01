

# Correction des noms d'utilisateur en majuscules

## Probleme
Certains comptes ont un username stocke avec des majuscules dans la base de donnees. Le code cote client force deja la conversion en minuscules lors du changement de username, mais les comptes existants n'ont pas ete corriges.

## Solution
Appliquer une migration SQL qui :
1. Convertit tous les usernames existants en minuscules
2. Ajoute un trigger de validation pour empecher tout futur username contenant des majuscules (protection cote serveur, en complement du `.toLowerCase()` cote client)

## Changements techniques

### Migration SQL (via outil de migration)

```sql
-- 1. Corriger les usernames existants
UPDATE public.profiles
SET username = LOWER(username)
WHERE username <> LOWER(username);

-- 2. Creer un trigger pour forcer les minuscules a l'insertion/mise a jour
CREATE OR REPLACE FUNCTION enforce_lowercase_username()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username := LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_lowercase_username
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_lowercase_username();
```

### Aucun changement frontend necessaire
Le code client fait deja `.toLowerCase()` -- le trigger est une protection supplementaire cote serveur.

