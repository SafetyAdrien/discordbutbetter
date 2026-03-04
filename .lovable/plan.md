

# Corriger la détection des mentions de salons (#) et afficher les icônes de type

## Problèmes identifiés

1. **`#` + espace** : la détection dans `detectMentionTrigger` accepte n'importe quel caractère après `#`, y compris un espace seul. Un `# ` devrait fermer l'autocomplete (c'est un titre Markdown, pas une mention).
2. **Pas de vérification** contre la liste de salons existants : l'autocomplete s'affiche même si aucun salon ne correspond.
3. **Icône générique** `<Hash>` pour tous les salons dans l'autocomplete au lieu de l'icône correspondant au type de salon.

## Corrections

### 1. `src/components/chat/MessageInput.tsx` — `detectMentionTrigger`
- Après extraction de `afterHash` (le texte après `#`), vérifier :
  - Si `afterHash` est vide → afficher l'autocomplete (liste tous les salons)
  - Si `afterHash` commence par un espace → **ne pas** déclencher l'autocomplete (c'est un titre Markdown `# `)
  - Sinon → déclencher normalement
- Ajouter une vérification rapide : si aucun salon ne matche la query (via `normalizeForSearch`), retourner `null` au lieu de déclencher le state mention

### 2. `src/components/chat/MentionAutocomplete.tsx` — Icônes par type de salon
- Importer les icônes Streamline (`StreamlineHash`, `StreamlineVoice`, `StreamlineForum`, `StreamlineMegaphone`, `StreamlineMedia`, `StreamlineCalendar`, `StreamlineTasks`, `StreamlineStage`, `StreamlineLink`)
- Créer un map `channelTypeIcons` identique à celui de `ChannelList.tsx`
- Remplacer `<Hash>` par l'icône correspondant à `channel.type` dans le rendu des suggestions de salons

