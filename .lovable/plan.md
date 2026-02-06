

# Transition de Flou Progressive dans le Carrousel

## Objectif
Faire en sorte que l'effet de flou sur les images adjacentes se dissipe progressivement pendant le défilement, créant une transition fluide et naturelle plutôt qu'un changement binaire.

---

## Analyse de l'existant

### Comportement actuel
```tsx
// L'effet de flou est binaire (on/off)
!isActive && revealed && 'blur-[2px] brightness-90'
```

L'état `isActive` est basé sur `selectedScrollSnap()` qui ne se met à jour qu'une fois le snap terminé. Résultat : le flou change brusquement à la fin du scroll.

### API Embla disponible
Embla expose un événement `scroll` et des méthodes utiles :
- `scrollProgress()` : progression globale du carrousel (0 à 1)
- `scrollSnapList()` : positions des snaps (ex: [0, 0.5, 1])
- Événement `scroll` : déclenché pendant le défilement

---

## Approche technique

Utiliser `scrollProgress()` pour calculer un **facteur de flou progressif** pour chaque image basé sur la distance entre la position actuelle et la position de l'image.

```text
Position scroll: 0.25 (entre image 0 et 1)

Image 0: distance = 0.25 → blurFactor = 0.25 → blur léger
Image 1: distance = 0.25 → blurFactor = 0.25 → blur léger  
Image 2: distance = 0.75 → blurFactor = 0.75 → blur maximum
```

---

## Plan d'implémentation

### 1. Modifier `ImageCarousel` pour tracker la progression

```tsx
function ImageCarousel({ images, onOpenLightbox }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    
    const snapList = api.scrollSnapList(); // ex: [0, 0.5, 1]
    
    const onScroll = () => {
      setScrollProgress(api.scrollProgress());
    };
    
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };
    
    api.on('scroll', onScroll);
    api.on('select', onSelect);
    
    return () => {
      api.off('scroll', onScroll);
      api.off('select', onSelect);
    };
  }, [api]);

  // Calculer le facteur de flou pour chaque image
  const getBlurFactor = (index: number) => {
    if (!api) return index === 0 ? 0 : 1;
    
    const snapList = api.scrollSnapList();
    const snapPosition = snapList[index];
    
    // Distance entre la position actuelle et la position de l'image
    const distance = Math.abs(scrollProgress - snapPosition);
    
    // Normaliser : 0 = image active (pas de flou), 1 = loin (flou max)
    // Utiliser la distance entre deux snaps comme référence
    const snapGap = snapList[1] - snapList[0];
    const normalizedDistance = Math.min(distance / snapGap, 1);
    
    return normalizedDistance;
  };

  return (
    <Carousel ...>
      <CarouselContent>
        {images.map((img, index) => (
          <CarouselItem key={img.id} className="pl-2 basis-[85%]">
            <ImageAttachment
              attachment={img}
              onOpenLightbox={() => onOpenLightbox(index)}
              blurFactor={getBlurFactor(index)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
```

---

### 2. Modifier `ImageAttachment` pour accepter `blurFactor`

```tsx
function ImageAttachment({ 
  attachment, 
  onOpenLightbox,
  blurFactor = 0  // 0 = net, 1 = flou max
}: { 
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
  blurFactor?: number;
}) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [loaded, setLoaded] = useState(false);

  // Calculer les valeurs de style dynamiques
  const blurValue = revealed ? blurFactor * 2 : 0; // 0-2px
  const brightnessValue = revealed ? 1 - (blurFactor * 0.1) : 1; // 100%-90%

  return (
    <div className="relative group">
      <img
        src={attachment.url}
        className={cn(
          'rounded-lg cursor-pointer max-h-80 w-full object-cover',
          // Transition fluide pour filter
          'transition-[filter,opacity] duration-150 ease-out',
          !revealed && 'blur-2xl brightness-50',
          !loaded && 'opacity-0'
        )}
        style={{
          // Appliquer le flou progressif uniquement si révélé
          filter: revealed 
            ? `blur(${blurValue}px) brightness(${brightnessValue})`
            : undefined
        }}
        onClick={() => revealed ? onOpenLightbox() : setRevealed(true)}
        onLoad={() => setLoaded(true)}
      />
      {/* ... reste du composant */}
    </div>
  );
}
```

---

### 3. Optimisation de performance

Pour éviter trop de re-renders pendant le scroll :

```tsx
// Utiliser requestAnimationFrame pour throttle le scroll
useEffect(() => {
  if (!api) return;
  
  let rafId: number;
  
  const onScroll = () => {
    // Annuler le frame précédent
    if (rafId) cancelAnimationFrame(rafId);
    
    rafId = requestAnimationFrame(() => {
      setScrollProgress(api.scrollProgress());
    });
  };
  
  api.on('scroll', onScroll);
  
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    api.off('scroll', onScroll);
  };
}, [api]);
```

---

## Résultat visuel attendu

```text
Défilement de Image 1 vers Image 2 :

Position 0%    : [Image 1: net] [Image 2: flou 2px]
Position 25%   : [Image 1: flou 0.5px] [Image 2: flou 1.5px]
Position 50%   : [Image 1: flou 1px] [Image 2: flou 1px]
Position 75%   : [Image 1: flou 1.5px] [Image 2: flou 0.5px]
Position 100%  : [Image 1: flou 2px] [Image 2: net]
```

L'effet de transition est synchronisé avec le mouvement du doigt/souris, créant une expérience fluide et naturelle.

---

## Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/chat/MessageAttachments.tsx` | Remplacer `isActive` par `blurFactor`, ajouter tracking de `scrollProgress`, appliquer styles dynamiques |

---

## Considérations techniques

### Pourquoi `duration-150` au lieu de `duration-200` ?
La transition CSS ne doit pas "lagger" derrière le scroll. Une durée plus courte (150ms) permet au style de suivre le mouvement de manière plus réactive.

### Compatibilité avec l'image unique
Quand une seule image est affichée (pas de carrousel), `blurFactor` reste à 0 par défaut, préservant le comportement actuel.

### GPU Acceleration
Le filtre `blur()` et `brightness()` sont déjà optimisés par le GPU. La transition `filter` est performante sur les navigateurs modernes.

