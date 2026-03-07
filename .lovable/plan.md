

# Refonte UI — Design Slack/Teams Moderne + Éléments Innovants

## Réalité du projet

L'application contient **200+ fichiers** et **50 000+ lignes de code** d'interface. Une refonte complète en une seule passe risque de casser des dizaines de fonctionnalités. Je propose une approche **par phases**, chaque phase livrant un impact visuel immédiat tout en préservant la stabilité.

---

## Phase 1 — Fondations visuelles (ce message)

### 1.1 Nouvelle palette de couleurs + typographie
**Fichier**: `src/index.css`

Nouvelle palette inspirée Slack/Teams :
- Background principal plus chaud : gris-bleu `220 14% 11%` → `222 14% 10%`
- Surfaces élevées avec meilleure séparation (plus de contraste entre sidebar/chat/panels)
- Primary : bleu plus vibrant et moderne `225 90% 60%`
- Texte : meilleure lisibilité avec `220 10% 93%`
- Bordures subtiles semi-transparentes
- Radius augmenté : `0.75rem` → `1rem` pour un look plus doux

### 1.2 Refonte ServerList — Sidebar flottante épurée
**Fichier**: `src/components/layout/ServerList.tsx`

- Background plus profond avec séparateur subtil au lieu d'une bordure
- Icônes serveur avec `ring` au survol au lieu du changement de border-radius brut
- Indicateur actif : barre latérale lumineuse avec animation spring (framer-motion)
- Tooltip enrichi avec glassmorphism
- Boutons "Découvrir" et "Créer" redessinés : icônes avec glow subtil au survol

### 1.3 Refonte ChannelList — Organisation claire et aérée
**Fichier**: `src/components/layout/ChannelList.tsx`

- Header serveur : bannière/avatar avec overlay gradient + nom en gras
- Catégories : typographie uppercase plus légère, espacement accru
- Salons : icônes colorées par type (vert pour vocal, bleu pour texte, orange pour annonces)
- Salon actif : fond avec gradient subtil + barre latérale colorée
- Zone utilisateur (footer) : carte glassmorphism avec statut animé
- Micro-interactions : framer-motion `whileHover` et `whileTap`

### 1.4 Refonte ChatArea — Zone de conversation moderne
**Fichier**: `src/components/chat/ChatArea.tsx`

- Header : plus spacieux, fond transparent avec blur, séparateur gradient
- Messages : espacement optimisé, avatar plus grand (40px), timestamp discret
- Hover actions : barre flottante avec ombre portée et coins arrondis
- Zone de saisie : input élevé avec bord lumineux au focus, coins arrondis `16px`
- Transitions d'apparition des messages (fade-in slide-up)

### 1.5 Refonte MemberList — Panel contextuel élégant
**Fichier**: `src/components/layout/MemberList.tsx`

- Header avec compteur de membres + icône de recherche
- Séparation par rôles avec badges colorés inline
- Statuts d'activité avec icônes et couleurs dédiées
- Hover : élévation subtile + fond semi-transparent

### 1.6 Animations globales
**Fichier**: `tailwind.config.ts` + `src/index.css`

- Nouvelles keyframes : `slide-in-right`, `slide-in-left`, `fade-up`, `scale-in`
- Transitions de page avec `AnimatePresence` + `motion.div`
- Scrollbars personnalisées plus fines avec hover reveal

---

## Phase 2 — Mobile (message suivant)

- Bottom nav redesignée avec indicateur animé
- Transitions entre vues avec animations slide fluides
- Cartes serveur enrichies dans la vue serveurs
- Chat mobile avec gestes améliorés

## Phase 3 — Modals et settings (message d'après)

- Modals de paramètres avec navigation sidebar/tabs redesignée
- Profils utilisateur avec layout carte élevée
- Formulaires avec inputs modernes et feedback visuel

## Phase 4 — Salons spéciaux (message suivant)

- Voice channel avec grid redesignée
- Forum/Media/Calendar avec layouts spécialisés
- Stage channel avec UI immersive

---

## Détails techniques — Phase 1

### CSS Variables (nouvelles)
```css
--background: 222 14% 10%;
--foreground: 220 10% 93%;
--card: 222 16% 8%;
--popover: 222 16% 13%;
--primary: 225 90% 60%;
--muted: 222 12% 18%;
--muted-foreground: 220 10% 62%;
--border: 220 10% 15%;
--input: 222 14% 13%;
--sidebar-background: 222 18% 6%;
--surface-elevated: 222 14% 12%;
--surface-hover: 222 14% 16%;
--radius: 1rem;
```

### Nouvelles animations Tailwind
```ts
keyframes: {
  "fade-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  "slide-in-right": { from: { opacity: 0, transform: "translateX(12px)" }, to: { opacity: 1, transform: "translateX(0)" } },
  "scale-in": { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "scale(1)" } },
  "glow-pulse": { "0%,100%": { opacity: 0.4 }, "50%": { opacity: 1 } },
}
```

### Pattern glassmorphism
```css
.glass-panel {
  background: hsl(var(--card) / 0.6);
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid hsl(var(--border) / 0.3);
}
```

### Fichiers modifiés — Phase 1
- `src/index.css` — Palette, composants CSS, animations
- `tailwind.config.ts` — Keyframes, animations, couleurs
- `src/components/layout/ServerList.tsx` — Redesign complet
- `src/components/layout/ChannelList.tsx` — Redesign complet
- `src/components/layout/MemberList.tsx` — Redesign complet
- `src/components/chat/ChatArea.tsx` — Header + messages + input
- `src/components/layout/VoiceControls.tsx` — Redesign panel
- `src/pages/Index.tsx` — Layout wrapper avec spacing

> **Note** : La Phase 1 seule implique ~3000+ lignes de modifications. Chaque phase sera livrée dans un message séparé pour garantir la stabilité.

