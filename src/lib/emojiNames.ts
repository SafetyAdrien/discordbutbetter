import { customEmojiRegex } from '@/lib/customEmoji';

/* Noms courts (`:star:`) affiches dans les infobulles de reaction, comme sur Discord. */
const NAMES: Record<string, string> = {
  '⭐': 'star', '✅': 'white_check_mark', '❤️': 'heart', '❤': 'heart', '🍏': 'green_apple', '👍': 'thumbsup', '👎': 'thumbsdown',
  '😂': 'joy', '🔥': 'fire', '😍': 'heart_eyes', '👀': 'eyes', '🎉': 'tada', '😢': 'cry', '🙏': 'pray', '😮': 'open_mouth',
  '😭': 'sob', '💯': '100', '😀': 'grinning', '😄': 'smile', '😁': 'grin', '👏': 'clap', '🤔': 'thinking', '😎': 'sunglasses',
  '😡': 'rage', '💀': 'skull', '🙂': 'slight_smile', '😊': 'blush', '😉': 'wink', '🥺': 'pleading_face', '✨': 'sparkles',
  '💔': 'broken_heart', '😅': 'sweat_smile', '🤣': 'rofl', '😘': 'kissing_heart', '👋': 'wave', '🙌': 'raised_hands',
  '💪': 'muscle', '😱': 'scream', '😴': 'sleeping', '🤯': 'exploding_head', '😆': 'laughing', '❌': 'x', '⚠️': 'warning',
  '❓': 'question', '❗': 'exclamation', '🚀': 'rocket', '🎂': 'birthday', '🍕': 'pizza', '☕': 'coffee', '🌟': 'star2',
  '💜': 'purple_heart', '💙': 'blue_heart', '💚': 'green_heart', '💛': 'yellow_heart', '🧡': 'orange_heart', '🖤': 'black_heart',
  '🤝': 'handshake', '👌': 'ok_hand', '✌️': 'v', '🤞': 'crossed_fingers', '😏': 'smirk', '😬': 'grimacing', '🙄': 'rolling_eyes',
};

/** `:nom:` d'un emoji (unicode ou de serveur), ou l'emoji lui-meme si son nom n'est pas connu. */
export function emojiShortcode(emoji: string): string {
  const m = customEmojiRegex().exec(emoji);
  if (m) return `:${m[2]}:`;
  const short = /^:([A-Za-z0-9_]{2,32}):$/.exec(emoji);
  if (short) return emoji;
  const n = NAMES[emoji] ?? NAMES[emoji.replace(/️/g, '')];
  return n ? `:${n}:` : emoji;
}
