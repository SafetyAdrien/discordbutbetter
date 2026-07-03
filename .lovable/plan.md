# Contrôle Case pour les libellés de catégories

Ajout d'un réglage de casse purement visuel (`text-transform`) appliqué uniquement à l'utilisateur connecté, synchronisé entre ses appareils via une nouvelle table dédiée.

## Portée (4 zones indépendantes avec toggle d'activation)

Chaque zone a son propre interrupteur ON/OFF + son propre choix AG / ag / Ag / Aa :

1. **Channel categories** — entêtes de catégories dans `ChannelList.tsx`
2. **User settings sections** — libellés "Mes Paramètres", "Compte", "Facturation"... dans `AccountSettingsModal.tsx`
3. **Server settings sections** — libellés "Expressions", "Personnes", "Modérations"... dans `ServerSettingsModal.tsx`
4. **Category modal tabs** — onglets "Aperçu", "Permissions" dans `EditCategoryModal.tsx`

## Options de casse

- **AG** → `uppercase`
- **ag** → `lowercase`
- **Ag** → `capitalize` (title case CSS)
- **Aa** → aucune transformation (défaut)

Rendu 100 % côté client via `text-transform` sur la couche présentation — aucune donnée serveur modifiée, autres utilisateurs non impactés.

## Persistance cross-device

Nouvelle table `public.user_ui_preferences` :

| Colonne | Type | Notes |
|---|---|---|
| `user_id` | uuid PK, FK → `auth.users` | 1 ligne / utilisateur |
| `category_case` | jsonb | `{ channelCategories: {enabled, case}, userSettings: {...}, serverSettings: {...}, categoryModal: {...} }` |
| `created_at` / `updated_at` | timestamptz | trigger updated_at |

- GRANT `SELECT/INSERT/UPDATE/DELETE` à `authenticated`, `ALL` à `service_role`.
- RLS : `user_id = auth.uid()` pour SELECT / INSERT / UPDATE / DELETE.
- Realtime activé pour sync live entre onglets/appareils du même user.

## Emplacement UI

Nouveau sous-groupe **"Typographie des catégories"** dans l'onglet **Apparence** (`src/lib/settings/section_registry/AppearanceSections.ts` + `AppearanceIndex.ts`).

Layout du contrôle par zone (répété 4 fois) :

```text
┌─ Catégories de salons ─────────── [Switch] ┐
│  Case : [AG] [ag] [Ag] [Aa]                │
└────────────────────────────────────────────┘
```

Quand un switch est OFF, les boutons de casse sont désactivés et la zone reste en `Aa`.

## Détails techniques

**Nouveaux fichiers**
- `src/hooks/useCategoryCasePreferences.ts` — lit/écrit la ligne user via Supabase, expose `{ prefs, setZone, isLoading }`. Fallback localStorage pour instant UI + upsert async. Realtime channel sur `user_ui_preferences` filtré par `user_id`.
- `src/lib/ui/categoryCase.ts` — helper `caseClass(zone, prefs)` retournant la classe Tailwind (`uppercase` / `lowercase` / `capitalize` / `normal-case`).
- `src/components/appearance/CategoryCaseSection.tsx` — UI des 4 blocs (Switch + segmented buttons AG/ag/Ag/Aa réutilisant les tokens de design existants).

**Fichiers modifiés (application de `caseClass`)**
- `src/components/layout/ChannelList.tsx` — sur le `<span>` du nom de catégorie.
- `src/components/account-settings/AccountSettingsModal.tsx` — sur les `<p>` de nom de section (`section.name`).
- `src/components/server-settings/ServerSettingsModal.tsx` — sur le `<p>` `text-xs font-semibold ... uppercase` (retirer la classe `uppercase` hardcodée pour laisser la préférence gagner).
- `src/components/category-settings/EditCategoryModal.tsx` — sur les `<TabsTrigger>`.
- `src/components/account-settings/AppearanceSettingsTab.tsx` (ou équivalent) — insertion de `<CategoryCaseSection />`.
- `src/lib/settings/section_registry/AppearanceSections.ts` + `search_index/AppearanceIndex.ts` — nouvelle entrée "Typographie des catégories" (keywords : casse, majuscules, minuscules, uppercase, lowercase, typographie).

## Migration SQL (aperçu)

```sql
CREATE TABLE public.user_ui_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_case jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_preferences TO authenticated;
GRANT ALL ON public.user_ui_preferences TO service_role;
ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_prefs_all" ON public.user_ui_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- trigger updated_at + REPLICA IDENTITY FULL + ajout à publication realtime
```

## Contraintes respectées

- Client-only visuel : les noms réels en base ne changent jamais → invisible pour les autres utilisateurs.
- Cross-device : lecture Supabase + Realtime → même préférence sur mobile/desktop du même compte.
- Design system : réutilisation `Switch` shadcn + boutons `rounded-[10px]` cohérents avec le modal actuel.
- Aucun impact sur les hooks métier (`useChannels`, `useCategories`, permissions).
