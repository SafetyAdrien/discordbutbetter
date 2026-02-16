

# Prompt Complet du Projet -- Clone Discord

## 1. Description Generale

Application web de communication en temps reel inspiree de Discord. Elle permet aux utilisateurs de creer et rejoindre des serveurs, d'echanger des messages textuels, de participer a des salons vocaux, de gerer des amis via messages prives, et d'administrer des communautes avec un systeme granulaire de roles et permissions. L'interface est entierement en francais.

---

## 2. Technologies Utilisees

### Frontend
- **React 18** -- Bibliotheque UI principale (SPA)
- **TypeScript** -- Typage statique
- **Vite** -- Build tool et dev server
- **Tailwind CSS** + **tailwindcss-animate** -- Systeme de styles utilitaire
- **shadcn/ui** (Radix UI) -- Composants accessibles (Dialog, Popover, Tabs, Select, Tooltip, etc.)
- **React Router DOM v6** -- Routage client (`/`, `/auth`, `/invite/:code`)
- **TanStack React Query v5** -- Gestion du cache, mutations, et synchronisation des donnees
- **Framer Motion** -- Animations avancees
- **Lucide React** -- Icones SVG
- **date-fns** -- Manipulation des dates
- **Zod** -- Validation de schemas (formulaires)
- **React Hook Form** -- Gestion de formulaires
- **cmdk** -- Palette de commandes / recherche globale
- **Recharts** -- Graphiques (statistiques d'engagement)
- **highlight.js** -- Coloration syntaxique du code dans les messages
- **react-image-crop** -- Recadrage d'images (avatars, bannieres)
- **react-resizable-panels** -- Panneaux redimensionnables
- **embla-carousel-react** -- Carrousels
- **@dnd-kit** (core, sortable, modifiers, utilities) -- Drag and drop pour reordonner salons, categories, serveurs
- **vaul** -- Drawer mobile
- **sonner** -- Notifications toast
- **input-otp** -- Saisie OTP pour l'authentification par telephone

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** -- Base de donnees relationnelle
- **Supabase Auth** -- Authentification (email/mot de passe, telephone/OTP)
- **Supabase Realtime** -- Temps reel via `postgres_changes` (messages, profils, reactions, etc.)
- **Supabase Storage** -- Stockage de fichiers (avatars, bannieres, emojis, stickers, pieces jointes, icones)
- **Supabase Edge Functions** (Deno) -- Logique serveur (ex : resume de salon via IA)
- **Row Level Security (RLS)** -- Securite au niveau des lignes de la base de donnees
- **Security Definer Functions** -- Fonctions PostgreSQL pour les operations privilegiees (ban, kick, transfert de propriete, etc.)

---

## 3. Design UI/UX

### Philosophie
Interface inspiree de Discord avec une esthetique "dark space" gris-bleute. L'application est concue comme un SPA (Single Page Application) avec une disposition en colonnes :

```text
+----------+------------+-----------------------+----------+
| Server   | Channel    |    Zone de Chat       | Members  |
| List     | List       |    / Contenu          | List     |
| (72px)   | (~240px)   |    (flexible)         | (~240px) |
+----------+------------+-----------------------+----------+
```

### Structure de l'Interface
1. **Barre laterale gauche (ServerList)** -- Liste verticale des serveurs avec icones rondes/carrees animees, bouton Home (DMs), bouton Decouvrir, bouton Creer
2. **Liste des salons (ChannelList)** -- Categories pliables, salons textuels/vocaux/forum/annonces/media/calendrier/taches/stage, drag-and-drop pour reordonner
3. **Zone principale** -- Chat textuel avec messages, pieces jointes, reactions, threads, sondages ; ou vues specialisees (vocal, forum, media, calendrier, taches, stage, annonces)
4. **Liste des membres (MemberList)** -- Membres groupes par role avec indicateurs de statut

### Composants Cles
- **Carte serveur** avec banniere, icone, nom, description, nombre de membres, fondateur
- **Profil utilisateur** avec popup au survol, carte complete modale, banniere, avatar, bio, pronoms, statut personnalise, activite
- **Input de message** avec support Markdown, mentions (@user, @everyone, @here), emojis/stickers, pieces jointes (drag-and-drop), sondages
- **Threads** -- Vue en panneau lateral avec spine visuelle
- **Salons vocaux** -- Grille de participants video, indicateurs de parole, actions (mute, deafen, camera, stream)
- **Stage Channel** -- Sessions en direct avec speakers, audience, demandes de prise de parole
- **Forum Channel** -- Posts avec tags et discussions
- **Annonces** -- Cartes avec banniere, reactions, commentaires, statistiques, mise en avant
- **Modales** -- Parametres serveur, parametres compte, creation de serveur/salon/categorie, invitations, recherche globale, raccourcis clavier

### Interactions et Animations
- Transitions douces sur les couleurs (200ms ease)
- Effet hover sur les serveurs : `border-radius` 24px vers 16px
- Drag-and-drop avec overlay et indicateur de depot (ligne bleue #5865f2)
- Bouton d'envoi avec animation "fly"
- Indicateur de frappe en temps reel
- Effets glow sur les elements vocaux actifs
- Respect de `prefers-reduced-motion`
- Performances GPU : `transform: translateZ(0)`, `contain: paint`, `will-change` cible

### Responsive
- Detection mobile via `window.innerWidth < 768`
- Classes utilitaires `.hide-mobile`, `.responsive-popover`, `.responsive-header-title`
- Drawer mobile (vaul) pour les modales

---

## 4. Palette de Couleurs (Variables CSS HSL)

Toutes les couleurs sont definies via des variables CSS semantiques pour assurer la coherence. Le theme est toujours sombre (dark mode permanent).

### Couleurs Principales

| Variable | Valeur HSL | Usage |
|----------|-----------|-------|
| `--background` | `218 18% 12%` | Fond principal (chat, liste membres) |
| `--foreground` | `218 10% 90%` | Texte principal |
| `--card` | `218 20% 10%` | Sidebar des salons |
| `--popover` | `218 22% 9%` | Menus, popovers |
| `--primary` | `225 85% 53%` | Couleur d'accent principale (bleu `#2153ed`) |
| `--secondary` | `270 60% 60%` | Violet d'accent |
| `--muted` | `218 15% 20%` | Surfaces attenuees |
| `--muted-foreground` | `218 12% 70%` | Texte secondaire |
| `--accent` | `186 80% 40%` | Cyan d'accent |
| `--destructive` | `0 72% 51%` | Rouge (suppression, erreur) |
| `--border` | `218 15% 18%` | Bordures |
| `--input` | `218 18% 15%` | Champs de saisie |
| `--toolbar` | `218 20% 18%` | Barre d'outils |
| `--sidebar-background` | `218 25% 7%` | Barre laterale serveurs (la plus sombre) |

### Couleurs de Statut

| Variable | Valeur HSL | Usage |
|----------|-----------|-------|
| `--online` | `142 76% 46%` | En ligne (vert) |
| `--idle` | `38 92% 50%` | Inactif (orange) |
| `--dnd` | `0 72% 51%` | Ne pas deranger (rouge) |
| `--offline` | `218 15% 45%` | Hors ligne (gris) |
| `--voice-active` | `142 76% 46%` | Vocal actif (vert) |

### Hover des Boutons Primaires
- Effet au survol : `bg-primary/85` (opacite reduite)
- Pas d'animation de scale ni d'ombre au hover

---

## 5. Polices de Caracteres

### Police Principale : `gg sans`
- Fichiers locaux TTF : `ggsans-Normal.ttf`, `ggsans-Medium.ttf`, `ggsans-SemiBold.ttf`, `ggsans-Bold.ttf`, `ggsans-ExtraBold.ttf`
- Poids : 400, 500, 600, 700, 800
- Utilisee pour le `body` et tout le texte courant
- Fallback : `Noto Sans`, `Helvetica`, `sans-serif`

### Police Display : `Orbitron`
- Importee via Google Fonts
- Utilisee pour les titres `h1`, `h2`, `h3`
- Style futuriste/gaming

### Police Sans-Serif : `Inter`
- Importee via Google Fonts
- Poids : 400-800
- Fallback systeme defini dans Tailwind (`font-sans`)

### Police Monospace (Code)
- `Consolas`, `Monaco`, `Andale Mono`, `Ubuntu Mono`, monospace
- Utilisee pour les blocs de code et le Markdown inline

### Police Decorative : `ABC Ginto Discord`
- Fichiers WOFF/WOFF2 : Regular, Medium, Italic
- Disponible mais non activement utilisee dans le CSS actuel

---

## 6. Base de Donnees -- Schema Complet

### Tables Principales (39 tables)

#### Utilisateurs et Profils
- **profiles** -- id, username, display_name, avatar_url, banner_url, bio, pronouns, status (enum: online/idle/dnd/offline), custom_status, activity_type, activity_text, theme_color, theme_gradient, server_order (array), created_at, updated_at

#### Serveurs
- **servers** -- id, name, icon_url, banner_url, description, owner_id, secondary_owner_id, is_public, created_at, updated_at
- **server_members** -- id, server_id, user_id, nickname, joined_at
- **server_settings** -- id, server_id, welcome_message, welcome_channel_id, system_channel_id, system_messages_enabled, activity_feed_enabled, activity_channel_id, boost_message_enabled, boost_channel_id, sticker_reply_enabled, sticker_channel_id, setup_tips_enabled, tips_channel_id, auto_assign_roles (array)
- **server_bans** -- id, server_id, user_id, banned_by, reason, created_at
- **server_notifications** -- id, server_id, recipient_id, sender_id, type, title, message, status, responded_at
- **server_read_states** -- id, server_id, user_id, last_read_at
- **server_folders** -- id, user_id, name, color, position, server_ids (array), is_expanded
- **server_emojis** -- id, server_id, name, url, creator_id
- **server_stickers** -- id, server_id, name, description, url, creator_id

#### Roles et Permissions
- **roles** -- id, server_id, name, color, position, is_default, hoist, description, icon_url
- **role_permissions** -- id, role_id, permission (enum: 130+ permissions granulaires)
- **member_roles** -- id, member_id, role_id
- **category_permission_overrides** -- id, category_id, role_id, permission, type (allow/deny)
- **channel_permission_overrides** -- id, channel_id, role_id, permission, type (allow/deny), sync_with_category

#### Salons et Categories
- **categories** -- id, server_id, name, position
- **channels** -- id, server_id, category_id, name, type (enum: text/voice/forum/announcement/media/calendar/tasks/stage), description, position, icon_url
- **user_channel_settings** -- id, user_id, channel_id, category_id, muted, mute_until, notification_setting

#### Messages et Communication
- **messages** -- id, channel_id, author_id, content, attachments (JSON), edited_at, is_published_message, original_message_id, source_server_id/name/icon, source_channel_name, target_user_id, publish_dismissed
- **reactions** -- id, message_id, user_id, emoji
- **pinned_messages** -- id, channel_id, message_id, pinned_by, pinned_at
- **channel_mentions** -- id, channel_id, user_id, message_id
- **typing_indicators** -- id, user_id, channel_id, conversation_id, thread_id, started_at

#### Threads
- **threads** -- id, channel_id, message_id, name, created_by, archived, archived_at, last_message_at
- **thread_messages** -- id, thread_id, author_id, content, attachments (JSON), edited_at
- **thread_followers** -- id, thread_id, user_id
- **thread_read_states** -- id, thread_id, user_id, last_read_at

#### Messages Prives (DMs)
- **dm_conversations** -- id, name, icon_url, is_group
- **dm_participants** -- id, conversation_id, user_id
- **dm_messages** -- id, conversation_id, author_id, content, attachments (JSON), edited_at
- **dm_read_states** -- id, conversation_id, user_id, last_read_at
- **dm_pinned_messages** -- id, conversation_id, message_id, pinned_by, pinned_at
- **dm_calls** -- id, conversation_id, initiator_id, call_type, status, started_at, ended_at
- **dm_call_signals** -- id, call_id, from_user_id, to_user_id, signal_type, signal_data (JSON)

#### Relations Sociales
- **friendships** -- id, user_id, friend_id, status (enum: pending/accepted/blocked)

#### Sondages
- **polls** -- id, channel_id, thread_id, author_id, question, allow_multiple, expires_at
- **poll_options** -- id, poll_id, text, emoji, position
- **poll_votes** -- id, poll_id, option_id, user_id

#### Vocal
- **voice_states** -- id, channel_id, user_id, muted, deafened, streaming, camera, server_muted, server_deafened, muted_by, joined_at
- **voice_signals** -- id, channel_id, from_user_id, to_user_id, signal_type, signal_data (JSON)
- **voice_user_settings** -- id, user_id, target_user_id, volume

#### Stage
- **stage_sessions** -- id, channel_id, title, description, started_by, status, started_at, ended_at
- **stage_participants** -- id, session_id, user_id, role, is_muted, is_video_on
- **stage_hand_requests** -- id, session_id, user_id, status, reviewed_by, reviewed_at

#### Annonces
- **announcements** -- id, channel_id, author_id, title, content, banner_url, category_id, featured, pinned, view_count
- **announcement_categories** -- id, server_id, name, color, icon
- **announcement_comments** -- id, announcement_id, author_id, content, edited_at
- **announcement_reactions** -- id, announcement_id, user_id, emoji

#### Divers
- **invites** -- id, server_id, code, created_by, expires_at, max_uses, uses, is_permanent
- **audit_logs** -- id, server_id, actor_id, action_type, target_id, details (JSON)
- **channel_followers** -- id, source_channel_id, target_channel_id, follower_user_id
- **channel_summaries** -- id, channel_id, title, summary, message_count, participants, start_message_id, end_message_id
- **user_summary_likes** / **user_summary_reads** -- Suivi des lectures/likes de resumes
- **user_notes** -- id, user_id, target_user_id, content
- **webhooks** -- id, channel_id, name, avatar_url, token, created_by

### Enums PostgreSQL
- `channel_type` : text, voice, forum, announcement, media, calendar, tasks, stage
- `friendship_status` : pending, accepted, blocked
- `user_status` : online, idle, dnd, offline
- `server_permission` : 130+ permissions granulaires couvrant la gestion serveur, les messages, le vocal, les forums, les annonces, les medias, les evenements, les taches, les sondages, le stage

### Fonctions RPC Notables (25+)
- `has_channel_permission` / `has_server_permission` -- Verification hierarchique (channel override > category override > role)
- `kick_member` / `ban_member` / `unban_member` -- Moderation
- `transfer_server_ownership` / `set_secondary_owner` / `remove_secondary_owner` -- Gestion de propriete
- `use_invite` / `get_invite_details` / `generate_invite_code` -- Systeme d'invitations
- `create_dm_conversation` -- Creation de conversations privees
- `detect_and_insert_mentions` -- Detection automatique des mentions dans les messages (trigger)
- `send_welcome_message` -- Message de bienvenue automatique (trigger)
- `server_mute_participant` / `server_deafen_participant` -- Moderation vocale

### Buckets de Stockage (10)
avatars, banners, server-icons, server-banners, server-emojis, server-stickers, announcement-banners, role-icons, message-attachments, channel-icons -- tous publics

---

## 7. Architecture Applicative

### Routes
- `/` -- Page principale (Index) : serveurs, salons, chat, DMs
- `/auth` -- Authentification (connexion email/telephone, inscription, mot de passe oublie, reset)
- `/invite/:code` -- Page d'acceptation d'invitation

### Contextes React
- **AuthContext** -- Gestion de l'authentification (user, signIn, signUp, loading)
- **VoiceContext** -- Etat vocal global (salon connecte, mute, deafen, stream, camera)
- **PresenceContext** -- Presence en temps reel des utilisateurs

### Hooks Personnalises (70+)
Couvrent tous les domaines : serveurs, salons, messages, membres, roles, permissions, DMs, threads, voix, stage, annonces, sondages, invitations, amis, recherche, presence, typing, notifications, drag-and-drop, raccourcis clavier, WebRTC, etc.

### Securite
- RLS (Row Level Security) sur toutes les tables
- Fonctions `SECURITY DEFINER` pour les operations privilegiees
- Verification HIBP (Have I Been Pwned) en temps reel pour les mots de passe
- Validation Zod cote client
- Verification de disponibilite du username en temps reel

