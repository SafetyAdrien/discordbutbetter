import type { ServerFolder } from '@/hooks/useServerFolders';
import type { Server } from '@/types/app';

/*
 * Logique pure du glisser-deposer du rail de serveurs : a partir de la liste d'entrees (serveurs
 * libres + dossiers), du serveur / dossier glisse et de la cible (avant / apres / dans), calcule
 * la nouvelle liste. Aucune ecriture ici : le composant applique le plan (base de donnees, ordre).
 */

export interface RailEntry {
  id: string;
  server?: Server;
  folder?: ServerFolder;
  servers?: Server[];
}

export type DropTarget = { type: 'before' | 'after' | 'into'; id: string };

export interface RailDropPlan {
  next: RailEntry[];
  /** Creation d'un dossier a la place de la cible (depot au centre d'un serveur libre). */
  createFolder?: { at: number; targetServer: Server; server: Server };
}

const folderTileId = (id: string) => `folder:${id}`;
const clone = (list: RailEntry[]): RailEntry[] => list.map((e) => (e.folder ? { ...e, servers: [...e.servers!] } : { ...e }));

export function planRailDrop(entries: RailEntry[], activeKey: string, target: DropTarget | null): RailDropPlan | null {
  if (!target || target.id === activeKey) return null;
  const after = target.type === 'after';
  const next = clone(entries);

  // Un dossier entier : seulement avant / apres une autre entree du rail.
  if (activeKey.startsWith('folder:')) {
    if (target.type === 'into') return null;
    const from = next.findIndex((e) => e.id === activeKey);
    if (from < 0) return null;
    const [moved] = next.splice(from, 1);
    const at = next.findIndex((e) => e.id === target.id);
    if (at < 0) return null;
    next.splice(at + (after ? 1 : 0), 0, moved);
    return { next };
  }

  const server = entries.flatMap((e) => (e.server ? [e.server] : e.servers ?? [])).find((x) => x.id === activeKey);
  if (!server) return null;
  const srcFolderEntry = entries.find((e) => e.folder && e.servers!.some((x) => x.id === activeKey));
  if (target.type === 'into' && srcFolderEntry && target.id === srcFolderEntry.id) return null; // deja dans ce dossier

  // Retire la source de sa place.
  const li = next.findIndex((e) => e.server?.id === activeKey);
  if (li >= 0) next.splice(li, 1);
  else {
    const fi = next.findIndex((e) => e.servers?.some((x) => x.id === activeKey));
    if (fi >= 0) next[fi].servers = next[fi].servers!.filter((x) => x.id !== activeKey);
  }

  if (target.type === 'into') {
    const at = next.findIndex((e) => e.id === target.id);
    if (at < 0) return null;
    const te = next[at];
    if (te.folder) {
      te.servers = [...te.servers!, server];
      return { next };
    }
    if (te.server) return { next, createFolder: { at, targetServer: te.server, server } };
    return null;
  }

  // Avant / apres : un serveur d'un dossier (on s'y insere) ou une entree du rail.
  const hostIdx = next.findIndex((e) => e.id !== target.id && e.servers?.some((x) => x.id === target.id));
  if (hostIdx >= 0) {
    const host = next[hostIdx];
    const j = host.servers!.findIndex((x) => x.id === target.id);
    host.servers!.splice(j + (after ? 1 : 0), 0, server);
  } else {
    const at = next.findIndex((e) => e.id === target.id);
    if (at < 0) return null;
    next.splice(at + (after ? 1 : 0), 0, { id: server.id, server });
  }
  return { next };
}

/** Retire les dossiers vides et liste les ecritures a faire (suppressions, nouveaux contenus). */
export function finalizeRail(list: RailEntry[]) {
  const deleted = list.filter((e) => e.folder && e.servers!.length === 0).map((e) => e.folder!.id);
  const next = list.filter((e) => !(e.folder && e.servers!.length === 0)).map((e) => ({ ...e }));
  const updates: { id: string; serverIds: string[] }[] = [];
  next.forEach((e) => {
    if (!e.folder) return;
    const ids = e.servers!.map((x) => x.id);
    if (ids.join() !== e.folder.serverIds.join()) updates.push({ id: e.folder.id, serverIds: ids });
    e.folder = { ...e.folder, serverIds: ids };
  });
  return { next, deleted, updates };
}
