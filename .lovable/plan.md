
# Aperçus interactifs YouTube & Twitch

Remplace l'embed statique actuel (`LinkEmbed.tsx`) par un système de détection de provider qui rend un player inline simple, no-cookie, pour YouTube (vidéos + Shorts + Live) et Twitch (Live + Clips + VOD).

## Périmètre

- **YouTube** : vidéos longues, Shorts, Live — détection via `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/live/`.
- **Twitch** : streams live (`twitch.tv/{channel}`), clips (`clips.twitch.tv/...` + `twitch.tv/{channel}/clip/...`), VOD (`twitch.tv/videos/...`).
- Toute autre URL → fallback sur le `LinkEmbed` existant (inchangé).

## Architecture

```text
src/components/chat/embeds/
  ├── index.tsx                  # <SmartLinkEmbed url> : routeur provider → player
  ├── YouTubeEmbed.tsx           # Vidéo / Short / Live (iframe nocookie)
  ├── TwitchEmbed.tsx            # Live / Clip / VOD (iframe Twitch)
  └── providers.ts               # parseYouTube(url), parseTwitch(url)

src/components/chat/LinkEmbed.tsx  # garde le fallback meta OG existant
```

`LinkEmbeds` (le wrapper qui itère sur les URLs détectées dans un message) appelle `SmartLinkEmbed` au lieu de `LinkEmbed` directement. Si le provider matche, on rend le player ; sinon on délègue au `LinkEmbed` actuel.

## YouTube — comportement

- Parse l'URL → `{ kind: 'video' | 'short' | 'live', id, start? }`.
- Render :
  - **Vidéo / Live** : carte 16:9 (max-width 520px, cohérent avec `LinkEmbed` actuel), `<iframe src="https://www.youtube-nocookie.com/embed/{id}?start={t}&rel=0&modestbranding=1">`.
  - **Short** : carte 9:16 (max-width 280px), même iframe nocookie.
- **Lazy mount** : avant clic, on affiche la thumbnail (`https://i.ytimg.com/vi/{id}/hqdefault.jpg`) + bouton play central. L'iframe n'est montée qu'après clic → zéro requête YouTube tant que personne ne lance la lecture (cohérent avec policy zéro collecte).
- Pas de viewers temps réel ni chat (niveau d'interaction = simple).

## Twitch — comportement

- Parse l'URL → `{ kind: 'stream' | 'clip' | 'vod', value }`.
- Render avec lazy-mount (thumbnail + bouton play, iframe au clic) :
  - **Stream** : `<iframe src="https://player.twitch.tv/?channel={login}&parent={host}">`. Affiche aussi un badge LIVE rouge + nom du jeu + viewers, alimenté par une nouvelle edge function (voir ci-dessous). Si offline → carte profil chaîne, pas de player.
  - **Clip** : `<iframe src="https://clips.twitch.tv/embed?clip={slug}&parent={host}">`.
  - **VOD** : `<iframe src="https://player.twitch.tv/?video=v{id}&parent={host}&time={t}">` (avec deep-link timestamp si `?t=` dans l'URL).
- `parent` = `window.location.hostname` (requis par Twitch ; supporte preview + custom domain).

## Données live Twitch (Helix via connecteur)

Nouvelle edge function `twitch-channel-status` (équivalent du pattern déjà utilisé pour `fetch-url-metadata`) :

- Input : `{ login: string }` ou `{ video_id }` / `{ clip_slug }`.
- Output : `{ isLive, title, game, viewers, thumbnail, startedAt, profileImage }`.
- Implémentation : appel `GET https://connector-gateway.lovable.dev/twitch/streams?user_login={login}` puis `GET /users` pour le profil, en utilisant `LOVABLE_API_KEY` + `TWITCH_API_KEY` (connecteur Twitch déjà disponible côté workspace — à confirmer avec `list_connections` au moment du build, sinon proposer `connect`).
- Cache côté client via React Query (clé `['twitch-status', login]`, `staleTime: 60s`). Pas de polling agressif.

Hook : `useTwitchStatus(login)` calque `useUrlMetadata` (mémoire + IndexedDB + invalidation Realtime sur le canal `url-meta-broadcast` existant).

## Confidentialité (zéro collecte)

- `youtube-nocookie.com` uniquement, jamais `youtube.com/embed`.
- Iframe **non montée** tant que l'utilisateur ne clique pas → aucun cookie/ping YouTube/Twitch lors du simple affichage du message.
- Thumbnails servies depuis `i.ytimg.com` / `static-cdn.jtvnw.net` directement (pas de proxy, mais lecture seule, pas de tracking).
- Aucun toggle utilisateur : strict pour tout le monde, conforme à la memory `privacy-policy-zero-data-collection`.

## Intégration cache-first

Comme `useUrlMetadata`, la résolution provider (YouTube/Twitch parse) est synchrone donc déjà instantanée. Pour Twitch live status, on hydrate depuis IndexedDB au montage pour éviter le flicker LIVE/offline, cohérent avec le pattern `useCacheRehydrate`.

## Détails techniques

- **Parsing** : regex côté `providers.ts`, testée pour `youtu.be/X`, `youtube.com/watch?v=X&t=42s`, `youtube.com/shorts/X`, `youtube.com/live/X`, `twitch.tv/{login}` (exclut `/videos/`, `/clip/`, `/directory/`, etc.), `twitch.tv/videos/{id}`, `clips.twitch.tv/{slug}`, `twitch.tv/{login}/clip/{slug}`.
- **Sécurité iframe** : `sandbox="allow-scripts allow-same-origin allow-presentation"`, `allow="autoplay; encrypted-media; picture-in-picture"`, `referrerpolicy="strict-origin-when-cross-origin"`.
- **A11y** : bouton play avec `aria-label`, focus visible, support clavier (Enter/Space pour mount).
- **Mobile** : carte Short conserve son 9:16 ; sur très petit écran, max-width 100%.
- **Fallback** : si le parse réussit mais l'iframe échoue (CSP, offline), on dégrade vers le `LinkEmbed` OG existant.

## Fichiers touchés

- **Nouveaux** :
  - `src/components/chat/embeds/providers.ts`
  - `src/components/chat/embeds/index.tsx` (SmartLinkEmbed)
  - `src/components/chat/embeds/YouTubeEmbed.tsx`
  - `src/components/chat/embeds/TwitchEmbed.tsx`
  - `src/hooks/useTwitchStatus.ts`
  - `supabase/functions/twitch-channel-status/index.ts`
- **Modifiés** :
  - `src/components/chat/LinkEmbed.tsx` : `LinkEmbeds` route vers `SmartLinkEmbed` ; `LinkEmbed` (single) inchangé comme fallback.
  - `supabase/config.toml` : déclaration de la nouvelle edge function (verify_jwt = true).

## Hors scope (volontairement reporté)

- Watch-together / sync play-pause Realtime.
- PiP / mini-player persistant entre salons.
- Réactions emoji synchrones sur les embeds.
- Chat Twitch / YouTube en panneau latéral.

Ces briques pourront être ajoutées par-dessus `SmartLinkEmbed` dans une itération ultérieure sans refonte.
