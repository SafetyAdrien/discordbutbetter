# Plan

Three independent chantiers. Tous limités aux plateformes prioritaires : **Twitter/X, Instagram, Bluesky, YouTube**.

---

## 1. Système "Connections" — critères configurables par serveur

### Concept
Chaque serveur peut définir des **règles d'éligibilité** sur les connections d'un utilisateur. Si un membre lie un compte (ex. Instagram) et que ses stats déclarées satisfont la règle, un **rôle** est automatiquement attribué.

### Données saisies par l'utilisateur (sur le profil)
On enrichit chaque entrée `ProfileConnection` avec des stats déclaratives optionnelles :
- `posts_count` (nombre)
- `followers_count` (nombre)
- `following_count` (nombre)
- `is_verified` (bool, badge bleu)
- `account_created_at` (date → âge calculé)

Saisie via le modal d'ajout/édition existant (`ConnectionsSettings.tsx`), avec un sous-formulaire spécifique aux 4 plateformes prioritaires. Les autres providers gardent l'UI actuelle.

Note honnêteté : ces stats sont **déclaratives** (l'utilisateur peut mentir). Un drapeau visuel "non vérifié automatiquement" sera affiché à côté des stats. Une vraie vérification par API n'est pas dans le périmètre.

### Règles côté serveur
Nouvelle table `server_connection_rules` :
- `server_id`, `provider` (twitter/instagram/bluesky/youtube), `role_id` (rôle à attribuer)
- `min_posts`, `min_followers`, `min_account_age_days` (nullable)
- `require_verified` (bool)
- `name`, `description`

UI dans `ServerSettings` → nouvel onglet **"Critères Connections"** :
- Liste des règles, bouton "Nouvelle règle"
- Formulaire : choix provider, choix rôle, seuils, prévisualisation

### Évaluation & attribution de rôle
- RPC `evaluate_connection_rules(_user_id, _server_id)` côté DB : lit `profiles.connections`, compare aux règles, attribue/retire les rôles ciblés.
- Trigger automatique sur `UPDATE profiles.connections` (pour tous les serveurs où l'utilisateur est membre).
- Bouton manuel "Réévaluer mes rôles" dans les paramètres du serveur côté membre.

### Affichage
- Sur la fiche de profil utilisateur (popup + mobile), chaque connection des 4 plateformes prioritaires affiche en dessous : badge "✓ Vérifié" si applicable, et "1.2K abonnés · 340 posts · Compte depuis 2 ans".

---

## 2. Interface Mobile — Vue Profil

### Statut au clic sur l'avatar
- L'avatar ouvre déjà le `MobileStatusSheet` ✅ (conservé)
- **Retirer** le bouton trigger statut situé dans l'identity card sur le nom d'affichage (lignes 179–196 de `MobileProfileView.tsx`) : on garde `h2` + chevron stat-pill supprimés. Le nom redevient un simple titre non cliquable.
- Le label texte "En ligne / Inactif…" (ligne 198–200) est aussi retiré (déjà accessible via la pastille sur l'avatar).

### Statut personnalisé compact (style Desktop)
Nouvelle disposition dans la zone avatar :
- **Bulle large horizontale** à droite de l'avatar : affiche le `custom_status` actuel. Si vide → placeholder gris "Quoi de neuf ?" avec icône `+`. Tap → ouvre `CustomStatusModal`.
- **Mini bulle** flottante au-dessus-gauche de la bulle large (légèrement décalée vers la pdp) : petit cercle avec icône `+` blanche, sert de bouton d'ajout/édition rapide (même action : ouvre le modal).
- Suppression du bloc `custom_status` actuel dans l'identity card (lignes 218–222).

```text
   ╭──╮
   │ +│              ← mini bulle décalée gauche
   ╰──╯
 ⬤────  ╭─────────────────────────╮
 │PDP│  │ + Quoi de neuf ?         │   ← bulle large à droite
 ⬤────  ╰─────────────────────────╯
```

---

## 3. Markdown Mobile — fidélité Desktop + bloc de code

### Constat
- `MobileMessageBubble` utilise `MarkdownText` (comme desktop) mais la largeur de bulle + paddings tronquent les `CodeBlock` (largeur fixe, pas de scroll horizontal, débordement caché).
- Certains éléments markdown (titres, listes, citations) ne respectent pas la même hiérarchie de styles que desktop sur mobile.

### Corrections
1. **`src/components/ui/code-block.tsx`** : ajouter `overflow-x-auto` + `max-w-full` sur `<pre>`, et un wrapper qui permet le scroll horizontal sur mobile sans casser la bulle. Conserver la lisibilité (font-size légèrement réduit sur viewport < 480px).
2. **`MobileMessageBubble`** : forcer la bulle à `max-w-[85%]` avec `min-w-0` sur les conteneurs internes, et `overflow-hidden` au niveau bubble + `overflow-x-auto` au niveau code uniquement.
3. **`src/lib/markdown.tsx`** : auditer les composants rendus (h1/h2/h3, ul, ol, blockquote, inline code, table) et s'assurer qu'aucune classe ne disparaît sur mobile. Ajouter des variantes responsives si la taille est trop tassée (ex. `text-base md:text-lg` sur titres).
4. **Aperçu d'édition** (input rédaction) : `InputMarkdownOverlay` — vérifier que le rendu live correspond bien au rendu final (mêmes classes que `MarkdownText`), notamment pour le bloc de code multi-lignes.

### Vérification
Test manuel via `browser--view_preview` à 390×844 avec :
- un message contenant ``` ```ts\nconst foo = ...\n``` ```
- titres `# ## ###`, listes, citations, mentions, liens

---

## Détails techniques

### Migration DB
```sql
CREATE TABLE public.server_connection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('twitter','instagram','bluesky','youtube')),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  min_posts integer,
  min_followers integer,
  min_account_age_days integer,
  require_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.server_connection_rules TO authenticated;
GRANT ALL ON public.server_connection_rules TO service_role;
ALTER TABLE public.server_connection_rules ENABLE ROW LEVEL SECURITY;

-- SELECT : tout membre du serveur
-- INSERT/UPDATE/DELETE : has_server_permission(manage_roles)
```

Plus la RPC `evaluate_connection_rules` (SECURITY DEFINER) et un trigger sur `profiles` qui itère sur les serveurs du user.

### Fichiers touchés
- `src/lib/connections.ts` (ajout champs stats au type)
- `src/components/account-settings/ConnectionsSettings.tsx` (sous-formulaire stats)
- `src/components/profile/UserProfilePopup.tsx` + `MobileFullProfileView` (affichage stats)
- Nouveau `src/components/server-settings/ConnectionRulesManager.tsx`
- `src/components/server-settings/ServerSettingsModal.tsx` (nouvel onglet)
- Nouveau hook `src/hooks/useServerConnectionRules.ts`
- `src/components/mobile/MobileProfileView.tsx` (retraits + nouvelles bulles)
- `src/components/mobile/dm/MobileMessageBubble.tsx` + `ChatArea` desktop variantes mobiles
- `src/components/ui/code-block.tsx` (overflow + responsive)
- `src/lib/markdown.tsx` (audit responsive)
- `src/components/chat/InputMarkdownOverlay.tsx` (parité visuelle)
- Migration SQL

### Hors périmètre (à mentionner)
- Vraie vérification API des stats sociales (OAuth + appels Twitter/Instagram/YT) → projet à part, coûteux.
- Retrait automatique des rôles si le user supprime sa connection → inclus, mais on n'attaque pas la fraude utilisateur.
