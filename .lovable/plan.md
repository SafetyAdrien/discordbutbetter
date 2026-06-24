## Plan — Fond uniforme sur toutes les cartes du calendrier

### Objectif
Donner à chaque case « jour » du calendrier un fond par défaut légèrement plus clair que la zone du calendrier, et faire en sorte que les images à fond transparent s'intègrent visuellement sur ce même fond (sans bord noir résiduel).

### Changements dans `src/components/channels/CalendarChannel.tsx`

1. **Fond par défaut des cartes** (boucle `paddedDays.map`) :
   - Ajouter une classe de fond systématique `bg-[hsl(var(--surface-1))]` (ou `bg-surface-1`) sur le `<button>` de chaque case — y compris les cases vides et les cases avec événement.
   - Supprimer la condition `!thumbEvent && 'hover:bg-muted'` → garder un hover uniforme (`hover:bg-[hsl(var(--surface-2))]`) pour toutes les cases.
   - Garder `bg-primary/10` pour la case « aujourd'hui » en superposition légère (via ring ou via overlay) afin de ne pas écraser le fond uniforme.

2. **Cases padding (mois précédent/suivant vides)** : remplacer `<div className="aspect-square" />` par une case également stylée avec le fond, pour une grille visuellement cohérente. Option : laisser ces cellules vides sans fond — à confirmer (cf. question ci-dessous, choix par défaut = avec fond plus discret `bg-[hsl(var(--surface-1))]/40`).

3. **Composant `DayThumbnail`** :
   - Aujourd'hui, quand l'image a un alpha, on rend `object-contain` sur fond transparent → le PNG montrait son propre fond noir d'origine (cas Minecraft) car l'image elle-même est noire dans ses coins.
   - Le fond noir visible sur la capture provient en réalité de l'image (icône Minecraft sur fond noir), pas d'un overlay applicatif.
   - Conserver la détection d'alpha existante, mais s'assurer qu'aucun fond noir ne soit ajouté côté carte : la case ayant désormais `bg-surface-1`, le PNG transparent reposera automatiquement sur ce fond clair.
   - Ne plus rendre l'overlay sombre quand `hasAlpha = true` (déjà le cas).

### Tokens / couleurs
- Réutiliser le token sémantique existant `--surface-1` (déjà utilisé ailleurs, ex. `EventAgendaCard`).
- Le hover passe à `--surface-2`.
- Aucun nouveau token requis ; aucun hex en dur.

### Test à mettre à jour / ajouter
- Mettre à jour `DayThumbnail.transparency.test.tsx` : vérifier que la case (button) porte bien la classe de fond `bg-[hsl(var(--surface-1))]` même en présence d'une miniature transparente. (Optionnel — uniquement si le test couvre le button parent ; sinon, ajouter un petit test sur le rendu de la grille avec un mock minimal.)

### Question (1)
Pour les cases du mois précédent/suivant (les jours « vides » de padding), souhaites-tu :
- **A** — même fond `surface-1` que les autres cases (grille uniforme, plein),
- **B** — fond `surface-1` mais opacité réduite (40 %) pour les distinguer,
- **C** — laisser sans fond (vides comme actuellement).

Par défaut, je partirai sur **B** si tu ne précises pas.
