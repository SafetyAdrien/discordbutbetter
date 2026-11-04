# Design System Discord — spécification extraite

Généré automatiquement depuis le bundle CSS public de Discord.
4 056 tokens de composants · 2 597 tokens sémantiques · 4 thèmes.

- CSS exploitable : `src/styles/discord-tokens.css`
- Tokens bruts : `docs/design-reference/tokens.json`
- Tokens résolus : `docs/design-reference/design-system.json`

## Échelles de couleur

Toutes les couleurs sont dérivées en HSL puis converties en hex. La saturation
passe par `--saturation-factor` (1 par défaut, utilisé par Discord pour
désaturation).


### Blurple (couleur de marque)

`blurple-1` `#e6eaff` · `blurple-2` `#e3e7ff` · `blurple-3` `#dfe4ff` · `blurple-4` `#dbe2ff` · `blurple-5` `#d8dfff` · `blurple-6` `#d4ddff` · `blurple-7` `#d1daff` · `blurple-8` `#cdd7ff` · `blurple-9` `#cad5ff` · `blurple-10` `#c7d2ff` · `blurple-11` `#c3d0ff` · `blurple-12` `#c0cdff` · `blurple-13` `#bccaff` · `blurple-14` `#b9c8ff` · `blurple-15` `#b6c5ff` · `blurple-16` `#b3c3ff` · `blurple-17` `#b0c0ff` · `blurple-18` `#acbdff` · `blurple-19` `#a9bbff` · `blurple-20` `#a6b8ff` · `blurple-21` `#a3b5ff` · `blurple-22` `#a0b3ff` · `blurple-23` `#9db0ff` · `blurple-24` `#9aadff` · `blurple-25` `#97abff` · `blurple-26` `#94a8ff` · `blurple-27` `#91a5fe` · `blurple-28` `#8fa3fe` · `blurple-29` `#8ca0fd` · `blurple-30` `#899dfd` · `blurple-31` `#869bfc` · `blurple-32` `#8398fb` · `blurple-33` `#8195fb` · `blurple-34` `#7e92fa` · `blurple-35` `#7c90fa` · `blurple-36` `#798df9` · `blurple-37` `#768af9` · `blurple-38` `#7487f8` · `blurple-39` `#7185f8` · `blurple-40` `#6f82f7` · `blurple-41` `#6c7ff6` · `blurple-42` `#6a7cf6` · `blurple-43` `#6879f5` · `blurple-44` `#6576f5` · `blurple-45` `#6374f4` · `blurple-46` `#6171f4` · `blurple-47` `#5f6ef3` · `blurple-48` `#5d6bf3` · `blurple-49` `#5a68f2` · `blurple-50` `#5865f2` · `blurple-51` `#5663ec` · `blurple-52` `#5461e6` · `blurple-53` `#525fe0` · `blurple-54` `#505ddb` · `blurple-55` `#4e5bd5` · `blurple-56` `#4c59d0` · `blurple-57` `#4a58cb` · `blurple-58` `#4856c5` · `blurple-59` `#4654c0` · `blurple-60` `#4452bb` · `blurple-61` `#4250b6` · `blurple-62` `#404eb1` · `blurple-63` `#3e4cad` · `blurple-64` `#3c4aa8` · `blurple-65` `#3a48a3` · `blurple-66` `#38469f` · `blurple-67` `#36449a` · `blurple-68` `#344296` · `blurple-69` `#324091` · `blurple-70` `#303e8d` · `blurple-71` `#2e3c88` · `blurple-72` `#2c3a84` · `blurple-73` `#2b3880` · `blurple-74` `#29367c` · `blurple-75` `#273478` · `blurple-76` `#253273` · `blurple-77` `#23316f` · `blurple-78` `#212f6b` · `blurple-79` `#1f2d67` · `blurple-80` `#1e2b63` · `blurple-81` `#1c295f` · `blurple-82` `#1a275b` · `blurple-83` `#182557` · `blurple-84` `#172354` · `blurple-85` `#152250` · `blurple-86` `#14204c` · `blurple-87` `#121e48` · `blurple-88` `#101c45` · `blurple-89` `#0f1a41` · `blurple-90` `#0d193d` · `blurple-91` `#0c173a` · `blurple-92` `#0a1536` · `blurple-93` `#091332` · `blurple-94` `#08112e` · `blurple-95` `#060f29` · `blurple-96` `#050d24` · `blurple-97` `#040a1e` · `blurple-98` `#030716` · `blurple-99` `#01030c` · `blurple-100` `#000000`

### Neutres (surfaces & texte)

`neutral-2` `#fbfbfb` · `neutral-3` `#f7f7f8` · `neutral-4` `#f3f3f4` · `neutral-5` `#efeff1` · `neutral-6` `#ebeced` · `neutral-7` `#e8e8ea` · `neutral-8` `#e4e4e6` · `neutral-9` `#e0e0e3` · `neutral-10` `#dcdcdf` · `neutral-11` `#d8d9dc` · `neutral-12` `#d4d5d8` · `neutral-13` `#d1d1d5` · `neutral-14` `#cdcdd1` · `neutral-15` `#c9cace` · `neutral-16` `#c5c6ca` · `neutral-17` `#c2c2c7` · `neutral-18` `#bebec3` · `neutral-19` `#babbc0` · `neutral-20` `#b6b7bc` · `neutral-21` `#b3b3b9` · `neutral-22` `#afb0b6` · `neutral-23` `#abacb2` · `neutral-24` `#a8a8af` · `neutral-25` `#a4a5ab` · `neutral-26` `#a0a1a8` · `neutral-27` `#9d9ea5` · `neutral-28` `#999aa1` · `neutral-29` `#96979e` · `neutral-30` `#92939b` · `neutral-31` `#8f9097` · `neutral-32` `#8b8c94` · `neutral-33` `#888991` · `neutral-34` `#84858d` · `neutral-35` `#81828a` · `neutral-36` `#7d7e87` · `neutral-37` `#7a7b83` · `neutral-38` `#767780` · `neutral-39` `#73747d` · `neutral-40` `#70717a` · `neutral-41` `#6c6d76` · `neutral-42` `#696a73` · `neutral-43` `#666770` · `neutral-44` `#62636d` · `neutral-45` `#5f606a` · `neutral-46` `#5c5d67` · `neutral-47` `#595a63` · `neutral-48` `#555660` · `neutral-49` `#52535d` · `neutral-50` `#4f505a` · `neutral-51` `#4d4e58` · `neutral-52` `#4c4d56` · `neutral-53` `#4a4b55` · `neutral-54` `#494a53` · `neutral-55` `#474851` · `neutral-56` `#46474f` · `neutral-57` `#44454d` · `neutral-58` `#43434c` · `neutral-59` `#41424a` · `neutral-60` `#3f4048` · `neutral-61` `#3e3f46` · `neutral-62` `#3c3d45` · `neutral-63` `#3b3c43` · `neutral-64` `#393a41` · `neutral-65` `#383940` · `neutral-66` `#36373e` · `neutral-67` `#35363c` · `neutral-68` `#34343a` · `neutral-69` `#323339` · `neutral-70` `#313137` · `neutral-71` `#2f3035` · `neutral-72` `#2e2e34` · `neutral-73` `#2c2d32` · `neutral-74` `#2b2b31` · `neutral-75` `#292a2f` · `neutral-76` `#28282d` · `neutral-77` `#27272c` · `neutral-78` `#25262a` · `neutral-79` `#242429` · `neutral-80` `#222327` · `neutral-81` `#212125` · `neutral-82` `#202024` · `neutral-83` `#1e1f22` · `neutral-84` `#1d1d21` · `neutral-85` `#1b1c1f` · `neutral-86` `#1a1a1e` · `neutral-87` `#19191c` · `neutral-88` `#17181b` · `neutral-89` `#161619` · `neutral-90` `#151518` · `neutral-91` `#131416` · `neutral-92` `#121214` · `neutral-93` `#101013` · `neutral-94` `#0e0e10` · `neutral-95` `#0c0c0e` · `neutral-96` `#0a0a0c` · `neutral-97` `#070709` · `neutral-98` `#050506` · `neutral-99` `#020203` · `neutral-100` `#000000`

### Primaire (surfaces Discord legacy)

`primary-100` `#f9f9f9` · `primary-130` `#f2f3f5` · `primary-160` `#ebedef` · `primary-200` `#e3e5e8` · `primary-230` `#dbdee1` · `primary-260` `#d2d5d9` · `primary-300` `#c4c9ce` · `primary-330` `#b5bac1` · `primary-345` `#a5abb3` · `primary-360` `#949ba4` · `primary-400` `#80848e` · `primary-430` `#6d6f78` · `primary-460` `#5c5e66` · `primary-500` `#4e5058` · `primary-530` `#41434a` · `primary-560` `#383a40` · `primary-600` `#313338` · `primary-630` `#2b2d31` · `primary-645` `#282a2e` · `primary-660` `#232428` · `primary-700` `#1e1f22` · `primary-730` `#1a1b1e` · `primary-760` `#161719` · `primary-800` `#111214` · `primary-830` `#0c0c0d` · `primary-860` `#060607` · `primary-900` `#020202`


## Rayons


### Tous

| Token | Valeur |
|---|---|
| `radius-lg` | `16px` |
| `radius-md` | `12px` |
| `radius-none` | `0px` |
| `radius-round` | `2147483647px` |
| `radius-sm` | `8px` |
| `radius-xl` | `24px` |
| `radius-xs` | `4px` |
| `radius-xxl` | `32px` |


## Espacement

Échelle en pas de 2 px jusqu'à 24, puis 32/40/48/64/80/96/128/160/192.

### Tous

| Token | Valeur |
|---|---|
| `space-0` | `0px` |
| `space-10` | `10px` |
| `space-12` | `12px` |
| `space-128` | `128px` |
| `space-16` | `16px` |
| `space-160` | `160px` |
| `space-192` | `192px` |
| `space-20` | `20px` |
| `space-24` | `24px` |
| `space-26` | `26px` |
| `space-30` | `30px` |
| `space-32` | `32px` |
| `space-4` | `4px` |
| `space-40` | `40px` |
| `space-48` | `48px` |
| `space-6` | `6px` |
| `space-64` | `64px` |
| `space-8` | `8px` |
| `space-80` | `80px` |
| `space-96` | `96px` |
| `space-lg` | `var(--space-20)` |
| `space-md` | `var(--space-16)` |
| `space-sm` | `var(--space-12)` |
| `space-xl` | `var(--space-24)` |
| `space-xs` | `var(--space-8)` |
| `space-xxl` | `var(--space-32)` |
| `space-xxs` | `var(--space-4)` |


## Breakpoints

xxs 480 · xs 640 · sm 768 · md 1024 · lg 1280 · xl 1536 · xxl 1800 · max 2500

## Contrôles


### Tous

| Token | Valeur |
|---|---|
| `button-border-radius` | `2147483647px` |
| `button-border-radius-lg` | `2147483647px` |
| `control-input-height-md` | `40px` |
| `control-input-height-sm` | `32px` |
| `control-item-height-md` | `40px` |
| `control-item-height-sm` | `32px` |
| `form-input-height` | `44px` |
| `icon-size-lg` | `32px` |
| `icon-size-md` | `24px` |
| `icon-size-sm` | `18px` |
| `icon-size-xs` | `16px` |
| `icon-size-xxs` | `12px` |
| `menu-border-width` | `1px` |
| `menu-scroller-block-padding` | `8px` |
| `select-max-width` | `248px` |
| `select-option-height` | `40px` |


## Modales & toasts


### Tous

| Token | Valeur |
|---|---|
| `modal-horizontal-padding` | `24px` |
| `modal-vertical-padding` | `16px` |
| `modal-width-large` | `800px` |
| `modal-width-medium` | `602px` |
| `modal-width-small` | `442px` |
| `toast-animation-duration-ms` | `300px` |
| `toast-max-width` | `280px` |
| `toast-queue-enter-delay-ms` | `400px` |
| `toast-text-line-count` | `2px` |


## Layout chat & guild bar


### Tous

| Token | Valeur |
|---|---|
| `channels-name-line-height` | `24px` |
| `channels-spine-inverted-offset-top` | `6px` |
| `channels-spine-offset-left` | `24px` |
| `chat-avatar-size` | `40px` |
| `chat-input-icon-size` | `20px` |
| `chat-markup-line-height` | `1.375rem` |
| `chat-resize-handle-width` | `8px` |
| `guildbar-avatar-size` | `40px` |
| `guildbar-folder-size` | `48px` |


## Mobile

166 tokens `--mobile-*` : barres d'onglets, feuilles, clavier, subgroups.
Voir `tokens.json` → `tokens` (filtrer `mobile`).

## Typographie

Police : `"gg sans"` (400/500/600/700/800) — le projet la declare deja dans
`src/index.css`.

Poids : 300 light · 400 normal · 500 medium · 600 semibold · 700 bold ·
800 extrabold · 900 black

## Mécanisme de thème custom

Chaque token sémantique est un `color-mix(in oklab, …)` mêlant la couleur
native Discord et la couleur du thème utilisateur :

```css
--background-primary: color-mix(in oklab,
    var(--primary-530) 100%,
    var(--custom-theme-base-color, #000)
    var(--custom-theme-base-color-amount, 0%));
```

Trois variables pilote tout : `--custom-theme-base-color`,
`--custom-theme-text-color`, `--custom-theme-border-color`.
Le projet possède déjà `src/lib/customTheme/palette.ts` et
`src/hooks/useCustomTheme.ts` : ce mécanisme est à recâbler dessus.
