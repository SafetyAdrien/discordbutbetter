import { useState } from 'react';
import { CheckCircle2, XCircle } from '@/components/icons/serverSettingsIcons';
import { Button } from '@/components/ui/button';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useServers } from '@/hooks/useServers';
import { copyToClipboard } from '@/lib/clipboard';
import { encodeServerTemplate } from '@/lib/serverTemplateCode';
import { SettingsPage } from './SettingsUI';
import { settingsInputCls, settingsLabelCls, settingsTextareaCls } from './settingsStyles';

/*
 * "Modele de serveur" (video de reference). Le modele est un code
 * autonome (voir serverTemplateCode) : categories, salons de tous types et
 * roles. On colle le code dans "Creer un serveur > Importer" pour recreer
 * la meme structure.
 */

const COPIED = ['Salons et sujets de salons', 'Rôles et couleurs', 'Tous les types de salons, y compris ceux de l\'app'];
const NOT_COPIED = ['Messages ou tout autre contenu', 'Membres ou bots', "L'icône de ton serveur, tes boosts et autres avantages"];

export function ServerTemplatePage({ serverId }: { serverId: string }) {
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const { data: channels } = useChannels(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const generate = () => {
    if (!channels || !title.trim()) return;
    const byPos = <T extends { position: number | null }>(a: T, b: T) => (a.position ?? 0) - (b.position ?? 0);
    setCode(
      encodeServerTemplate({
        name: title.trim(),
        description: description.trim() || null,
        serverName: server?.name ?? title.trim(),
        categories: [...channels.categories].sort(byPos).map((c) => ({
          name: c.name,
          channels: [...c.channels].sort(byPos).map((ch, i) => ({ name: ch.name, type: ch.type, position: i })),
        })),
        orphanChannels: [...channels.orphanChannels].sort(byPos).map((ch, i) => ({ name: ch.name, type: ch.type, position: i })),
        roles: roles
          .filter((r) => !r.is_default)
          .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
          .map((r) => ({ name: r.name, color: r.color, hoist: !!r.hoist })),
      }),
    );
  };


  return (
    <SettingsPage
      title="Modèle de serveur"
      description={
        <>
          <p>Un modèle de serveur te permet de partager ta configuration de serveur facilement, et d'aider quelqu'un d'autre à créer un serveur instantanément.</p>
          <p className="mt-3">Lorsqu'une personne utilise ton modèle, elle crée un nouveau serveur prérempli avec les mêmes salons et rôles que le tien.</p>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-[hsl(var(--card))]">
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Les modèles copieront :</p>
          <ul className="space-y-3">
            {COPIED.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[hsl(var(--online))]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Les modèles ne copieront pas :</p>
          <ul className="space-y-3">
            {NOT_COPIED.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                <XCircle className="w-5 h-5 shrink-0 text-destructive" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <label htmlFor="template-title" className={`${settingsLabelCls} mt-8`}>
        Titre du modèle <span className="text-destructive">*</span>
      </label>
      <input
        id="template-title"
        value={title}
        maxLength={100}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Pour qui est ce serveur ? Ex. : club scolaire, communauté d'artistes"
        className={settingsInputCls}
      />
      <label htmlFor="template-desc" className={`${settingsLabelCls} mt-5`}>Description du modèle</label>
      <textarea
        id="template-desc"
        value={description}
        maxLength={120}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Que font les membres dans ce serveur ?"
        className={settingsTextareaCls}
      />

      {code ? (
        <div className="mt-6">
          <p className={settingsLabelCls}>Code du modèle</p>
          <div className="flex items-center gap-2 p-1 pl-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06]">
            <input readOnly value={code} className="flex-1 min-w-0 bg-transparent font-mono text-sm text-foreground outline-none" />
            <Button size="sm" onClick={() => copyToClipboard(code, 'Code du modèle copié !')}>Copier</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Colle ce code dans « Créer un serveur › Importer » pour recréer cette structure. Régénère-le après avoir modifié tes salons ou tes rôles.
          </p>
          <Button variant="secondary" className="mt-4" onClick={generate}>Régénérer le modèle</Button>
        </div>
      ) : (
        <Button className="mt-6" onClick={generate} disabled={!title.trim() || !channels}>
          Générer un modèle
        </Button>
      )}
    </SettingsPage>
  );
}
