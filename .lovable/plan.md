

# Ajouter un raccourci chat sur les salons vocaux au hover

## Objectif

Ajouter une icone de conversation (bulle de message) dans les actions qui apparaissent au survol des salons vocaux et stage dans la sidebar, permettant d'ouvrir directement le panneau de chat du salon vocal.

## Modification

### `src/components/layout/ChannelList.tsx`

Dans le composant `SortableChannel`, ajouter une icone `MessageSquare` dans le bloc d'actions hover (`hidden group-hover:flex`), visible uniquement pour les salons de type `voice` ou `stage`.

Au clic, cette icone declenchera la navigation vers le salon vocal avec le chat ouvert. Comme le composant n'a pas actuellement de callback pour ouvrir le chat directement, on ajoutera un nouveau prop optionnel `onOpenChat` au composant `SortableChannel` et a l'interface `SortableChannelProps`.

#### Changements concrets :

1. **Ajouter `onOpenChat?: () => void`** dans l'interface `SortableChannelProps` (vers la ligne 383)

2. **Ajouter l'icone dans le bloc hover** (ligne 485-502) : inserer une icone `MessageSquare` avant `UserPlus`, conditionnee par `isVoice || isStage`

```tsx
{(isVoice || isStage) && (
  <MessageSquare
    className="w-4 h-4 text-muted-foreground hover:text-foreground"
    onClick={(e) => {
      e.stopPropagation();
      onOpenChat?.();
    }}
  />
)}
```

3. **Passer le callback depuis le parent** (vers lignes 1290 et 1359) : ajouter `onOpenChat` qui navigue vers le salon et active le chat. Le plus simple est de stocker un state `voiceChatChannelId` dans le composant parent pour indiquer quel salon vocal doit s'ouvrir avec le chat actif, et le transmettre au `VoiceChannelView` via un nouveau prop `initialShowChat`.

4. **Modifier `VoiceChannelView`** pour accepter un prop `initialShowChat` qui initialise `showChat` a `true` si fourni.

## Resultat

Au survol d'un salon vocal dans la sidebar, une icone de bulle de message apparaitra a cote des icones existantes. Un clic dessus ouvrira le salon vocal avec le panneau de chat directement visible.

