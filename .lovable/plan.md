# Correctifs Calendrier

## 1. Modal — Configuration de date « Journée entière »
Dans `src/components/channels/calendar/ChannelEventModal.tsx` :
- Quand `allDay = true` :
  - Masquer/désactiver complètement les inputs `date` de début **et** de fin.
  - Afficher à la place un sélecteur unique « Date » (une seule journée), ou un range simple « Du / Au » uniquement en `date` si l'utilisateur veut plusieurs jours — mais sans heures.
- Quand `allDay = false` : comportement actuel (date + time pour début et fin).
- Recalibrer `handleSubmit` : en mode journée entière → `starts_at = 00:00:00`, `ends_at = 23:59:59` du jour choisi (ou du dernier jour si plusieurs).

## 2. Suppression de la sélection de couleur
- Retirer le bloc « Couleur » du modal (preset + ModernColorPicker + state `color`/`showColorPicker`).
- Garder la colonne `color` côté DB pour compat (default `#5865F2`), simplement ne plus l'envoyer depuis le client.
- Retirer l'affichage des pastilles de couleur dans `CalendarChannel.tsx` (ou forcer une couleur neutre tirée du token `--primary`).

## 3. Canvas de redimensionnement de la miniature
Nouveau composant `src/components/channels/calendar/ThumbnailCanvasEditor.tsx` :
- Après upload local d'une image, l'afficher dans un canvas (ratio 21/9 comme la carte).
- L'utilisateur peut :
  - Déplacer l'image dans le cadre (drag).
  - Redimensionner via 4 poignées coin (flèches diagonales) + 4 poignées milieu (flèches axiales) qui suivent l'échelle de l'image.
  - Wheel/pinch pour zoom (bonus).
- Sur validation : rendre le canvas à la taille cible (ex. 1680×720), exporter en `Blob` JPEG/PNG, puis appeler `uploadEventThumbnail` avec ce blob (au lieu du fichier brut).
- Intégrer dans le modal : après sélection de fichier → afficher l'éditeur ; bouton « Appliquer » → upload du blob recadré ; bouton « Annuler » → revenir.

Aucune lib externe (canvas natif + pointer events), aligné sur l'approche existante de `AvatarUploadEditor`.

## 4. Fix « l'événement ne se publie pas »
Cause probable : la policy INSERT exige la permission `create_events` (ou `manage_events`), que les membres standards n'ont pas par défaut → l'insert échoue silencieusement (toast d'erreur peut être masqué par le close du modal).

Actions :
- **DB (migration)** : assouplir la policy d'insert pour autoriser tout membre disposant de `view_channel` sur le salon calendrier à créer un événement (aligné avec le besoin produit — la gate « manage » reste pour update/delete des événements d'autrui via `manage_events`). Update/Delete restent en l'état (créateur OU `manage_events`).
- **Client** : dans `handleSubmit`, attendre la mutation **avant** `onOpenChange(false)`, et n'appeler `onOpenChange(false)` que dans le `then` réussi pour que les erreurs s'affichent. Logger `error.message` + `error.code` dans le toast pour debug futur.
- **Storage RLS** : aligner la policy d'upload du bucket `channel-event-thumbnails` sur `view_channel` également (sinon le upload échoue avant l'insert).

## Détails techniques

```text
ChannelEventModal
 ├─ allDay ? <DateOnlyRange/>  : <DateTimeRange/>
 ├─ Thumbnail
 │    ├─ pas d'image  → bouton « Ajouter »
 │    ├─ image brute  → ThumbnailCanvasEditor (drag + 8 handles)
 │    └─ image validée → preview + bouton « Re-éditer » / Trash
 └─ (couleur retirée)
```

Migration SQL (résumé) :

```sql
DROP POLICY "Members with create_events can insert" ON public.channel_calendar_events;
CREATE POLICY "Members can insert events" ON public.channel_calendar_events
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_channel_permission(auth.uid(), channel_id, 'view_channel'::server_permission)
);
-- même bascule sur storage.objects (upload thumbnails) → view_channel
```

## Fichiers touchés
- `src/components/channels/calendar/ChannelEventModal.tsx` (refonte date + suppression couleur + intégration éditeur)
- `src/components/channels/calendar/ThumbnailCanvasEditor.tsx` (nouveau)
- `src/components/channels/CalendarChannel.tsx` (retirer affichage couleur)
- `src/hooks/useChannelCalendarEvents.ts` (signature `uploadEventThumbnail` accepte Blob)
- 1 nouvelle migration (RLS insert + storage)
