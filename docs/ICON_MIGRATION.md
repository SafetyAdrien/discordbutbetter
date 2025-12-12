# Migration des Icônes : Lucide React → Streamline Nova Solid

## Structure des fichiers

```
src/components/icons/
├── StreamlineIcon.tsx      # Wrapper de base (déjà créé)
├── index.ts                # Exports centralisés
└── icons/                  # Dossier contenant toutes les icônes
    ├── Hash.tsx            # ✅ Créé
    ├── Plus.tsx            # ✅ Créé
    ├── X.tsx               # ✅ Créé
    ├── Send.tsx            # ✅ Créé
    └── ... (à ajouter)
```

## Comment ajouter une icône

1. Téléchargez l'icône depuis Streamline Pro (Nova Solid)
2. Créez un fichier `src/components/icons/icons/NomIcone.tsx`
3. Utilisez ce template :

```tsx
import { createStreamlineIcon } from "../StreamlineIcon";

export const NomIcone = createStreamlineIcon(
  "NomIcone",
  <path d="..." />  // ou plusieurs éléments avec <>...</>
);

export default NomIcone;
```

4. Ajoutez l'export dans `src/components/icons/index.ts`

---

## Liste complète des icônes à migrer (~100 icônes)

### Interface Essential
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Hash` | Hashtag | `Hash.tsx` | ✅ |
| `Plus` | Add | `Plus.tsx` | ✅ |
| `X` | Cross/Delete | `X.tsx` | ✅ |
| `Settings` | Cog/Settings | `Settings.tsx` | ⏳ |
| `Search` | Search | `Search.tsx` | ⏳ |
| `Check` | Check | `Check.tsx` | ⏳ |
| `ChevronDown` | Chevron Down | `ChevronDown.tsx` | ⏳ |
| `ChevronUp` | Chevron Up | `ChevronUp.tsx` | ⏳ |
| `ChevronRight` | Chevron Right | `ChevronRight.tsx` | ⏳ |
| `ChevronLeft` | Chevron Left | `ChevronLeft.tsx` | ⏳ |
| `ChevronsUpDown` | Chevrons Up Down | `ChevronsUpDown.tsx` | ⏳ |
| `MoreVertical` | More Vertical | `MoreVertical.tsx` | ⏳ |
| `MoreHorizontal` | More Horizontal | `MoreHorizontal.tsx` | ⏳ |
| `Menu` | Menu/Hamburger | `Menu.tsx` | ⏳ |
| `Loader2` | Spinner/Loading | `Loader2.tsx` | ⏳ |
| `Circle` | Circle | `Circle.tsx` | ⏳ |
| `AlertCircle` | Alert Circle | `AlertCircle.tsx` | ⏳ |
| `AlertTriangle` | Alert Triangle | `AlertTriangle.tsx` | ⏳ |
| `Info` | Info | `Info.tsx` | ⏳ |
| `HelpCircle` | Help Circle | `HelpCircle.tsx` | ⏳ |

### Communication
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Send` | Send/Email Send | `Send.tsx` | ✅ |
| `MessageSquare` | Chat/Message | `MessageSquare.tsx` | ⏳ |
| `MessageCircle` | Message Circle | `MessageCircle.tsx` | ⏳ |
| `Mail` | Email/Mail | `Mail.tsx` | ⏳ |
| `Phone` | Phone | `Phone.tsx` | ⏳ |
| `PhoneCall` | Phone Call | `PhoneCall.tsx` | ⏳ |
| `PhoneOff` | Phone Off | `PhoneOff.tsx` | ⏳ |
| `AtSign` | At Sign | `AtSign.tsx` | ⏳ |
| `Reply` | Reply | `Reply.tsx` | ⏳ |

### Users & People
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `User` | User | `User.tsx` | ⏳ |
| `Users` | Users | `Users.tsx` | ⏳ |
| `UserPlus` | User Add | `UserPlus.tsx` | ⏳ |
| `UserMinus` | User Remove | `UserMinus.tsx` | ⏳ |
| `UserCheck` | User Check | `UserCheck.tsx` | ⏳ |
| `UserX` | User X | `UserX.tsx` | ⏳ |
| `Crown` | Crown | `Crown.tsx` | ⏳ |

### Multimedia
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Volume2` | Speaker/Volume | `Volume2.tsx` | ⏳ |
| `VolumeX` | Volume Mute | `VolumeX.tsx` | ⏳ |
| `Volume1` | Volume Low | `Volume1.tsx` | ⏳ |
| `Mic` | Microphone | `Mic.tsx` | ⏳ |
| `MicOff` | Microphone Off | `MicOff.tsx` | ⏳ |
| `Video` | Video Camera | `Video.tsx` | ⏳ |
| `VideoOff` | Video Off | `VideoOff.tsx` | ⏳ |
| `Image` | Image/Picture | `Image.tsx` | ⏳ |
| `ImagePlus` | Image Add | `ImagePlus.tsx` | ⏳ |
| `Camera` | Camera | `Camera.tsx` | ⏳ |
| `Film` | Film | `Film.tsx` | ⏳ |
| `Music` | Music | `Music.tsx` | ⏳ |
| `Headphones` | Headphones | `Headphones.tsx` | ⏳ |
| `Play` | Play | `Play.tsx` | ⏳ |
| `Pause` | Pause | `Pause.tsx` | ⏳ |
| `ScreenShare` | Screen Share | `ScreenShare.tsx` | ⏳ |
| `ScreenShareOff` | Screen Share Off | `ScreenShareOff.tsx` | ⏳ |
| `Monitor` | Monitor | `Monitor.tsx` | ⏳ |

### Content & Editing
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Pencil` | Pencil/Edit | `Pencil.tsx` | ⏳ |
| `Trash2` | Bin/Trash | `Trash2.tsx` | ⏳ |
| `Copy` | Copy | `Copy.tsx` | ⏳ |
| `Clipboard` | Clipboard | `Clipboard.tsx` | ⏳ |
| `ClipboardCheck` | Clipboard Check | `ClipboardCheck.tsx` | ⏳ |
| `Bold` | Bold | `Bold.tsx` | ⏳ |
| `Italic` | Italic | `Italic.tsx` | ⏳ |
| `Underline` | Underline | `Underline.tsx` | ⏳ |
| `Strikethrough` | Strikethrough | `Strikethrough.tsx` | ⏳ |
| `Code` | Code | `Code.tsx` | ⏳ |
| `FileText` | File Text | `FileText.tsx` | ⏳ |
| `File` | File | `File.tsx` | ⏳ |
| `Paperclip` | Paperclip/Attachment | `Paperclip.tsx` | ⏳ |
| `Upload` | Upload | `Upload.tsx` | ⏳ |
| `Download` | Download | `Download.tsx` | ⏳ |
| `Save` | Save | `Save.tsx` | ⏳ |

### Navigation & Links
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Link` | Link | `Link.tsx` | ⏳ |
| `Link2` | Link 2 | `Link2.tsx` | ⏳ |
| `ExternalLink` | External Link | `ExternalLink.tsx` | ⏳ |
| `ArrowLeft` | Arrow Left | `ArrowLeft.tsx` | ⏳ |
| `ArrowRight` | Arrow Right | `ArrowRight.tsx` | ⏳ |
| `ArrowUp` | Arrow Up | `ArrowUp.tsx` | ⏳ |
| `ArrowDown` | Arrow Down | `ArrowDown.tsx` | ⏳ |
| `Home` | Home | `Home.tsx` | ⏳ |
| `Compass` | Compass | `Compass.tsx` | ⏳ |
| `LogOut` | Logout | `LogOut.tsx` | ⏳ |
| `LogIn` | Login | `LogIn.tsx` | ⏳ |
| `RefreshCw` | Refresh | `RefreshCw.tsx` | ⏳ |
| `RotateCcw` | Rotate | `RotateCcw.tsx` | ⏳ |
| `Maximize` | Maximize | `Maximize.tsx` | ⏳ |
| `Minimize` | Minimize | `Minimize.tsx` | ⏳ |
| `Move` | Move | `Move.tsx` | ⏳ |
| `GripVertical` | Grip Vertical | `GripVertical.tsx` | ⏳ |

### Security
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Shield` | Shield | `Shield.tsx` | ⏳ |
| `ShieldCheck` | Shield Check | `ShieldCheck.tsx` | ⏳ |
| `ShieldAlert` | Shield Alert | `ShieldAlert.tsx` | ⏳ |
| `Lock` | Lock | `Lock.tsx` | ⏳ |
| `Unlock` | Unlock | `Unlock.tsx` | ⏳ |
| `Key` | Key | `Key.tsx` | ⏳ |
| `Eye` | Eye | `Eye.tsx` | ⏳ |
| `EyeOff` | Eye Off | `EyeOff.tsx` | ⏳ |

### Calendar & Time
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Calendar` | Calendar | `Calendar.tsx` | ⏳ |
| `CalendarDays` | Calendar Days | `CalendarDays.tsx` | ⏳ |
| `Clock` | Clock | `Clock.tsx` | ⏳ |

### Social & Emojis
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Smile` | Emoji Smile | `Smile.tsx` | ⏳ |
| `Frown` | Emoji Frown | `Frown.tsx` | ⏳ |
| `Meh` | Emoji Meh | `Meh.tsx` | ⏳ |
| `Heart` | Heart | `Heart.tsx` | ⏳ |
| `Star` | Star | `Star.tsx` | ⏳ |
| `ThumbsUp` | Thumbs Up | `ThumbsUp.tsx` | ⏳ |
| `ThumbsDown` | Thumbs Down | `ThumbsDown.tsx` | ⏳ |
| `Gift` | Gift | `Gift.tsx` | ⏳ |

### Notifications
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Bell` | Bell | `Bell.tsx` | ⏳ |
| `BellOff` | Bell Off | `BellOff.tsx` | ⏳ |
| `BellRing` | Bell Ring | `BellRing.tsx` | ⏳ |

### Organization
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Folder` | Folder | `Folder.tsx` | ⏳ |
| `FolderOpen` | Folder Open | `FolderOpen.tsx` | ⏳ |
| `FolderPlus` | Folder Plus | `FolderPlus.tsx` | ⏳ |
| `ListTodo` | List Todo | `ListTodo.tsx` | ⏳ |
| `List` | List | `List.tsx` | ⏳ |
| `CheckSquare` | Check Square | `CheckSquare.tsx` | ⏳ |
| `Square` | Square | `Square.tsx` | ⏳ |
| `Grid` | Grid | `Grid.tsx` | ⏳ |
| `Layers` | Layers | `Layers.tsx` | ⏳ |
| `Tag` | Tag | `Tag.tsx` | ⏳ |
| `Hash` | Hashtag | `Hash.tsx` | ✅ |

### Misc
| Lucide | Streamline Nova Solid | Fichier | Status |
|--------|----------------------|---------|--------|
| `Pin` | Pin | `Pin.tsx` | ⏳ |
| `PinOff` | Pin Off | `PinOff.tsx` | ⏳ |
| `Sparkles` | Sparkles | `Sparkles.tsx` | ⏳ |
| `Zap` | Zap/Lightning | `Zap.tsx` | ⏳ |
| `Filter` | Filter | `Filter.tsx` | ⏳ |
| `SortAsc` | Sort Ascending | `SortAsc.tsx` | ⏳ |
| `SortDesc` | Sort Descending | `SortDesc.tsx` | ⏳ |
| `Megaphone` | Megaphone | `Megaphone.tsx` | ⏳ |
| `Wand2` | Magic Wand | `Wand2.tsx` | ⏳ |
| `Keyboard` | Keyboard | `Keyboard.tsx` | ⏳ |
| `Command` | Command | `Command.tsx` | ⏳ |
| `Palette` | Palette | `Palette.tsx` | ⏳ |
| `PlusCircle` | Plus Circle | `PlusCircle.tsx` | ⏳ |
| `MinusCircle` | Minus Circle | `MinusCircle.tsx` | ⏳ |
| `XCircle` | X Circle | `XCircle.tsx` | ⏳ |
| `CheckCircle` | Check Circle | `CheckCircle.tsx` | ⏳ |
| `Bot` | Bot/Robot | `Bot.tsx` | ⏳ |
| `Globe` | Globe | `Globe.tsx` | ⏳ |
| `Signal` | Signal | `Signal.tsx` | ⏳ |
| `Wifi` | Wifi | `Wifi.tsx` | ⏳ |
| `WifiOff` | Wifi Off | `WifiOff.tsx` | ⏳ |
| `Ban` | Ban | `Ban.tsx` | ⏳ |
| `Slash` | Slash | `Slash.tsx` | ⏳ |
| `BarChart` | Bar Chart | `BarChart.tsx` | ⏳ |
| `Activity` | Activity | `Activity.tsx` | ⏳ |
| `Dot` | Dot | `Dot.tsx` | ⏳ |

---

## Une fois toutes les icônes créées

Mettre à jour `src/components/icons/index.ts` :

```ts
// Streamline Nova Solid Icons
export { StreamlineIcon, createStreamlineIcon } from "./StreamlineIcon";
export type { StreamlineIconProps } from "./StreamlineIcon";

// Icons
export { Hash } from "./icons/Hash";
export { Plus } from "./icons/Plus";
export { X } from "./icons/X";
export { Send } from "./icons/Send";
// ... ajouter toutes les autres icônes
```

## Migration des composants

Une fois les icônes créées, remplacer dans chaque fichier :

```tsx
// Avant
import { Hash, Plus, X, Send } from "lucide-react";

// Après
import { Hash, Plus, X, Send } from "@/components/icons";
```

---

## Fichiers à migrer (51 fichiers)

### Priorité 1 - UI Components
- [ ] `src/components/ui/accordion.tsx`
- [ ] `src/components/ui/calendar.tsx`
- [ ] `src/components/ui/carousel.tsx`
- [ ] `src/components/ui/command.tsx`
- [ ] `src/components/ui/dialog.tsx`
- [ ] `src/components/ui/drawer.tsx`
- [ ] `src/components/ui/dropdown-menu.tsx`
- [ ] `src/components/ui/navigation-menu.tsx`
- [ ] `src/components/ui/pagination.tsx`
- [ ] `src/components/ui/scroll-area.tsx`
- [ ] `src/components/ui/select.tsx`
- [ ] `src/components/ui/sheet.tsx`
- [ ] `src/components/ui/sidebar.tsx`
- [ ] `src/components/ui/sonner.tsx`

### Priorité 2 - Layout
- [ ] `src/components/layout/ChannelList.tsx`
- [ ] `src/components/layout/ServerList.tsx`
- [ ] `src/components/layout/MemberList.tsx`
- [ ] `src/components/layout/VoiceControls.tsx`

### Priorité 3 - Chat
- [ ] `src/components/chat/ChatArea.tsx`
- [ ] `src/components/dm/DMConversation.tsx`
- [ ] `src/components/dm/DMPage.tsx`
- [ ] `src/components/dm/DMList.tsx`
- [ ] `src/components/dm/DMCallView.tsx`
- [ ] `src/components/dm/IncomingCallModal.tsx`

### Priorité 4 - Modals
- [ ] `src/components/modals/CreateServerModal.tsx`
- [ ] `src/components/modals/CreateChannelModal.tsx`
- [ ] `src/components/modals/CreateCategoryModal.tsx`
- [ ] `src/components/modals/CreateInviteModal.tsx`
- [ ] `src/components/modals/DiscoverModal.tsx`
- [ ] `src/components/modals/GlobalSearchModal.tsx`
- [ ] `src/components/modals/KeyboardShortcutsModal.tsx`

### Priorité 5 - Server Settings
- [ ] `src/components/server-settings/ServerSettingsModal.tsx`
- [ ] `src/components/server-settings/ServerProfileSettings.tsx`
- [ ] `src/components/server-settings/RoleManager.tsx`
- [ ] `src/components/server-settings/RoleEditor.tsx`
- [ ] `src/components/server-settings/MemberManager.tsx`
- [ ] `src/components/server-settings/InviteManager.tsx`
- [ ] `src/components/server-settings/EmojiManager.tsx`
- [ ] `src/components/server-settings/StickerManager.tsx`
- [ ] `src/components/server-settings/EngagementSettings.tsx`
- [ ] `src/components/server-settings/PrivacySettings.tsx`

### Priorité 6 - Account Settings
- [ ] `src/components/account-settings/AccountSettings.tsx`
- [ ] `src/components/account-settings/AccountSettingsModal.tsx`
- [ ] `src/components/account-settings/ProfileSettingsTab.tsx`
- [ ] `src/components/account-settings/PrivacySettings.tsx`
- [ ] `src/components/account-settings/ConnectionsSettings.tsx`
- [ ] `src/components/account-settings/AuthorizedAppsSettings.tsx`
- [ ] `src/components/account-settings/SessionsSettings.tsx`

### Priorité 7 - Channel Settings
- [ ] `src/components/channel-settings/ChannelSettingsModal.tsx`
- [ ] `src/components/channel-settings/ChannelOverview.tsx`
- [ ] `src/components/channel-settings/ChannelPermissions.tsx`
- [ ] `src/components/channel-settings/ChannelWebhooks.tsx`
- [ ] `src/components/channel-settings/ChannelDangerZone.tsx`

### Priorité 8 - Specialized Channels
- [ ] `src/components/channels/ForumChannel.tsx`
- [ ] `src/components/channels/MediaChannel.tsx`
- [ ] `src/components/channels/TasksChannel.tsx`
- [ ] `src/components/channels/CalendarChannel.tsx`
- [ ] `src/components/channels/AnnouncementChannel.tsx`

### Priorité 9 - Profile & Friends
- [ ] `src/components/profile/UserProfileCard.tsx`
- [ ] `src/components/profile/UserProfilePopup.tsx`
- [ ] `src/components/profile/ProfileSettings.tsx`
- [ ] `src/components/friends/FriendsPanel.tsx`
- [ ] `src/components/friends/AddFriendModal.tsx`

### Priorité 10 - Pages & Others
- [ ] `src/pages/Auth.tsx`
- [ ] `src/pages/Index.tsx`
- [ ] `src/pages/Invite.tsx`
- [ ] `src/pages/NotFound.tsx`
- [ ] `src/lib/markdown.tsx`
