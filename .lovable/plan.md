

# Suppression de l'apercu et formatage en temps reel

## Changements

### 1. CreateChannelModal.tsx
- **Supprimer** les lignes 165-169 (bloc "Apercu")
- **Modifier** le `onChange` de l'input (ligne 160) pour appliquer `formatStrictChannelName` en temps reel quand le mode strict est actif (type text et flexible desactive) : le texte saisi sera immediatement converti en minuscules sans espaces

### 2. ChannelOverview.tsx
- **Supprimer** les lignes 197-201 (bloc "Apercu")
- **Modifier** le `onChange` de l'input (ligne 191) pour appliquer `formatStrictChannelName` en temps reel quand le mode strict est actif

## Details techniques

**CreateChannelModal** - onChange modifie :
```typescript
onChange={(e) => {
  const val = e.target.value;
  setName((!isFlexible && type === 'text') ? formatStrictChannelName(val) : val);
}}
```

**ChannelOverview** - onChange modifie :
```typescript
onChange={(e) => {
  const val = e.target.value;
  setName(shouldFormatStrict ? formatStrictChannelName(val) : val);
}}
```

Ainsi, l'utilisateur voit directement le nom formate dans le champ de saisie, sans avoir besoin d'un apercu separe.

