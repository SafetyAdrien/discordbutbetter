## Objectif

Ajouter un panneau d'aperçu live à droite (ou en dessous sur mobile) de la section "Typographie des catégories" qui montre, en temps réel et sans latence, à quoi ressembleront les 4 zones (ChannelList, paramètres utilisateur, paramètres serveur, modal catégorie) pendant que l'utilisateur bascule Decoration/Case.

## Ce que fait le plan

### 1. Restructurer `CategoryCaseSection.tsx` en 2 colonnes
- Passer le contenu actuel dans une grille : `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4`.
- Colonne gauche : les 4 cartes de réglages existantes (inchangées).
- Colonne droite (sticky `lg:sticky lg:top-4`) : nouveau composant `<CategoryCaseLivePreview />`.
- Sur mobile (`<lg`), l'aperçu passe en dessous, plié dans une carte compacte.

### 2. Créer `src/components/appearance/CategoryCaseLivePreview.tsx`
Mini maquette statique qui reflète les vraies UI, sans logique métier ni requête, uniquement du markup + `caseClass(zone, prefs)`. Structure :

```text
Card "Aperçu en direct"
├── Bloc 1 — Liste de salons (ChannelList)
│    ▸ 2 catégories factices ("Général", "Vocal") avec chevron + 2 salons chacune
│    ▸ Applique caseClass('channelCategories', prefs) sur les labels de catégorie
├── Bloc 2 — Paramètres utilisateur
│    ▸ 3 lignes de nav factices ("Mon compte", "Profil", "Apparence")
│    ▸ Applique caseClass('userSettings', prefs) sur les section headers
├── Bloc 3 — Paramètres serveur
│    ▸ 3 lignes ("Personnes", "Rôles", "Salons")
│    ▸ Applique caseClass('serverSettings', prefs)
└── Bloc 4 — Modal catégorie (TabsList)
     ▸ Deux TabsTrigger factices "Aperçu" / "Permissions"
     ▸ Applique caseClass('categoryModal', prefs)
```

Chaque bloc reprend fidèlement les classes tailwind visuelles réelles (couleur, taille, spacing, uppercase par défaut le cas échéant pour serverSettings/userSettings) pour que l'aperçu soit représentatif.

### 3. Réactivité instantanée
- L'aperçu lit `prefs` via `useCategoryCasePreferences()` : la mise à jour est immédiate car le hook a déjà un cache module-level et fait un `setState` optimiste avant l'appel réseau.
- Aucun débounce, aucune requête, aucun état local — la source de vérité reste le hook.

### 4. Retirer la mini-ligne "Aperçu : Général" dans chaque carte de réglage
Redondante avec le nouveau panneau. Ça allège la colonne de gauche.

## Détails techniques (dev)

- Nouveau fichier : `src/components/appearance/CategoryCaseLivePreview.tsx` (~120 lignes, pur JSX).
- Modif : `src/components/appearance/CategoryCaseSection.tsx` — wrapper grid, suppression du mini-preview par carte.
- Aucune modification du hook, du helper `caseClass`, de la DB, ni des composants réels (ChannelList, modals). C'est un aperçu isolé.
- Zéro requête, zéro nouveau state, zéro dépendance ajoutée.

## Hors périmètre

- Pas d'aperçu embarquant les vrais composants (`ChannelList`, `ServerSettingsModal`) — trop lourd, nécessiterait un serveur/contexte fictif, risque de régressions.
- Pas de nouvelles zones typographiques.
- Pas de changement DB.
