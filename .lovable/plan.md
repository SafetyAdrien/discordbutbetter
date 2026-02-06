

# Flou sur les Previews du Carrousel

## Objectif
Appliquer un léger effet de flou aux images adjacentes (non sélectionnées) dans le carrousel pour créer un effet de profondeur et mettre en valeur l'image principale.

---

## Approche technique

Le carrousel utilise Embla et nous avons déjà accès à `currentIndex` via l'API. L'idée est de passer cette information à chaque `ImageAttachment` pour appliquer conditionnellement un flou sur les images qui ne sont pas l'image active.

---

## Modifications

### Fichier : `src/components/chat/MessageAttachments.tsx`

#### 1. Modifier `ImageAttachment` pour accepter un prop `isActive`

```tsx
function ImageAttachment({ 
  attachment, 
  onOpenLightbox,
  isActive = true  // Par défaut actif (pour l'usage hors carrousel)
}: { 
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
  isActive?: boolean;
}) {
  // ... état existant

  return (
    <div className="relative group">
      <img
        src={attachment.url}
        alt={attachment.description || attachment.name}
        className={cn(
          'rounded-lg cursor-pointer transition-[filter,opacity] duration-200 max-h-80 w-full object-cover',
          !revealed && 'blur-2xl brightness-50',
          !loaded && 'opacity-0',
          // Nouveau : flou léger pour les images non actives
          !isActive && revealed && 'blur-[2px] brightness-90'
        )}
        onClick={() => revealed ? onOpenLightbox() : setRevealed(true)}
        onLoad={() => setLoaded(true)}
      />
      {/* ... reste du composant inchangé */}
    </div>
  );
}
```

#### 2. Modifier `ImageCarousel` pour passer `isActive`

```tsx
function ImageCarousel({ 
  images, 
  onOpenLightbox 
}: { 
  images: StoredAttachment[];
  onOpenLightbox: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // ... useEffect existant

  return (
    <div className="relative max-w-md group">
      <Carousel ...>
        <CarouselContent className="-ml-2">
          {images.map((img, index) => (
            <CarouselItem key={img.id} className="pl-2 basis-[85%]">
              <ImageAttachment
                attachment={img}
                onOpenLightbox={() => onOpenLightbox(index)}
                isActive={index === currentIndex}  // Nouveau prop
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* ... navigation */}
      </Carousel>
      {/* ... pagination */}
    </div>
  );
}
```

---

## Résultat visuel

```text
+------------------------------------------+
|  [<]  +-------------+  +--------+  [>]   |
|       |             |  |  flou  |        |
|       |   Image 1   |  |  léger |        |
|       |   (nette)   |  | (blur) |        |
|       |             |  |        |        |
|       +-------------+  +--------+        |
|              ●  ○  ○  ○                  |
+------------------------------------------+
```

**Effet appliqué aux images non actives :**
- `blur-[2px]` : Flou très léger (juste assez pour créer de la profondeur)
- `brightness-90` : Légère réduction de luminosité (effet de focus sur l'image active)
- Transition fluide grâce à `transition-[filter,opacity] duration-200` déjà en place

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/chat/MessageAttachments.tsx` | Ajouter prop `isActive` à `ImageAttachment`, l'utiliser dans `ImageCarousel` |

