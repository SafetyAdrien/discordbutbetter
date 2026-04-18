

## Objectif

Améliorer la fonctionnalité Résumés IA pour que :
1. L'IA détecte le **sujet précis** de chaque conversation (pas juste un thème générique)
2. Chaque résumé inclut un **lien d'accès rapide vers le premier message** lié à ce sujet
3. Les **titres soient limités à 20-30 caractères**
4. Le résumé apparaisse dans la banderole "Résumés IA" séparé d'un `-` (ex: `Résumés IA - Bug du chat vocal`)

## Analyse

**Existant** :
- Edge function `summarize-channel` génère des résumés via Gemini avec un prompt qui demande "max 5 mots" pour le titre (pas de garantie de longueur en caractères)
- La table `channel_summaries` a déjà `start_message_id` (parfait pour le lien rapide), mais c'est actuellement le 1er message de la fenêtre, pas le 1er message **du sujet**
- Pas de jump-to-message implémenté lors du clic sur un topic
- `SummariesBar.tsx` affiche "Voir Tous Les Résumés" / "Résumés IA" sans contextualiser le sujet actif

## Solution

### 1. Edge function `summarize-channel/index.ts` — détection précise + ID du 1er message

**Prompt enrichi** :
- Demander explicitement au LLM d'identifier le **sujet précis** (pas générique : « Bug login OAuth Google » plutôt que « Discussion technique »)
- Titre **strictement entre 20 et 30 caractères**
- Pour chaque sujet, retourner l'**indice du premier message** (`first_message_index`) dans la liste fournie, pour qu'on puisse mapper vers `messages[index].id`

**Format** :
```json
{
  "topics": [
    {
      "title": "Bug du chat vocal Discord",  // 20-30 chars
      "summary": "Plusieurs membres signalent...",
      "message_count": 12,
      "first_message_index": 5  // index dans le tableau fourni
    }
  ]
}
```

**Côté serveur** : numéroter les messages avant envoi (`[#0] [Alice]: ...`), puis mapper `first_message_index` → `messages[index].id` à sauvegarder dans `start_message_id`.

**Validation** : tronquer/valider le titre côté serveur (forcer 20-30 chars, sinon ajustement).

### 2. `useSummaries.ts` — exposer `startMessageId` + jump callback

- Ajouter `startMessageId?: string` dans `SummaryTopic`
- Ajouter un callback `onJumpToMessage` (déclenché par `selectTopic`) qui navigue vers le message via `useNavigationState` ou un event custom

### 3. `SummariesBar.tsx` — afficher le sujet actif après `-`

Quand `activeTopic` est défini :
```
[icon] Résumés IA - Bug du chat vocal Discord  ▼
```
Sinon : `Résumés IA` ou `Voir Tous Les Résumés` comme aujourd'hui.

### 4. Navigation vers le message

Au clic sur un topic dans le dropdown :
- Marquer comme lu (déjà fait)
- **Naviguer/scroller** vers `start_message_id` dans `ChatArea` (utiliser le système existant de jump-to-message via les mentions de salons — voir `chat/channel-mention-navigation-architecture`)

## Fichiers modifiés

- `supabase/functions/summarize-channel/index.ts` — prompt strict (20-30 chars, sujet précis, `first_message_index`), mapping serveur vers `start_message_id`
- `src/hooks/useSummaries.ts` — exposer `startMessageId` + handler jump
- `src/components/summaries/SummariesBar.tsx` — affichage `Résumés IA - {titre}` quand sujet actif
- `src/components/chat/ChatArea.tsx` — déclencher le scroll/jump vers `startMessageId` lors de la sélection d'un topic (via state partagé ou prop)

## Résultat attendu

- Titres précis et concis (20-30 chars), ex: « Bug login Google OAuth »
- Clic sur un résumé → saut instantané vers le premier message lié
- Banderole : `Résumés IA - Bug login Google OAuth` quand un sujet est sélectionné

