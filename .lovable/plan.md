Objectif : corriger uniquement le comportement de scroll dans `ChatArea.tsx`.

Plan :
1. Remplacer l’affichage immédiat du bouton « Aller en bas » par un seuil : il apparaîtra seulement quand l’utilisateur est éloigné d’environ 150px du bas de la liste, avec une animation très courte déjà cohérente avec l’UI.
2. Renforcer le mode édition pour qu’aucun auto-scroll programmatique ne puisse se déclencher pendant `editingMessageId` :
   - bloquer l’effet d’auto-scroll sur nouveaux messages,
   - bloquer le `ResizeObserver`,
   - éviter de réactiver ces effets au simple changement d’état d’édition.
3. Stabiliser explicitement la position de scroll au démarrage de l’édition : mémoriser la position du viewport avant remplacement du rendu Markdown/code par le textarea, puis la restaurer sans animation après le rendu pour éviter le saut causé par les changements de hauteur des blocs de code.
4. Garder le bouton placé environ 5-7px au-dessus du conteneur de rédaction, sans modifier le reste de l’interface.