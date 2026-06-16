**Problème** : Les blocs de code rendus dans les messages (`src/components/ui/code-block.tsx`) n'ont aucune limite de hauteur. Un long bloc remplit l'écran et empêche de faire défiler la conversation pour revenir aux derniers messages.

**Correction** :

1. **`src/components/ui/code-block.tsx`** — Ajouter une hauteur maximale et un défilement vertical interne :
   - `<pre>` : retirer `overflow-hidden`, ajouter `max-h-[360px] overflow-auto`.
   - `<code>` : conserver `whitespace-pre` pour le défilement horizontal sur les longues lignes.
   - Le bouton "Copier" reste `absolute` et `sticky-like` via `top-1.5 right-1.5` (déjà positionné, reste visible car positionné par rapport à `<pre>` scrollable).
   
   Pour que le bouton reste visible même quand le bloc est scrollé, le wrapper devient `<div class="relative">` autour du `<pre>` scrollable, avec le bouton sur le `<div>` (et non sur le `<pre>`).

2. **Conteneur de rédaction (`InputMarkdownOverlay`)** — Aucun changement nécessaire : le `<textarea>` est déjà plafonné (`max-h-[200px] overflow-y-auto` dans `MessageInput.tsx`), donc le bloc de code dans la zone de saisie défile naturellement avec la textarea.

**Vérification** : Coller un bloc de code de 80 lignes dans un message → le bloc affiche ~360px de hauteur avec ascenseur vertical interne, le scroll de la conversation reste fluide et atteint les derniers messages. Le bouton Copier reste visible en haut à droite du bloc.