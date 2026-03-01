

# Fix du drag-and-drop des roles sur mobile

## Probleme identifie

La session replay montre des drags qui demarrent puis sont immediatement annules en boucle. Deux causes :

1. **Conflit PointerSensor + TouchSensor** : Sur mobile, les evenements tactiles declenchent aussi les pointer events. Les deux sensors entrent en competition -- le PointerSensor demarre le drag (apres 5px), puis le TouchSensor interfere et provoque une annulation. Le ServerList (qui fonctionne) utilise uniquement `PointerSensor`.

2. **`restrictToParentElement`** annule le drag si le doigt sort legerement du conteneur parent (tres frequent sur mobile avec un petit conteneur de roles).

## Modifications

### Fichier : `src/components/server-settings/RoleManager.tsx`

**1. Retirer `TouchSensor` des sensors**

Aligner sur le pattern ServerList : utiliser uniquement `PointerSensor` (qui gere deja les touch events via l'API Pointer Events) et `KeyboardSensor`.

**2. Retirer `restrictToParentElement` des modifiers**

Garder uniquement `restrictToVerticalAxis`. Le parent est trop petit sur mobile et provoque des annulations immediates.

**3. Agrandir la zone tactile du grip handle**

Passer de `w-5 h-5` a `w-8 h-8` avec un `min-h-[44px] min-w-[44px]` pour respecter les recommandations d'accessibilite tactile (44px minimum).

## Resume

| Aspect | Avant | Apres |
|---|---|---|
| Sensors | PointerSensor + TouchSensor + KeyboardSensor | PointerSensor + KeyboardSensor |
| Modifiers | restrictToVerticalAxis + restrictToParentElement | restrictToVerticalAxis uniquement |
| Zone tactile grip | w-5 h-5 (~20px) | w-8 h-8 min-44px |

Un seul fichier modifie : `src/components/server-settings/RoleManager.tsx`

