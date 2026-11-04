import { ServerSettingsIcon, type ServerSettingsIconName } from './ServerSettingsIcon';

/*
 * Icones du jeu "ServerSettingsIcons" exposees sous les noms lucide qu'elles
 * remplacent dans les parametres de serveur : il suffit de deplacer le nom
 * de l'import lucide vers ce module.
 */
type Props = Omit<React.ComponentProps<typeof ServerSettingsIcon>, 'name'>;
const make = (name: ServerSettingsIconName) => {
  const Icon = (props: Props) => <ServerSettingsIcon name={name} {...props} />;
  Icon.displayName = `ServerSettingsIcon(${name})`;
  return Icon;
};

export const X = make('close');
export const Search = make('search');
export const Plus = make('plus');
export const MoreHorizontal = make('more-h');
export const MoreVertical = make('more-v');
export const ChevronDown = make('chevron-down');
export const ArrowRight = make('arrow-right');
export const User = make('user');
export const Users = make('users');
export const Clock = make('clock');
export const Info = make('info');
export const Webhook = make('webhook');
export const Bot = make('bot');
export const ImagePlus = make('image-add');
export const CheckCircle2 = make('check-circle');
export const XCircle = make('x-circle');
export const AlertCircle = make('alert-circle');
export const AlertTriangle = make('alert-square');
export const Sprout = make('sprout');
export const Gem = make('boost');
export const GemOutline = make('boost-outline');
export const Sparkles = make('boost-sparkle');
export const Frown = make('frown');
export const MessageBlock = make('message-block');
export const Lines = make('lines');
export const ListPlus = make('list-add');
export const Timeout = make('timeout');
export const ShieldUser = make('shield-user');
export const AutoModArt = make('automod');
export const MemberAdd = make('member-add');
export const Customize = make('customize');
export const Welcome = make('welcome');
export const Integrations = make('integrations');
export const Template = make('template');
export const Mobile = make('mobile');
