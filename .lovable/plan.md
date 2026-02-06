

# Carrousel d'Images pour les Messages

## Objectif
Remplacer la grille d'images actuelle par un carrousel interactif pour une meilleure experience visuelle, specialement quand plusieurs images sont uploadees.

---

## Analyse de l'existant

### Affichage actuel (`MessageAttachments.tsx`)
- **1 image** : Affichage simple en colonne
- **2+ images** : Grille `grid-cols-2` avec `max-w-lg`
- Lightbox pour agrandir les images au clic

### Composant Carousel disponible
Le projet dispose deja d'un composant `Carousel` base sur Embla avec :
- Navigation fleches (prev/next)
- Support clavier (ArrowLeft/ArrowRight)
- API pour tracker la slide courante

---

## Plan d'implementation

### 1. Logique conditionnelle pour le carrousel

| Nombre d'images | Affichage |
|-----------------|-----------|
| 1 image | Image simple (pas de carrousel) |
| 2-3 images | Carrousel avec apercu visible des images adjacentes |
| 4+ images | Carrousel avec indicateurs de pagination |

---

### 2. Modifier `MessageAttachments.tsx`

**Nouvelles fonctionnalites :**

```tsx
// Imports
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';

// Nouveau composant pour le carrousel d'images
function ImageCarousel({ 
  images, 
  onOpenLightbox 
}: { 
  images: StoredAttachment[];
  onOpenLightbox: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    api.on('select', () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="relative max-w-md group">
      <Carousel 
        setApi={setApi}
        opts={{ loop: false, align: 'start' }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {images.map((img, index) => (
            <CarouselItem key={img.id} className="pl-2 basis-[85%]">
              <ImageAttachment
                attachment={img}
                onOpenLightbox={() => onOpenLightbox(index)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Fleches de navigation - visibles au hover */}
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CarouselNext className="right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </Carousel>
      
      {/* Indicateurs de pagination (dots) */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                index === currentIndex 
                  ? "bg-primary" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Aller a l'image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 3. Mise a jour du composant principal

```tsx
export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ... filtrage existant

  const images = attachments.filter(a => a.type === 'image');

  return (
    <div className="mt-2 space-y-2">
      {/* Images - Logique conditionnelle */}
      {images.length === 1 && (
        <ImageAttachment
          attachment={images[0]}
          onOpenLightbox={() => setLightboxIndex(0)}
        />
      )}
      
      {images.length > 1 && (
        <ImageCarousel 
          images={images}
          onOpenLightbox={setLightboxIndex}
        />
      )}

      {/* Videos et Files - inchanges */}
      
      {/* Lightbox amelioree avec navigation */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="...">
          {/* Navigation dans le lightbox */}
          {images.length > 1 && lightboxIndex !== null && (
            <>
              <button onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}>
                <ArrowLeft />
              </button>
              <button onClick={() => setLightboxIndex(Math.min(images.length - 1, lightboxIndex + 1))}>
                <ArrowRight />
              </button>
            </>
          )}
          {lightboxIndex !== null && (
            <img src={images[lightboxIndex].url} ... />
          )}
          {/* Compteur */}
          <span>{lightboxIndex + 1} / {images.length}</span>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### 4. Styles specifiques au carrousel

```css
/* Dans index.css - optionnel */
.carousel-slide-visible {
  @apply opacity-100 scale-100;
}

.carousel-slide-adjacent {
  @apply opacity-60 scale-95;
}
```

---

## Design du carrousel

```text
+------------------------------------------+
|  [<]  +-------------+  +--------+  [>]   |
|       |             |  |        |        |
|       |   Image 1   |  | Img 2  |        |
|       |  (85% width)|  |(apercu)|        |
|       |             |  |        |        |
|       +-------------+  +--------+        |
|              o  o  o  o                  |
|           (dots pagination)              |
+------------------------------------------+
```

**Caracteristiques :**
- Image principale visible a 85% de largeur
- Apercu de l'image suivante visible (effet "peek")
- Fleches au hover seulement
- Dots cliquables pour navigation directe
- Lightbox avec navigation fleches pour images agrandies

---

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/chat/MessageAttachments.tsx` | Nouveau composant `ImageCarousel`, lightbox avec navigation |

---

## Resultats attendus

- **1 image** : Comportement inchange
- **2+ images** : Carrousel fluide avec navigation intuitive
- **Lightbox** : Navigation entre images sans fermer le modal
- **Performance** : Utilisation d'Embla (deja installe, performant)
- **Accessibilite** : Navigation clavier + ARIA labels

