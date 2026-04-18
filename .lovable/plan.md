

## Plan

### 1. Reduced Message Composer (collapsible AnnouncementComposer)

Ajouter un petit bouton de réduction/agrandissement dans le `AnnouncementComposer`. Quand l'utilisateur n'est pas en train de rédiger, il peut cliquer sur l'icône pour réduire le composer en hauteur (mode compact = une seule barre cliquable). Cliquer dessus ré-ouvre le composer complet.

**Comportement :**
- État local `collapsed: boolean` (default: `false`).
- Bouton toggle (icône `ChevronUp` / `ChevronDown`) placé dans la zone footer à droite, juste avant le bouton Send (ou en haut-droit du composer pour rester accessible quand collapsed).
- **Mode étendu** (default) : composer complet inchangé + bouton `ChevronDown` en haut-droite pour réduire.
- **Mode réduit** : barre fine cliquable (~40px) avec icône mégaphone + texte "Rédiger une annonce dans #channel" + bouton `ChevronUp` à droite. Click n'importe où sur la barre = ré-étendre.
- Auto-expansion forcée si `title`, `message`, `attachments` ou `headerImage` non vides (pas réductible si du contenu est en cours de rédaction → on désactive le bouton réduire ou on garde l'état mais on rend visuellement le contenu).
- Préservation de l'état pendant la session (pas de persistance localStorage — instance-locale suffit).

**Fichier modifié :**
- `src/components/channels/announcement/AnnouncementComposer.tsx` — ajouter `collapsed` state + bouton toggle + rendu conditionnel mode réduit.

---

### 2. Fix Member Toggle List

**Bug identifié :** Les composants `ForumChannel`, `CalendarChannel`, `TasksChannel` reçoivent les props `onToggleMembers` et `showMembers` (depuis `Index.tsx`), mais **ne rendent jamais le bouton Users dans leur en-tête**. Conséquence : si l'utilisateur masque la liste des membres depuis un salon textuel puis navigue vers un salon Forum/Calendar/Tasks, il n'a aucun moyen de la rouvrir.

`AnnouncementChannel` et `MediaChannel` rendent déjà ce bouton correctement → pas à toucher.

**Fix :** Ajouter dans le header de chaque composant manquant un bouton `Users` identique à celui d'`AnnouncementChannel` (ligne 594) :
```tsx
{onToggleMembers && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="iconSm" onClick={onToggleMembers}
        className={cn(showMembers && "bg-surface-hover")}>
        <Users className="w-5 h-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{showMembers ? "Masquer les membres" : "Afficher les membres"}</TooltipContent>
  </Tooltip>
)}
```

**Fichiers modifiés :**
- `src/components/channels/ForumChannel.tsx` — ajouter bouton dans `<div className="flex items-center gap-2 ml-auto">`.
- `src/components/channels/CalendarChannel.tsx` — idem.
- `src/components/channels/TasksChannel.tsx` — idem.

---

## Résultat
1. Composer d'annonce avec bascule réduit/étendu via une icône — utile quand l'utilisateur souhaite voir plus de messages sans masquer totalement le composer.
2. Bouton Users disponible dans **tous** les types de salons (texte, annonce, média, forum, calendrier, tâches) → la liste des membres est toujours ré-ouvrable depuis n'importe où.

