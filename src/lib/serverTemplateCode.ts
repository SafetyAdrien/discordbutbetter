/**
 * Code de modele de serveur ("Modele de serveur" dans les parametres).
 *
 * La structure (categories, salons de tous types, roles) est serialisee en
 * JSON puis encodee en base64url, prefixee par `dbb.`. Le code se suffit a
 * lui-meme : la fenetre de creation de serveur le decode localement et
 * reutilise le flux d'import existant.
 */

export interface ServerTemplateSnapshot {
  name: string;
  description: string | null;
  serverName: string;
  categories: { name: string; channels: { name: string; type: string; position: number }[] }[];
  orphanChannels: { name: string; type: string; position: number }[];
  roles: { name: string; color: string | null; hoist: boolean }[];
}

const PREFIX = 'dbb.';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeServerTemplate(snapshot: ServerTemplateSnapshot): string {
  return PREFIX + toBase64Url(JSON.stringify(snapshot));
}

/** Accepte le code seul ou un lien `.../template/<code>`. Renvoie null si ce n'est pas un code de l'app. */
export function decodeServerTemplate(input: string): ServerTemplateSnapshot | null {
  const raw = input.trim().split('/template/').pop() ?? '';
  if (!raw.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(fromBase64Url(raw.slice(PREFIX.length))) as ServerTemplateSnapshot;
    if (!Array.isArray(data.categories) || !Array.isArray(data.orphanChannels) || !Array.isArray(data.roles)) return null;
    return data;
  } catch {
    return null;
  }
}
