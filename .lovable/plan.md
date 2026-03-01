
## Réduire la sensibilité du drag&drop des serveurs sur mobile

### Problème
Le drag&drop s'active trop facilement sur mobile (delay: 200ms, tolerance: 15px), ce qui empêche de scroller confortablement dans la liste quand il y a beaucoup de serveurs.

### Solution
Augmenter les seuils d'activation du `TouchSensor` dans `MobileServersView.tsx` (ligne 175) :
- **delay** : passer de `200ms` à `350ms` (appui long plus délibéré)
- **tolerance** : passer de `15px` à `8px` (moins de mouvement autorisé pendant l'appui, annule le drag si l'utilisateur commence à scroller)

Augmenter aussi la distance du `PointerSensor` de `5` à `10` pour les appareils hybrides.

### Fichier impacté
- `src/components/mobile/MobileServersView.tsx` (lignes 173-176 uniquement)

### Détail technique
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
);
```

Le `delay: 350` oblige un appui long plus marqué avant d'activer le drag. Le `tolerance: 8` fait que si le doigt bouge de plus de 8px pendant ce délai (= scroll), le drag est annulé et le scroll natif prend le relais.
