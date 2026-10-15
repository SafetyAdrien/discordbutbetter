---
name: Fluxer import limitation
description: Pourquoi l'import de serveur "façon Discord Template" n'est pas réalisable avec l'API publique Fluxer actuelle
type: constraint
---
Le bouton "Importer depuis Fluxer" dans `CreateServerModal.tsx` reste désactivé ("Bientôt disponible") volontairement, pas par oubli.

**Recherche menée le 2026-08-16** sur `github.com/fluxerapp/fluxer` (`fluxer_api/src/api/`, `packages/schema/src/domains/`) :

1. Fluxer n'a **aucun système de template partageable** équivalent à `discord.new/CODE` — pas de `GuildTemplateController`, aucun endpoint câblé pour ça.
2. Un schéma `TemplateSerializedGuild` (riche : rôles, channels, catégories, permissions) existe dans `packages/schema/src/domains/guild/GuildTemplateSchemas.ts`, mais c'est du **code mort côté API HTTP** — aucun contrôleur ne l'utilise. Vestige ou fonctionnalité interne non exposée publiquement.
3. Le seul endpoint public (sans auth) est `GET /invites/:invite_code`. Il retourne `GuildPartialResponse` : `id, name, icon, banner, splash, features[]` — **sans** channels, catégories, rôles, description, owner_id, ni vanity_url_code. Le `channel` retourné est un objet unique (le salon cible de l'invite), pas la liste complète.
4. Même authentifié, `GET /guilds/:guild_id` (structure complète) exige d'être **membre** du serveur — donc aucun accès "en lecture seule depuis l'extérieur" n'existe, contrairement à Discord.

**Why:** sans ces données, on ne peut reproduire que nom/icône/bannière d'un serveur Fluxer — pas les salons ni les rôles, ce qui viderait la fonctionnalité "importer une structure" de son intérêt par rapport à ce qu'offre l'import Discord existant.

**How to apply:** si Fluxer publie un jour un vrai endpoint de template/export, ou si l'utilisateur veut un import authentifié (OAuth Fluxer + lecture en tant que membre), réévaluer. Sinon, ne pas retenter cette recherche sans nouvelle info — elle a déjà été faite en profondeur.
