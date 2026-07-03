## Constat après audit

**Persistance / sync :** l'infra est déjà là (`user_ui_preferences.custom_theme` jsonb, RLS user-scoped, REPLICA IDENTITY FULL, table dans `supabase_realtime`). `applyDraft()` fait bien `upsert` + les autres appareils reçoivent via `postgres_changes`. Une seule chose manque : garantir que le round-trip est fiable et observable.

**Rendu vs vidéo — 3 défauts :**

1. **Le tint recouvre le side sheet.** `CustomThemeTintLayer` est monté à `z-index: 9998`, le sheet à `z-[80]`. Avec `mix-blend-mode`, l'overlay se blend AU-DESSUS du sheet et le "salit" (visible surtout à forte intensité). Dans la vidéo, le sheet reste propre pendant que l'app se tinte derrière.
2. **Blend mode dark-mode inadapté.** Aujourd'hui `screen` en dark → une couleur foncée (ex. `#000000` @74 %) n'a quasi aucun effet, alors que la vidéo montre l'app qui s'assombrit. `soft-light` reproduit le comportement observé (assombrit avec du sombre, éclaircit avec du clair) sans blanchir.
3. **Slider "Gradient Direction" manquant.** Dans la vidéo il apparaît dès qu'il y a ≥ 2 chips (f30 : 1 chip → pas de slider ; f45/f60 : ≥ 2 chips → slider visible avec la valeur en °). On l'a retiré à tort au tour précédent.

## Changements

### A. Rendu fidèle (`src/components/appearance/CustomThemeTintLayer.tsx` + `src/index.css`)
- Descendre le `z-index` du tint layer à `40` (au-dessus du contenu app, en-dessous du sheet `z-[80]` et de tout futur modal `z-50`). Le sheet reste 100 % net.
- Ajouter une classe utilitaire optionnelle `data-ct-lift` que le sheet peut poser sur son racine si besoin (`isolation: isolate`) pour couper toute contamination résiduelle.
- Passer le blend `dark` de `screen` → `soft-light` ; garder `light` sur `soft-light` aussi (comportement neutre + tint lisible). Documenter dans le commentaire CSS.
- Conserver `pointer-events: none`, `will-change: opacity`, `transition: opacity 240ms`.

### B. Restauration du slider "Direction du dégradé" (`CustomThemeSheet.tsx`)
- Sous "Intensité", si `draft.chips.length >= 2` : afficher un slider `Direction du dégradé` (0–360°, step 1) piloté par `setDraft({ angle })`, avec la valeur affichée à droite comme dans la vidéo. Sinon on ne rend rien (l'angle n'a pas de sens avec 1 couleur, cohérent avec le code de `applyToDom` qui duplique la couleur).
- Rien à changer dans le hook (`angle` est déjà dans `CustomThemeState` et sérialisé).

### C. Fiabiliser la sync temps réel (`src/hooks/useCustomTheme.ts`)
- `syncToServer` : ajouter un `console.debug` en cas d'erreur et surfacer via toast (`sonner`) uniquement pour l'action utilisateur `applyDraft` (échec réseau ⇒ "Impossible d'enregistrer votre thème, il reste actif localement"). Pas de toast sur succès (silencieux comme la vidéo).
- `applyDraft` : après `syncToServer`, ne rien de plus — le canal realtime existant réhydratera automatiquement les autres onglets/appareils.
- Vérification manuelle post-implémentation : ouvrir 2 onglets, Appliquer d'un côté → l'autre onglet reflète le changement < 1 s (log dans la console de debug).

### D. Nettoyage mineur
- La chip sélectionnée : garder l'indicateur `border-primary` actuel (déjà conforme à la vidéo).
- Aucun changement DB (schéma, RLS, publication realtime déjà en place).

## Ce qui n'est PAS touché
- La logique draft/committed, les Chips (add/remove/select), l'EyeDropper, `Surprends-moi`, `Réinitialiser`, `Partager`, `applySharedTheme`, l'entry-point `CustomThemeBanner` et `CustomThemeSheetHost` — tout reste inchangé.
- Aucune migration Supabase nécessaire.
