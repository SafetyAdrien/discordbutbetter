

# Slowmode: remplacer le rate limiting par un paramètre de salon

## Résumé

Supprimer le rate limiting client-side fixe (500ms cooldown) sur l'envoi de messages et le remplacer par une fonctionnalité "slowmode" configurable par salon, comme sur Discord. Les administrateurs pourront définir un délai entre les messages via un slider dans les paramètres du salon.

## Changements

### 1. Migration SQL — ajouter `slowmode_seconds` à la table `channels`

Ajouter une colonne `slowmode_seconds integer NOT NULL DEFAULT 0` à la table `channels`. La valeur 0 signifie "pas de slowmode". Valeurs typiques : 0, 5, 10, 15, 30, 60, 120, 300, 600.

### 2. `src/components/chat/MessageInput.tsx` — supprimer le rate limiting fixe

- Supprimer l'import de `checkCooldown` de `@/lib/rate-limiter`
- Supprimer le bloc `checkCooldown('message-send', 500)` dans `handleSendMessage`
- Ajouter une prop `slowmodeSeconds?: number` et un state `lastSentAt` pour gérer le cooldown côté salon
- Si `slowmodeSeconds > 0`, vérifier que `Date.now() - lastSentAt >= slowmodeSeconds * 1000` avant d'envoyer. Si non, afficher un toast avec le temps restant
- Afficher un compteur visuel sous l'input quand le cooldown est actif

### 3. `src/components/channel-settings/ChannelOverview.tsx` — ajouter le slider slowmode

- Ajouter un state local `slowmode` synchronisé avec `channel.slowmode_seconds`
- Afficher un bloc "Mode lent" avec un slider horizontal (composant `Slider` existant) permettant de choisir le délai
- Valeurs du slider : 0s, 5s, 10s, 15s, 30s, 1m, 2m, 5m, 10m (pas linéaire, paliers prédéfinis)
- Afficher le temps sélectionné à côté du slider (ex: "30s", "2m", "Désactivé")
- Visible uniquement pour les salons text, voice, forum
- Inclure la valeur dans `handleSave` et `useUpdateChannel`

### 4. `src/hooks/useChannelSettings.ts` — étendre le hook

- Ajouter `slowmode_seconds` au type `ChannelDetails`
- Ajouter `slowmode_seconds` au SELECT de `useChannelDetails`
- Accepter `slowmode_seconds` dans `useUpdateChannel`

### 5. `src/components/chat/ChatArea.tsx` — passer le slowmode au MessageInput

- Lire `slowmode_seconds` depuis les données du canal et le passer en prop à `MessageInput`

## Valeurs du slider (paliers)

```text
Index:  0   1   2    3    4    5    6     7     8
Secs:   0   5   10   15   30   60   120   300   600
Label:  Off 5s  10s  15s  30s  1m   2m    5m    10m
```

Le slider utilise les index 0-8, mappés aux valeurs en secondes.

