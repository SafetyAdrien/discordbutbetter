
# Ajout du support copy/paste dans les modales

## Probleme

Les raccourcis clavier natifs (Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X) ne fonctionnent pas dans les champs de saisie a l'interieur des modales (dialogs). Cela empeche notamment de copier/coller du texte dans le champ de nom de salon dans les parametres.

## Cause

Le composant `DialogContent` de Radix UI peut intercepter les evenements clavier. Il manque un gestionnaire `onKeyDown` qui protege les raccourcis natifs en arretant leur propagation quand l'utilisateur utilise Ctrl/Cmd avec C, V, A ou X.

## Correction

**Fichier : `src/components/ui/dialog.tsx`**

Ajouter un `onKeyDown` dans le `DialogPrimitive.Content` qui detecte les combinaisons Ctrl/Cmd + C/V/A/X et appelle `e.stopPropagation()` pour empecher l'interception par d'autres gestionnaires. Cela permet aux raccourcis natifs du navigateur (copier, coller, tout selectionner, couper) de fonctionner normalement dans tous les inputs et textareas des modales.

## Details techniques

```text
onKeyDown = (e) => {
  const modifier = e.ctrlKey || e.metaKey;
  if (modifier && ['c','v','a','x'].includes(e.key.toLowerCase())) {
    e.stopPropagation();  // laisse le navigateur gerer le raccourci
  }
}
```

Un seul fichier modifie, correction globale pour toutes les modales de l'application.
