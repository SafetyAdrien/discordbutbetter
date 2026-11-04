# Referentiel des composants Discord

Genere depuis les 322 fichiers CSS du bundle : **8 531 regles CSS-module**,
**2 676 composants distincts**.

Chaque entree donne le nom de base du composant et les proprietes de mise en
page reelles trouvees dans le bundle. Les hachages (`__5e434`) varient a chaque
publication : seul le nom de base est stable.

## Echelle typographique

Extraite de `.fontScaling` (**3 363 regles**). Il n'existe aucun token
`font-size` : l'echelle est portee par ces classes.

| rem | px |
|---|---|
| .625rem | 10 |
| .75rem | 12 |
| .875rem | 14 |
| .9375rem | 15 |
| 1rem | 16 |
| 1.125rem | 18 |
| 1.25rem | 20 |
| 1.5rem | 24 |
| 2rem | 32 |
| 2.125rem | 34 |
| 2.75rem | 44 |

Poids : `--font-weight-normal 400 · medium 500 · semibold 600 · bold 700 ·
extrabold 800 · black 900`.

## Espacements et rayons

`--space-xxs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · xxl 32` (px)
`--radius-xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · round`


---

## Structure et mise en page (140 composants)

<details><summary>86 composants avec cotes explicites</summary>

- **.container** — border-radius:var(--radius-lg) · gap:var(--space-16) · min-height:180px · padding:var(--space-16) var(--space-16) var(--space- · width:100% · gap:var(--space-4) · height:100% · flex:1
- **.header** — border-radius:var(--radius-md) var(--radius-md) 0 0 · font-weight:var(--font-weight-semibold) · margin:8px 0 16px · width:0 · gap:8px · height:36px · gap:12px · padding:16px
- **.content** — flex:1 1 auto · width:0 · width:400px · padding:8px · margin:0 auto · width:1224px · gap:24px · width:100%
- **.wrapper** — border-radius:3px · font-size:12px · font-weight:var(--font-weight-medium) · line-height:12px · padding:3px 6px · border-radius:8px · height:40px · padding:8px
- **.contents** — margin:0 auto · margin:0
- **.footer** — gap:4px · padding:12px · border-radius:0 · flex:0 0 auto · padding:var(--modal-vertical-padding) var(--modal-ho · border-radius:0 0 var(--radius-md) var(--radius-md) · width:100% · border-radius:0 0 8px 8px
- **.section** — width:var(--custom-premium-home-max-width) · width:var(--custom-content-width-with-padding) · gap:12px · padding:12px · border-radius:0 · padding:16px · gap:var(--space-16) · padding:var(--custom-modal-padding-md) var(--custom-
- **.panel** — height:var(--disclosure-panel-height) · gap:var(--space-24) · padding:var(--space-16) var(--space-24) · width:1px · flex:0 0 auto · padding:var(--space-12)
- **.contentWrapper** — flex:1 · gap:6px · padding:4px 0 · gap:16px · flex:1 1 auto · gap:12px · border-radius:var(--radius-sm) · height:100%
- **.sidebar** — flex:1 · flex:0 0 auto · min-height:0 · width:0 · width:var(--custom-guild-sidebar-width) · grid-template-columns:subgrid
- **.contentContainer** — padding:var(--space-32) · width:0 · height:100%
- **.headerText** — width:364px · width:620px · font-size:32px · font-weight:900 · line-height:100% · flex:1
- **.layout** — border-radius:4px · height:42px · width:0 · padding:0 · height:48px · height:38px · border-radius:inherit · flex:0 1 auto
- **.page** — height:100% · min-height:0 · width:0 · width:100%
- **.list** — gap:6px · flex:1 1 auto · min-height:0
- **.sectionHeader** — font-size:24px · height:var(--space-24)
- **.toolbar** — gap:var(--space-md) · flex:0 0 auto · width:100% · width:-moz-fit-content · width:fit-content · flex:0 1 auto · gap:var(--space-xs) · width:0
- **.headerIcon** — height:100% · border-radius:4px · height:24px · width:24px · height:16px · width:16px
- **.sectionTitle** — margin:0 4px
- **.panels** — flex:0 0 auto · border-radius:var(--radius-sm) · width:calc(100% - var(--custom-panels-spacing)*2)
- **.panelButtonShineWipe** — height:150% · width:150%
- **.headerImage** — height:150px · margin:12px auto · width:250px
- **.headerButtons** — gap:4px · flex:1 · gap:8px · height:var(--custom-button-button-md-height)
- **.sidebarList** — flex:0 0 auto · min-height:0 · width:0 · width:calc(var(--custom-guild-sidebar-width) - var
- **.headerSection** — width:100% · gap:4px
- **.table** — width:100%
- **.headerContainer** — gap:4px
- **.footerContainer** — gap:8px · padding:16px 20px · gap:var(--space-16)
- **.tabBar** — width:100%
- **.listItem** — gap:8px · margin:8px 0 · margin:0 · width:var(--custom-guild-list-width)
- **.tab** — flex:1 · gap:8px · width:0 · padding:0 8px 16px
- **.sidebarResizeHandle** — width:4px
- **.headerGraphic** — width:100%
- **.headerGraphicContainer** — width:288px · width:100% · width:352px
- **.headerLeading** — gap:var(--space-8) · width:var(--space-4)
- **.headerSubtitleWrapper** — gap:var(--space-4)
- **.contentsContainer** — flex:1 0 0 · gap:var(--space-12) · width:0
- **.contentTitle** — padding:4px 0 · font-size:14px · font-weight:var(--font-weight-medium)
- **.headerActions** — gap:var(--space-8) · gap:var(--space-4)
- **.listBoxSectionHeader** — padding:var(--space-4) var(--space-4) var(--space-4)
- **.footerPlaceholder** — border-radius:var(--radius-sm) · height:1lh · width:25ch
- **.listNavigatorRegion** — height:100% · min-height:0
- **.headerContentWrapper** — padding:var(--space-64) var(--space-32) var(--space-
- **.headerBackground** — min-height:1280px
- **.tableWrapper** — width:100%
- **.footerContainerNonPremium** — gap:12px
- **.footerRightButtons** — gap:24px · width:100%
- **.headerAndCloseRow** — width:100%
- **.footerUpsellRow** — gap:8px · width:100%
- **.headerBarChildren** — gap:var(--space-xs)
- **.footerGap** — flex:200 0 auto · width:var(--space-16)
- **.headerInner** — min-height:52px
- **.listContainer** — border-radius:8px · padding:8px 16px
- **.containerMinimized** — min-height:auto · width:auto
- **.headerFull** — grid-template-columns:32px minmax(20px,auto) 24px
- **.headerSimple** — grid-template-columns:32px minmax(20px,auto)
- **.headerTag** — border-radius:var(--radius-xs)
- **.footerButtons** — border-radius:var(--radius-md) · padding:var(--space-8) · width:-moz-fit-content · width:fit-content
- **.listRow** — gap:var(--space-12) · height:61px
- **.listRowText** — flex:1 1 auto · gap:6px · width:0

</details>

<details><summary>Autres noms de la famille (54)</summary>

headerGradient, headerLabel, headerCollapseIcon, sectionLabel, headerTitle, tabs, headerLeadingAbsolute, sectionContainerNitroLockedBackground, wrapperWithHeader, contentScrollbarGutter, contentScrollbarGutterAuto, footerSeparator, headerRow, contentPlaceholder, footerWishlistButton, containerMarginTop, headerBar, footerSpacer, headerCollapseIconCollapsed, contentMinimized, headerIcons, contentBackground, headerOverlay, headerAvatar, sectionFooter, tabBarItem, tabPanel, tabPanelHidden, sidebarListRounded, contentDefault, contentUnread, panelSubtextContainer, containerListenAlongVisible, panelTitleContainer, tabular, headerCentered, headerLayout, headerTrailing, headerTrailingAbsolute, headerSubtitleIcon, headerSubtitle, contentWithMedia, listWrapper, contentWrapperEmojiPacks, sectionIconContainer, toolbarContainer, tabularNumbers, sectionDimmed, sectionContainerNitroLocked, sectionHeaderContent, panelInner, listBoxInner, listBoxItemLabel, listBoxItemDescription

</details>

---

## Serveurs (barre, dossiers, en-tetes) (62 composants)

<details><summary>53 composants avec cotes explicites</summary>

- **.guildIcon** — height:100% · width:100% · border-radius:19px · height:70px · width:70px · border-radius:var(--radius-md) · flex:0 0 auto · border-radius:3px
- **.guildName** — width:180px
- **.guildInfo** — gap:8px
- **.navItem** — border-radius:var(--radius-sm) · gap:12px · padding:var(--space-sm) var(--space-xs) · padding:var(--space-8) · flex:0 0 auto
- **.guildContainer** — border-radius:8px · padding:16px · border-radius:var(--radius-sm) · padding:var(--space-16)
- **.guildThemeHeader** — gap:var(--space-16) · padding:var(--space-24) var(--space-48) 0
- **.nav** — flex:1 · gap:2px · padding:8px · border-radius:var(--radius-md) · gap:var(--space-4) · padding:var(--space-8) · width:240px · padding:0 16px
- **.navButton** — border-radius:var(--radius-sm) · font-size:14px · font-weight:600 · line-height:14px · padding:8px 12px
- **.folderGroupBackground** — border-radius:var(--radius-lg) · width:var(--guildbar-folder-size)
- **.folderIconWrapper** — padding:var(--custom-folder-padding) · padding:0
- **.folderIcon** — border-radius:var(--radius-md) · height:var(--guildbar-avatar-size) · width:var(--guildbar-avatar-size)
- **.folderPreviewWrapper** — border-radius:var(--radius-lg) · height:var(--guildbar-folder-size) · padding:var(--custom-folder-preview-padding) · width:var(--guildbar-folder-size) · border-radius:var(--radius-md) · height:var(--guildbar-avatar-size) · width:var(--guildbar-avatar-size)
- **.guildAcronym** — font-size:12px
- **.guildBoostUnavailableNoticeText** — font-size:16px
- **.guildBoostCount** — gap:2px
- **.guildSelectOptionIcon** — border-radius:4px · border-radius:var(--radius-sm)
- **.rail** — height:100%
- **.guilds** — width:0 · width:var(--custom-guild-list-width)
- **.navItemIcon** — height:24px · width:24px
- **.navContent** — gap:var(--space-12) · width:100%
- **.folderHeader** — height:var(--guildbar-folder-size) · width:var(--guildbar-folder-size) · border-radius:12px
- **.folderButton** — height:var(--guildbar-folder-size) · width:var(--guildbar-folder-size) · padding:var(--custom-folder-padding)
- **.folderButtonInner** — border-radius:var(--radius-md) · height:var(--guildbar-avatar-size) · width:var(--guildbar-avatar-size)
- **.folderPreview** — gap:2px · height:calc(var(--guildbar-folder-size) - var(--cus · width:calc(var(--guildbar-folder-size) - var(--cus · height:calc(var(--guildbar-avatar-size) - var(--cus · width:calc(var(--guildbar-avatar-size) - var(--cus
- **.folderHeaderSmall** — padding:3px · margin:calc((var(--guildbar-avatar-size) - var(--gu · margin:0
- **.guildTagPill** — border-radius:var(--radius-sm) · height:24px · margin:0 auto
- **.navigatorTrailing** — gap:var(--space-12)
- **.guildIconMask** — min-height:32px · width:32px
- **.guildBoostUnavailableNotice** — border-radius:9999px · padding:8px 16px · width:-moz-fit-content · width:fit-content
- **.serverSection** — gap:var(--space-12)
- **.serverInfo** — gap:var(--space-4)
- **.guildBoostBadge** — flex:0 0 auto · height:18px · width:18px
- **.guildBoostCtas** — gap:var(--space-12)
- **.guildBoostCtaPrimary** — flex:0 0 auto
- **.guildThemeLayout** — flex:1 1 auto · height:100% · width:100%
- **.guildThemeGraphicGradient** — padding:var(--space-24) var(--space-48) var(--space- · width:100%
- **.guildThemeGraphicImage** — max-height:162px · width:100% · width:288px
- **.guildThemeTitleGroup** — gap:2px
- **.guildThemeCostRow** — gap:2px
- **.guildThemeFooter** — padding:var(--space-32)
- **.navigationTooltip** — gap:4px
- **.guildCategorySeparator** — margin:var(--custom-stickers-constants-category-sep
- **.guildSidebar** — flex:1 1 auto · min-height:0
- **.guildSidebarHeader** — flex:0 0 auto · height:var(--custom-channel-header-height) · padding:var(--space-xs) var(--space-md)
- **.serverNickname** — gap:var(--space-8)
- **.guildIconContainer** — gap:var(--space-4)
- **.navLinkButton** — padding:0
- **.navLabel** — flex:1 · width:0
- **.guild** — border-radius:var(--radius-sm)
- **.guildSeparator** — border-radius:1px · height:1px · width:32px
- **.folderGroup** — padding:calc((var(--guildbar-folder-size) - var(--gu · padding:var(--space-4) · gap:2px · width:var(--custom-guild-list-width)
- **.folderPreviewGuildIcon** — height:var(--custom-folder-preview-guild-size) · width:var(--custom-folder-preview-guild-size)
- **.folderPreviewGuildIconError** — padding:3px

</details>

<details><summary>Autres noms de la famille (9)</summary>

folderButtonContent, navButtonActive, guildStatusCopy, guildBoostCountCurrentUser, guildBoostBadgeWithBoosts, navItemSelected, navDecoration, navList, folderGuildsList

</details>

---

## Canaux (salons, categories, fils) (61 composants)

<details><summary>36 composants avec cotes explicites</summary>

- **.channelIcon** — border-radius:16px · margin:0 8px · width:16px · height:16px · height:20px · padding:4px · width:20px · width:auto
- **.channelName** — font-weight:var(--font-weight-bold) · border-radius:8px · width:180px
- **.channelStatus** — font-size:12px · line-height:16px
- **.voiceSectionIconWrapper** — border-radius:50% · height:16px · width:16px
- **.channel** — grid-template-columns:1fr var(--custom-member-list-width) · height:100% · width:var(--custom-guild-sidebar-width)
- **.channelTextArea** — border-radius:var(--radius-sm) · width:100%
- **.voiceClipPlayerOverlay** — border-radius:var(--radius-md) · max-height:100%
- **.channelGuildIcon** — border-radius:var(--radius-sm)
- **.topicsPillContainer** — border-radius:0 0 8px 8px · height:32px · min-height:32px
- **.topicsPill** — width:100%
- **.topicsPillText** — flex:1
- **.topicsPillTextSelected** — border-radius:16px · height:26px
- **.topicsPillSummaryIcon** — min-height:16px · width:16px
- **.topicsPillCarets** — height:24px
- **.topicsPillCaret** — width:32px
- **.topicsCaretRight** — border-radius:0 20px 20px 0
- **.topicsCaretLeft** — border-radius:20px 0 0 20px
- **.topicsDropdownBase** — border-radius:8px · width:412px
- **.topicsScroller** — max-height:412px
- **.topicsMessageCount** — width:-moz-fit-content · width:fit-content
- **.channelStatusTooltipAnchor** — width:100% · width:0
- **.channelStatusClickable** — width:75cqw · width:-moz-fit-content · width:fit-content
- **.voiceSection** — grid-template-columns:32px minmax(20px,auto) max-content · gap:12px
- **.voiceSectionAssets** — border-radius:50% · height:32px · width:32px
- **.voiceSectionGuildImage** — border-radius:50% · height:32px · width:32px
- **.voiceSectionIcon** — height:10px · width:10px
- **.channelSelection** — margin:var(--space-8) 0 var(--space-24)
- **.voiceUsers** — gap:4px · width:100%
- **.channelListHidden** — width:var(--custom-guild-list-width)!important
- **.voiceChannelNameContainer** — gap:4px
- **.topicFormItem** — width:100%
- **.voiceChannel** — gap:4px
- **.voiceChannelText** — flex:1 · gap:2px
- **.voiceChannelDivider** — width:100%
- **.stage** — grid-template-columns:minmax(0,1fr)
- **.stageGrid** — gap:var(--space-8) · grid-template-columns:repeat(2,minmax(0,1fr)) · padding:var(--space-12) · width:100cqw

</details>

<details><summary>Autres noms de la famille (25)</summary>

topicsPillDropdownCaret, topicsDotSpacer, voiceIcon, channelNameFade, channelItem, topicsPillTextUnselected, topicsPillTextTitle, topicsPillCaretDisabled, topicsDropdown, topicsDropdownHeading, topicsDropdownHeadingText, topicsPillHeadingIcon, topicsDropdownClose, topicsChatBubbleIcon, topicsTopicTitle, topicsSubtitle, voiceSectionDetails, voiceSectionText, voiceSectionNoGuildImageWrapper, voiceSectionNoGuildImage, channelSelectionFormItem, voiceSummaryContainer, voiceChannelHeading, voiceChannelOverflowCount, threadSuggestionBar

</details>

---

## Chat (messages, markdown, pieces jointes) (98 composants)

<details><summary>71 composants avec cotes explicites</summary>

- **.code** — font-size:12px · font-weight:700 · line-height:1.3333333333333333 · border-radius:var(--radius-sm) · gap:var(--space-8) · grid-template-columns:repeat(var(--secure-frames-columns),1fr) · padding:var(--space-12) · gap:var(--space-16)
- **.embedFull** — width:4px
- **.embedDescription** — font-weight:var(--font-weight-medium)
- **.markup** — font-size:1rem · line-height:var(--chat-markup-line-height) · font-weight:var(--font-weight-medium) · font-weight:var(--font-weight-normal)
- **.embedAuthorName** — flex:1 · font-size:.875rem · font-weight:var(--font-weight-semibold) · width:0 · font-weight:var(--font-weight-medium)
- **.messageGroupBlockedBtn** — font-size:12px · font-weight:var(--font-weight-medium) · margin:0 · padding:9px 0
- **.embed** — border-radius:4px · width:-moz-max-content · width:max-content
- **.embedSuppressButton** — padding:2px
- **.embedMedia** — border-radius:4px
- **.codeView** — font-size:.875rem · line-height:1rem · min-height:100px · margin:8px 8px 0 · padding:8px
- **.spoilerContainer** — height:100%
- **.compact** — padding:var(--space-24) · height:100%
- **.embedProvider** — font-weight:var(--font-weight-medium)
- **.embedAuthor** — width:0
- **.embedFooterText** — font-weight:var(--font-weight-medium)
- **.embedFieldName** — width:0 · font-weight:var(--font-weight-semibold)
- **.embedFieldValue** — width:0 · font-weight:var(--font-weight-normal)
- **.messageGroupBlocked** — flex:0 0 auto · margin:6px 0
- **.messageEmbed** — gap:8px · padding:8px · width:292px
- **.timestamp** — font-weight:var(--font-weight-bold) · border-radius:3px · padding:0 2px
- **.chatMessageAssistant** — width:80% · padding:var(--space-12) · width:-moz-fit-content · width:fit-content · width:100% · width:0
- **.message** — width:100%
- **.embedAuthorIcon** — border-radius:50% · flex:none · height:24px · width:24px
- **.embedTitle** — font-size:1rem · font-weight:var(--font-weight-semibold)
- **.embedGalleryImagesWrapper** — border-radius:4px · gap:4px · grid-template-columns:1fr 1fr
- **.embedGalleryImageElement** — height:100% · max-height:100%!important · width:100%!important · width:100%
- **.embedVideoImageComponent** — border-radius:0 · height:100%!important · max-height:100% · width:100%!important
- **.embedVideoImageComponentInner** — height:100%!important · width:100%!important
- **.embedVideoAction** — height:24px · width:24px
- **.embedIframe** — height:100% · width:100%
- **.embedFooterSeparator** — font-weight:var(--font-weight-medium) · margin:0 4px
- **.embedFooterIcon** — border-radius:50% · height:20px · width:20px
- **.embedFields** — gap:8px
- **.embedField** — width:0
- **.attachmentRow** — gap:6px
- **.attachmentPreview** — border-radius:8px · height:56px · width:56px
- **.messages** — margin:0 · padding:0
- **.messageChipletContainerInner** — line-height:2px!important
- **.messagesErrorBar** — padding:var(--space-4) var(--space-8)
- **.messageHeaderSkeleton** — gap:2px
- **.timestampSkeleton** — height:12px · width:40px
- **.messageEmbedHeaderSkeleton** — height:15px
- **.messageEmbedContent** — gap:8px
- **.messageEmbedContentIconSkeleton** — height:24px · width:24px
- **.messageEmbedContentLines** — gap:4px · width:190px
- **.messageEmbedContenPrimaryLineSkeleton** — height:6px
- **.messageEmbedContentSecondaryLineSkeleton** — height:5px · width:94px
- **.messageEmbedContentActionSkeleton** — height:24px · width:59px
- **.embeddedActivityName** — flex:1
- **.embeddedActivityTimeElapsed** — flex:0 0 auto
- **.embeddedActivityPlayerContainer** — border-radius:12px
- **.embeddedActivityImage** — border-radius:12px · height:auto · max-height:100% · width:100%
- **.embeddedActivityImageOverlay** — border-radius:12px · height:100% · width:100%
- **.chatInputSurface** — border-radius:var(--radius-sm) · padding:24px
- **.messageRequestList** — flex:0 1 360px · width:280px
- **.codeContainer** — width:50vw
- **.timestampTooltip** — width:unset
- **.chatMarkdown** — font-size:14px
- **.embedContainer** — border-radius:var(--radius-xs)
- **.attachmentContainer** — border-radius:var(--radius-sm)

</details>

<details><summary>Autres noms de la famille (27)</summary>

embedThumbnail, embedAmazonMusic, embedTitleLink, embedLink, embedFooter, codeActions, embedMargin, embedAuthorNameLink, embedImage, embedGallerySide, embedVideo, embedVideoActions, embedGIFTag, embedPlaystation, attachmentPreviewVideo, attachmentPreviewOverflow, messageBadge, messageTextButton, messageIconButton, embedIFrame, embeddedActivityTopRow, embeddedActivityJoinWrapper, embeddedActivityIcon, attachmentFilename, chatIcon, spoilerContent, spoiler

</details>

---

## Membres et profils (61 composants)

<details><summary>46 composants avec cotes explicites</summary>

- **.avatar** — flex:0 0 auto · height:unset · width:unset · border-radius:50% · height:100% · width:100% · height:20px!important · width:20px!important
- **.username** — flex:0 1 auto · font-size:12px · font-weight:var(--font-weight-medium) · line-height:14px · width:100% · width:0 · font-weight:var(--font-weight-normal) · font-weight:var(--font-weight-semibold)
- **.avatarContainer** — height:56px · width:56px · height:32px · width:32px · height:24px · width:24px · height:16px · width:16px
- **.avatars** — gap:var(--space-6)
- **.avatarContainerMasked** — height:56px · width:56px · height:32px · width:32px · height:24px · width:24px · height:16px · width:16px
- **.usernameAndPronounsRow** — gap:9.33px · gap:2px · gap:4px · gap:8px
- **.statusText** — font-size:14px
- **.userInfo** — margin:16px 16px 0 · width:0
- **.status** — height:auto · width:320px
- **.userList** — border-radius:3px · width:250px
- **.profileEffects** — border-radius:inherit
- **.avatarAccessory** — height:24px · width:24px · border-radius:var(--radius-round)
- **.profileAvatar** — border-radius:50% · height:80px · width:80px
- **.profileHeader** — gap:var(--space-8)
- **.roleMention** — font-weight:var(--font-weight-medium)
- **.statusMessageContainer** — gap:var(--space-4) · grid-template-columns:auto 1fr
- **.roleCircle** — border-radius:50% · height:12px · margin:0 4px · padding:0 · width:12px
- **.memberItem** — min-height:24px · padding:6px 8px
- **.avatarSmall** — height:32px · width:32px
- **.avatarLarge** — height:40px · width:40px
- **.profileFrameContainer** — height:100% · max-height:100% · width:100%
- **.profileFrame** — height:100% · width:calc(100% + var(--custom-profile-frame-scale
- **.profileFrameMask** — width:100%
- **.profileFrameLayer** — width:100%
- **.usernameSkeleton** — height:12px · width:71px
- **.avatarStack** — height:100% · width:100%
- **.avatarDecoration** — height:100% · width:100%
- **.user** — font-size:14px · padding:10px
- **.profilePopout** — border-radius:var(--radius-sm) · width:300px
- **.profileBanner** — height:105px
- **.profileTabs** — gap:var(--space-16)
- **.profileContent** — gap:var(--space-10) · padding:var(--space-16)
- **.member** — width:calc(var(--custom-member-list-width) - 16px)
- **.memberInner** — height:auto · padding:var(--space-xxs) 0 var(--space-xxs)
- **.roleName** — width:150px
- **.rolePopout** — border-radius:8px · max-height:calc(100vh - 20px) · width:240px
- **.roleHeader** — height:40px
- **.avatarIconOverlay** — padding:4px
- **.userTooltip** — font-size:16px
- **.userContainer** — border-radius:8px · padding:16px
- **.avatarPopover** — margin:auto · width:-moz-fit-content · width:fit-content
- **.roles** — max-height:300px · padding:0 8px 8px
- **.role** — border-radius:4px · padding:8px
- **.avatarWithText** — height:unset · padding:1px 0
- **.userTagClickable** — height:24px
- **.profileBioInput** — min-height:100%

</details>

<details><summary>Autres noms de la famille (15)</summary>

roleDot, userTagUsername, avatarWithBackground, roleDotRight, roleDotLeft, avatarWrapper, avatarMasked, avatarDecorationContainer, roleScroller, avatarIconRed, statusTooltip, members, userIcon, statusPopover, userTagDiscriminator

</details>

---

## Surcouches (modales, menus, popovers) (30 composants)

<details><summary>22 composants avec cotes explicites</summary>

- **.tooltip** — width:275px · border-radius:8px · width:360px · padding:0 · border-radius:var(--radius-sm)
- **.tooltipContainer** — padding:16px 8px 4px · padding:0
- **.modalContent** — height:100% · min-height:0 · width:100% · height:var(--custom-badge-modal-height) · padding:0 · gap:var(--custom-modal-padding)
- **.popover** — border-radius:100px · gap:2px · height:unset · padding:2px
- **.modalRoot** — width:100vw · height:100vh · width:256px · width:var(--custom-badge-modal-width) · width:723px · width:320px · height:560px · border-radius:0
- **.modal** — margin:0 · height:524px
- **.modalFooter** — font-size:.875rem · width:0 · padding:var(--custom-modal-padding-md) var(--custom-
- **.modalContentContainer** — height:600px · width:850px · margin:0 · width:480px · padding:0!important
- **.tooltipBodyContainer** — padding:8px 12px
- **.tooltipPremiumFooterContainer** — border-radius:0 0 5px 5px
- **.tooltipRemovePadding** — padding:0
- **.tooltipPremiumFooterSegment** — padding:4px
- **.modalContainer** — height:100% · width:100%
- **.tooltipEmojiName** — width:100%
- **.modalHeader** — gap:4px · padding:16px 0 0
- **.modalGuildTheme** — border-radius:var(--radius-lg)
- **.modalContentContainerGuildTheme** — height:454px · width:480px
- **.modalContentContainerGuildThemeNoFooter** — height:auto
- **.dialog** — border-radius:inherit
- **.modalPreview** — gap:var(--space-12) · height:-moz-fit-content · height:fit-content · width:280px
- **.drawerSizingWrapper** — height:100% · width:100%
- **.menu** — max-height:70vh · width:222px

</details>

<details><summary>Autres noms de la famille (8)</summary>

tooltipPremiumFooterTierSegment, modalTextContainer, tooltipIcon, modalTopPill, menuIcon, tooltipWordmarkContainer, tooltipWrapper, contextMenu

</details>

---

## Controles de formulaire (85 composants)

<details><summary>56 composants avec cotes explicites</summary>

- **.button** — border-radius:8px · font-size:14px · font-weight:var(--font-weight-medium) · line-height:16px · padding:2px 16px · flex:1 1 0 · min-height:40px · width:137px
- **.selected** — height:40px · height:24px
- **.buttonContainer** — gap:8px · gap:var(--space-8) · margin:0 auto · padding:0 var(--space-32) · padding:8px · gap:var(--space-16) · gap:var(--space-4)
- **.label** — border-radius:var(--radius-lg) · height:20px · padding:6px · width:20px · font-weight:var(--font-weight-bold) · margin:var(--space-24) 0 var(--space-8) · font-weight:var(--font-weight-semibold)
- **.input** — border-radius:8px · font-size:16px · height:44px · padding:12px 10px · width:100% · flex:1 · font-size:inherit · height:100%
- **.checkboxIndicator** — border-radius:var(--radius-xs) · flex:0 0 auto · height:var(--custom-checkbox-size) · width:var(--custom-checkbox-size)
- **.buttonChildrenWrapper** — border-radius:var(--radius-sm) · width:100% · min-height:22px · width:22px · padding:calc(var(--space-4) - 1px) calc(var(--space- · min-height:30px · width:30px · min-height:38px
- **.radioBar** — border-radius:4px · gap:8px · padding:var(--space-12) var(--space-16)!important · border-radius:0
- **.radioIndicator** — height:var(--custom-radio-size) · width:var(--custom-radio-size) · border-radius:var(--radius-lg) · border-radius:50% · height:24px · width:24px
- **.buttonWrapper** — flex:0 1 auto
- **.buttonChildren** — gap:var(--space-4)
- **.labelContainer** — flex:1 · gap:4px · gap:var(--space-4) · width:0
- **.selectorButton** — flex:1 1 auto · width:36px · padding:6px 0
- **.buttonsContainer** — gap:8px · width:100%
- **.sliderContainer** — gap:8px · border-radius:var(--radius-sm) · width:188px · padding:var(--space-12) · padding:0 8px
- **.selectButton** — gap:4px · width:100% · min-height:calc(var(--select-option-height) - 2px) · gap:var(--space-8) · min-height:56px
- **.buttons** — gap:var(--space-8) · height:var(--custom-channel-textarea-text-area-heig
- **.slider** — height:40px · width:100%
- **.inputPrefix** — font-size:16px · height:40px · line-height:normal
- **.inputError** — gap:8px
- **.formItem** — width:100%
- **.buttonIcon** — height:16px · width:16px
- **.formBody** — gap:var(--space-16) · width:760px · padding:var(--space-24)
- **.fieldsContainer** — gap:var(--space-4)
- **.fields** — gap:16px
- **.inputWithButtonRow** — gap:8px
- **.selectionGroup** — width:var(--custom-in-app-icon-editor-content-widt
- **.radioGroupOption** — border-radius:var(--radius-sm) · min-height:var(--custom-radio-size)
- **.radioItemIcon** — height:var(--custom-radio-icon-size) · width:var(--custom-radio-icon-size)
- **.field** — width:0
- **.selectFieldContainer** — width:100%
- **.selectField** — gap:0 · grid-template-columns:1fr auto auto · width:100%
- **.selectDropdown** — border-radius:var(--radius-sm)
- **.checkboxOption** — gap:var(--space-12) · border-radius:var(--radius-sm) · gap:var(--custom-checkbox-gap) · width:100%
- **.labeled** — min-height:var(--custom-checkbox-size)
- **.buttonBody** — font-size:16px · line-height:1.25
- **.formRow** — gap:var(--space-8)
- **.buttonGroup** — margin:var(--space-4) 0 · width:unset
- **.buttonChevron** — height:32px · line-height:0 · width:16px
- **.buttonChevronIcon** — height:16px · width:16px
- **.buttonRow** — gap:var(--space-8) · grid-template-columns:1fr auto
- **.buttonTitle** — margin:20px 20px 0
- **.buttonLogin** — font-size:12px · font-weight:var(--font-weight-semibold)
- **.formContent** — width:100%
- **.radioPositionLeft** — grid-template-columns:auto 1fr
- **.radioPositionRight** — grid-template-columns:1fr auto
- **.radioIndicatorGroup** — gap:var(--space-8)
- **.buttonSection** — border-radius:12px · gap:8px · padding:4px
- **.buttonSize** — height:40px · width:80px
- **.buttonLoader** — border-radius:4px · height:40px · width:80px
- **.buttonOverlayActions** — padding:0 8px
- **.fieldsImage** — border-radius:var(--radius-xs) · height:24px · width:24px
- **.switchFreezeFrame** — border-radius:inherit · height:100% · width:100%
- **.selectedIcon** — width:24px · padding:var(--space-xxs) var(--space-4) var(--space-
- **.btnHamburger** — height:45px · padding:8px · width:60px
- **.selectionCircle** — border-radius:8px · height:calc(100% + 4px) · width:calc(100% + 4px)

</details>

<details><summary>Autres noms de la famille (29)</summary>

form, buttonShine, radioIconForeground, buttonInner, labelWrapper, selectMessage, selectorText, selectorTextSelected, selectorButtonSelected, labelChecked, formTitle, checkbox, checkboxLabel, selector, sliderVisible, inputWrapper, buttonText, selectedPill, buttonHighlighted, inputText, switchSlot, buttonContent, selectable, buttonSizer, buttonOverlay, buttonDisabledSecondaryActionsEnabled, buttonDisabled, buttonOverlayBackground, buttonMinor

</details>

---

## Retours d'etat (badges, indicateurs) (75 composants)

<details><summary>54 composants avec cotes explicites</summary>

- **.divider** — height:1px · margin:20px 0 · width:100% · margin:8px 0 · margin:0 16px · padding:8px · flex:0 0 auto · height:0
- **.badge** — border-radius:8px · gap:4px · padding:6px 12px · border-radius:12px · gap:2px · height:1rem · width:1rem · border-radius:19px
- **.spinner** — height:100% · margin:0 · width:100% · height:240px · width:240px · height:52px · margin:32px
- **.separator** — height:1px · flex:none · width:1px · height:20px · margin:0
- **.progress** — width:100% · flex:1 · height:6px · width:10px · border-radius:5px · height:100% · width:var(--custom-min-width) · width:0
- **.badgeContainer** — gap:4px · width:100%
- **.progressContainer** — padding:var(--space-16) 0 · border-radius:5px · height:var(--custom-expressive-progress-height) · width:100% · width:75% · height:16px · height:20px · width:20px
- **.badgeIdentity** — gap:var(--space-4) · width:100%
- **.tag** — border-radius:var(--radius-sm) · flex:1 · height:20px · font-size:12px · line-height:16px · padding:0 6px
- **.badgeAccessoryLine** — gap:var(--space-4) · min-height:16px · width:100%
- **.badgeDetails** — gap:12px · width:100% · gap:var(--space-12)
- **.tags** — gap:var(--space-8)
- **.spinnerContainer** — height:100% · width:100%
- **.badges** — gap:12px · gap:8px · gap:0
- **.badgeText** — font-size:14px · line-height:18px
- **.pill** — border-radius:var(--radius-xs) · font-weight:var(--font-weight-semibold) · padding:2px 4px
- **.pillMessage** — font-size:14px · font-size:16px
- **.badgeGraphic** — height:100px · width:100% · width:100px · height:120px
- **.badgeInfo** — gap:var(--space-24) · width:100%
- **.badgeEyebrow** — width:100%
- **.badgeAccessoryText** — width:0
- **.progressBar** — margin:var(--space-8) 0 var(--space-4)
- **.loader** — width:100% · border-radius:8px · height:80px
- **.indicatorDot** — border-radius:var(--radius-round) · flex:0 0 auto
- **.badgeImage** — height:90px · max-height:100% · width:100%
- **.progressToPlayheadBar** — border-radius:99px · height:100% · width:100%
- **.progressToPlayheadGlowBar** — border-radius:99px · height:100%
- **.chipletContainerInner** — border-radius:4px · line-height:16px!important · padding:0 4px
- **.spinnerWrapper** — height:100% · width:100%
- **.pillIcon** — border-radius:50% · height:10px · width:10px
- **.spinnerVideo** — height:200px · width:200px
- **.badgeSection** — gap:12px
- **.badgeGrid** — gap:var(--space-8)
- **.badgeSlot** — border-radius:var(--radius-sm) · height:var(--custom-badge-slot-size,62px) · width:var(--custom-badge-slot-size,62px)
- **.badgeIndicator** — border-radius:50% · height:8px · width:8px
- **.badgeSlotIcon** — height:24px · width:24px
- **.badgeBetaTag** — gap:2px
- **.badgeAccessoryGroup** — gap:var(--space-4) · width:0
- **.badgeStatsGrid** — gap:12px · grid-template-columns:repeat(2,minmax(0,1fr)) · width:100%
- **.badgeStatsGridSingle** — grid-template-columns:minmax(0,1fr)
- **.badgeStatCard** — border-radius:var(--radius-md) · gap:var(--space-4)
- **.progressSection** — gap:var(--space-16) · width:100%
- **.badgeGraphicAnimatedNitro** — height:150px · margin:calc(var(--space-12)*-1)
- **.badgeAccessorySegment** — gap:var(--space-4) · width:0
- **.badgeVerifiedIcon** — height:16px · width:16px
- **.badgeRow** — gap:var(--space-16) · width:100%
- **.badgeTrigger** — height:var(--space-24) · width:var(--space-24)
- **.badgeTriggerImg** — height:100% · width:100%
- **.separatorDot** — border-radius:var(--radius-round) · height:4px · width:4px
- **.progressCircleContainer** — height:34px · width:34px
- **.chip** — border-radius:6px · gap:var(--space-4) · height:var(--size-24)
- **.progressCircle** — height:100% · width:100%
- **.badgesContainerGameProfile** — gap:4px
- **.indicator** — height:100% · width:100%

</details>

<details><summary>Autres noms de la famille (21)</summary>

spinnerItem, dividerContent, pillIconTotal, badgeTitle, badgeAccessoryDot, chipletContainerInline, badgePlaceholder, tagText, pillOnline, pillIconOnline, pillFlat, badgeSlotSelected, badgeGraphicAnimated, badgeAccessoryRows, badgeBetaTagIcon, tagFaded, badgeImageContainer, badgeVectorSrc, badgedGuildIcon, badgeLabel, indicatorWrapper

</details>

---

## Medias (emojis, stickers, icones) (70 composants)

<details><summary>36 composants avec cotes explicites</summary>

- **.icon** — border-radius:2px · flex:0 0 auto · height:20px · width:20px · height:12px · width:12px · height:48px · width:48px
- **.iconWrapper** — height:28px · width:28px · flex:0 0 auto · height:32px · width:32px · border-radius:24px · padding:12px · margin:0
- **.iconContainer** — height:40px · width:40px · width:20px · height:120px · margin:0 auto · width:120px · height:20px · height:1lh
- **.emoji** — height:20px · width:20px · height:16px · width:16px · height:24px · min-height:auto · width:auto · width:24px
- **.iconBadge** — width:16px · border-radius:8px · font-size:8px · height:var(--__badgeHeight) · width:var(--__badgeWidth)
- **.iconImage** — border-radius:50% · height:100% · width:100%
- **.sticker** — margin:auto 2px
- **.searchBar** — height:40px · border-radius:var(--radius-sm)
- **.stickerCategory** — border-radius:4px · height:var(--custom-stickers-constants-sticker-cate · width:var(--custom-stickers-constants-sticker-cate
- **.gifFavoriteButton** — border-radius:5px · padding:6px · border-radius:4px
- **.gif** — border-radius:5px · width:100%
- **.iconPlaceholder** — border-radius:50% · height:100% · width:100%
- **.search** — flex:0 1 244px · width:244px · width:clamp(var(--space-64),100cqi - 320px,244px) · margin:0 8px 8px
- **.emojiButton** — font-size:14px · max-height:50px · border-radius:8px
- **.stickerAutoComplete** — grid-template-columns:repeat(auto-fill,116px) · gap:8px · padding:8px 16px
- **.emojiBackground** — border-radius:50% · height:24px · width:24px
- **.emojiErrorItem** — border-radius:var(--radius-xs) · padding:16px
- **.emojiInput** — gap:var(--space-8) · grid-template-columns:auto 1fr auto · min-height:var(--control-input-height-md) · width:16ch · padding:0 var(--space-12)
- **.iconWithGuildIcon** — border-radius:var(--radius-round) · height:12px · padding:4px · width:12px
- **.iconAccessory** — height:32px · padding:var(--space-4) · width:32px
- **.stickerCategoryGeneric** — padding:4px
- **.stickerPackThumbnail** — height:100% · width:100%
- **.stickerAsset** — height:100% · width:100%
- **.iconSection** — gap:12px
- **.iconWrap** — height:100px · width:100px
- **.iconMask** — height:20px · width:20px
- **.giftBoxIcon** — height:auto · width:32px
- **.iconAndTextContainer** — flex:1 0 0 · gap:var(--space-8) · width:0
- **.stickersUnseenBadge** — border-radius:8px · height:16px · width:16px · padding:0
- **.iconBackground** — border-radius:50% · height:64px · width:64px
- **.emojiImage** — height:20px · width:20px
- **.emojiRaw** — font-size:20px
- **.picker** — border-radius:var(--radius-sm) · height:420px · width:531px
- **.iconCircle** — border-radius:10px · height:20px · width:20px
- **.stickerIcon** — height:20px!important · width:20px!important
- **.iconBadgeWithText** — font-weight:600

</details>

<details><summary>Autres noms de la famille (34)</summary>

stickerCategoryGenericIcon, iconForeground, emojiText, stickerCategoryGenericDisabled, iconOnly, searchMessage, uploading, iconClosed, emojis, emojiMask, iconNotTracked, iconTracked, iconButton, stickerCategoryGenericLast, stickersRow, iconPlay, iconExternalMargins, iconDiv, iconDivCenter, stickersNavItem, searchableSelect, iconOffset, iconEye, iconsContainer, stickerButton, stickerButtonWithNotification, emojiContainer, emojiContainerClickable, emojiJumbo, iconDisabled, iconBadgeStyleImportant, iconBadgeStyleUnread, iconBadgeTop, iconBadgeBottom

</details>
