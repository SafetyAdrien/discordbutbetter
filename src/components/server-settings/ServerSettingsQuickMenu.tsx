import { Info, Heart, Zap, Smile, Sticker, Volume2, Users, Shield, Link, Puzzle, History, Ban, FileCode, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ServerSettingsQuickMenuProps {
  onSelect: (tabId: string) => void;
  className?: string;
}

const sections = [
  {
    label: 'Serveur',
    items: [
      { id: 'profile', label: 'Profil du serveur', icon: Info },
      { id: 'engagement', label: 'Engagement', icon: Heart },
      { id: 'boost', label: 'Avantages Boost', icon: Zap },
    ],
  },
  {
    label: 'Expressions',
    items: [
      { id: 'emojis', label: 'Émojis', icon: Smile },
      { id: 'stickers', label: 'Stickers', icon: Sticker },
      { id: 'soundboard', label: 'SoundBoard', icon: Volume2 },
    ],
  },
  {
    label: 'Personnes',
    items: [
      { id: 'members', label: 'Membres', icon: Users },
      { id: 'roles', label: 'Rôles', icon: Shield },
      { id: 'invites', label: 'Invitations', icon: Link },
    ],
  },
  {
    label: 'Apps',
    items: [
      { id: 'integrations', label: 'Intégrations', icon: Puzzle },
    ],
  },
  {
    label: 'Modérations',
    items: [
      { id: 'audit', label: 'Audit Log', icon: History },
      { id: 'banned', label: 'Bannis', icon: Ban },
    ],
  },
];

const dangerItems = [
  { id: 'template', label: 'Template de serveur', icon: FileCode },
  { id: 'delete', label: 'Supprimer le serveur', icon: Trash2, danger: true },
];

export function ServerSettingsQuickMenu({ onSelect, className }: ServerSettingsQuickMenuProps) {
  return (
    <div className={className}>
      {sections.map((section, i) => (
        <div key={section.label}>
          {i > 0 && <Separator className="my-1" />}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 pt-1.5 pb-0.5">
            {section.label}
          </p>
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </div>
      ))}
      <Separator className="my-1" />
      {dangerItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-sm transition-colors ${
            item.danger
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
