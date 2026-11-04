# Démonstration — Tags de serveur

Captures **réelles** (Playwright, navigateur Chromium) du harnais `/design` de l'application. Le harnais n'a pas de
backend : les données (tag SPCE, membres, selection) sont préchargées dans le cache de l'application, ce ne sont pas des
écritures en base. La logique base de données (permissions, concurrence, unicité, révocation) est testée à part sur un
vrai PostgreSQL : voir `supabase/tests/README-server-tags.md`.

| Fichier | Contenu |
|---|---|
| 01-config-admin.png | Page « Tag du serveur » : SPCE, planète, #2880FB, aperçu en direct, barre d'enregistrement |
| 02-galerie-badges.png | Galerie de badges pixel art (3 packs) |
| 03-selecteur-tag.png | Sélecteur du membre (un seul tag actif) |
| 04-chat-et-membres.png | Tag dans les messages et la liste des membres |
| 05-fiche-serveur-au-clic.png | Fiche du serveur ouverte au clic sur le tag |
| 06-profil-avec-tag.png | Carte de profil avec le tag |
| 07/08-mobile-*.png | Rendu mobile (390 px) |

Relancer : `npm run dev` puis `NODE_PATH=<dossier de playwright> node demo/server-tags/capture.cjs`.
