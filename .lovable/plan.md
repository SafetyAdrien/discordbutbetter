**Objectif** : empêcher tout saut de scroll quand la hauteur du contenu change pendant l'édition d'un message à bloc de code, et afficher un bandeau « Aller en bas » quand l'utilisateur n'est pas en bas.

**Modifications dans `src/components/chat/ChatArea.tsx`** :

1. **Suivi du scroll** :
   - Récupérer une `ref` sur le viewport interne de `ScrollArea` (`[data-radix-scroll-area-viewport]`).
   - Ajouter un state `isAtBottom` (booléen) et un `ref` `wasAtBottomRef` pour mémoriser l'état avant un changement de taille.
   - Écouter l'event `scroll` du viewport : `isAtBottom = scrollHeight - scrollTop - clientHeight < 24` (24px tolérance).

2. **Stabilisation pendant l'édition / resize** :
   - Ajouter un `ResizeObserver` sur le contenu du viewport : si `wasAtBottomRef.current === true` quand la taille change, forcer `viewport.scrollTop = viewport.scrollHeight` sans animation (`behavior: 'auto'`).
   - Mettre à jour `wasAtBottomRef` à chaque event scroll (avant que l'observer ne déclenche).
   - Conséquence : édition d'un message → la textarea grandit → si l'utilisateur était collé en bas, il y reste pixel-perfect sans saut.

3. **Modifier l'auto-scroll existant** (ligne 410-415) :
   - Remplacer le `scrollIntoView` sur `[messages.length]` par : si `wasAtBottomRef.current`, scroller en bas ; sinon, ne rien faire (l'utilisateur reste où il est et verra la pill).

4. **Bandeau « Aller en bas »** :
   - Au-dessus du `MessageInput` (avant `TypingIndicator`, ligne ~1966), rendre conditionnellement :
     ```tsx
     {!isAtBottom && (
       <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border/40 shadow-md text-xs">
         <span className="text-muted-foreground">Vous consultez d'anciens messages</span>
         <button onClick={scrollToBottom} className="px-2 py-1 rounded-full bg-primary text-primary-foreground font-medium">
           Aller en bas
         </button>
       </div>
     )}
     ```
   - Wrapper le conteneur input avec `relative` pour positionner la pill.
   - `scrollToBottom` : `viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })`.

5. **Aucun autre fichier modifié.**

**Vérification** :
- Éditer un message à bloc de code en bas de liste → reste en bas, pas de saut.
- Faire défiler vers le haut → la pill apparaît au-dessus du composer.
- Cliquer la pill → scroll fluide vers le bas, la pill disparaît.
- Nouveau message reçu pendant qu'on lit plus haut → la pill reste visible (pas d'auto-scroll forcé).